import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? "";

    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not configured in Supabase secrets.");
    }

    const { data, college1, college2 } = await req.json()
    
    if (!data || !college1 || !college2) {
      return new Response(JSON.stringify({ error: "Missing required data" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const systemPrompt = `You are an AI Comparison Engine for a student mentorship platform called Connectors.
Your task is to analyze factual data about two colleges and write a 2-3 sentence comparison summary highlighting practical trade-offs for a student choosing between them.
Do not invent or hallucinate any statistics, rankings, packages, or fees not provided in the data.
Keep your response strictly grounded in the provided facts.
If one college has more available mentors, make sure to mention something like "You'll also find more mentors from [college] on Connectors to get first-hand guidance." at the end of the summary.`;

    const userPrompt = `Based only on the following real data about two colleges, write a 2-3 sentence comparison summary highlighting practical trade-offs for a student choosing between them. Do not invent any statistics not provided below.

Data:
${JSON.stringify(data, null, 2)}
`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: userPrompt }]
        }],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          maxOutputTokens: 500
        }
      })
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error("Gemini API Error:", errorText)
      throw new Error(`Gemini API returned status ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate summary at this time."

    return new Response(JSON.stringify({ summary: aiText }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error("Function Error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
