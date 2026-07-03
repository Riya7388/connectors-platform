import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import { Client as PGClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? "";
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? "";
    const dbUrl = Deno.env.get('SUPABASE_DB_URL') ?? "";
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? "";

    if (!dbUrl) {
      throw new Error("SUPABASE_DB_URL is not configured.");
    }
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not configured in Supabase secrets.");
    }

    // Initialize Supabase Client
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // 1. Get User Authenticated Context if present
    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      if (!authError && user) {
        userId = user.id
      }
    }

    // 2. Parse request body
    const { message, history, sessionId } = await req.json()
    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Ensure session ID or user ID is present for rate limiting
    const rateLimitKey = userId ? { type: 'user', value: userId } : { type: 'session', value: sessionId || 'anonymous_session' };

    // 3. Connect to Database using direct PG Client to check and increment rate limit
    const pgClient = new PGClient(dbUrl)
    await pgClient.connect()

    try {
      // Create chat_usage table if it does not exist (Self-healing migration)
      await pgClient.queryArray(`
        CREATE TABLE IF NOT EXISTS public.chat_usage (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at timestamptz DEFAULT now(),
          user_id uuid,
          session_id text,
          message_date date DEFAULT current_date NOT NULL,
          message_count int DEFAULT 1 NOT NULL,
          CONSTRAINT unique_user_date UNIQUE (user_id, message_date),
          CONSTRAINT unique_session_date UNIQUE (session_id, message_date)
        );
      `)

      // Check current message count for today
      let query = ""
      let queryArgs: string[] = []

      if (rateLimitKey.type === 'user') {
        query = "SELECT message_count FROM public.chat_usage WHERE user_id = $1 AND message_date = CURRENT_DATE"
        queryArgs = [rateLimitKey.value]
      } else {
        query = "SELECT message_count FROM public.chat_usage WHERE session_id = $1 AND message_date = CURRENT_DATE"
        queryArgs = [rateLimitKey.value]
      }

      const res = await pgClient.queryObject<{ message_count: number }>(query, queryArgs)
      const currentCount = res.rows[0]?.message_count || 0

      // Rate limit is 50 messages per day
      if (currentCount >= 50) {
        await pgClient.end()
        return new Response(JSON.stringify({
          error: "rate_limited",
          message: "You've reached today's chat limit. Please try again tomorrow, or book a session with a mentor for detailed help!"
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Increment or Insert count
      if (currentCount > 0) {
        if (rateLimitKey.type === 'user') {
          await pgClient.queryArray("UPDATE public.chat_usage SET message_count = message_count + 1 WHERE user_id = $1 AND message_date = CURRENT_DATE", [rateLimitKey.value])
        } else {
          await pgClient.queryArray("UPDATE public.chat_usage SET message_count = message_count + 1 WHERE session_id = $1 AND message_date = CURRENT_DATE", [rateLimitKey.value])
        }
      } else {
        if (rateLimitKey.type === 'user') {
          await pgClient.queryArray("INSERT INTO public.chat_usage (user_id, message_count) VALUES ($1, 1)", [rateLimitKey.value])
        } else {
          await pgClient.queryArray("INSERT INTO public.chat_usage (session_id, message_count) VALUES ($1, 1)", [rateLimitKey.value])
        }
      }
    } finally {
      await pgClient.end()
    }

    // 4. Call Gemini API securely
    const systemPrompt = `You are Mentor Genie, a friendly AI assistant on a student mentorship platform called Connectors.
Your core areas of expertise are: (1) Rank vs College predictions, (2) College fees guidance, (3) Placements and career preparation, (4) DSA (Data Structures & Algorithms) learning roadmaps and interview prep, (5) JoSAA/CSAB counselling process and choice-filling strategy, (6) Coding culture at various colleges (competitive programming, hackathons, tech clubs), and (7) Branch selection guidance — helping students understand core vs non-core branches, typical career paths, and trade-offs. Stay actively focused on these topics and closely related career/academic guidance questions.

Keep your answer complete but efficient — prioritize the most useful information first, and avoid unnecessary repetition or filler text.

If a student asks something completely unrelated to college admissions, career guidance, placements, or technical learning (e.g. personal life advice unrelated to academics, general trivia, or topics with no connection to a student's academic/career journey), politely redirect them back to how you can help with their college/career journey, rather than answering the unrelated question in detail.

If a question requires personalized human mentorship (like reviewing a resume in depth or one-on-one career coaching), suggest the student book a session with a real mentor on the Connectors platform. Do not make up specific college cutoff numbers or rankings you're not confident about — give general guidance and suggest the student verify exact cutoffs on official sources.`

    // Format history for Gemini API
    // Gemini expects contents as list of {role: "user" | "model", parts: [{text: string}]}
    const contents = []
    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content || msg.text }]
        })
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    })

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          maxOutputTokens: 1000
        }
      })
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error("Gemini API Error:", errorText)
      throw new Error(`Gemini API returned status ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    let aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process your request."
    
    const finishReason = geminiData.candidates?.[0]?.finishReason
    if (finishReason === 'MAX_TOKENS') {
      aiText += "\n\n...(ask me to continue if you'd like more detail)"
    }

    return new Response(JSON.stringify({ text: aiText }), {
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
