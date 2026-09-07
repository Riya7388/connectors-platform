import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import { Client as PGClient } from "https://deno.land/x/postgres@v0.17.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ---------------------------------------------------------------------------
// Helper: extract the minimum price from a pricing JSONB object.
// pricing is stored as { "30": "500", "60": "800" } (duration → price strings).
// Returns the lowest numeric price found, or null if pricing is absent/empty.
// ---------------------------------------------------------------------------
function extractMinPrice(pricing: Record<string, string> | null | undefined): number | null {
  if (!pricing || typeof pricing !== 'object') return null
  const prices = Object.values(pricing)
    .map((v) => Number(v))
    .filter((n) => !isNaN(n) && n > 0)
  if (prices.length === 0) return null
  return Math.min(...prices)
}

// ---------------------------------------------------------------------------
// Gemini tool declaration for search_mentors (functionDeclarations format)
// ---------------------------------------------------------------------------
const searchMentorsTool = {
  functionDeclarations: [
    {
      name: "search_mentors",
      description:
        "Search the Connectors platform database for approved, verified mentors who can help with a given topic, subject, exam, or career area. Call this whenever a user describes a specific problem or goal they need help with, asks to be connected with a mentor, or asks about mentor names, pricing, or availability for any topic.",
      parameters: {
        type: "OBJECT",
        properties: {
          topic: {
            type: "STRING",
            description:
              "A keyword or short phrase describing the area the user needs help with, e.g. 'entrepreneurship', 'UPSC preparation', 'resume review', 'freelancing', 'JEE', 'CA articleship', 'product management'.",
          },
        },
        required: ["topic"],
      },
    },
  ],
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

    // 4. Build system prompt (original multi-exam guidance + new mentor-search
    //    and formatting instructions appended at the end)
    const systemPrompt = `You are Mentor Genie, a friendly and knowledgeable AI assistant on Connectors — a student mentorship platform that supports aspirants across a wide range of competitive exams and career paths.

## Exam Categories You Cover
You are equally fluent in guiding students across ALL of the following:
- **JEE** (JEE Main / Advanced, engineering college admissions): JoSAA/CSAB counselling, rank vs college predictions, branch selection, college fees, coding culture, DSA and placement preparation.
- **NEET** (medical entrance): NEET-UG/PG strategy, MCC/state counselling, MBBS vs BDS vs AYUSH choices, college selection, internship and PG prep.
- **CA** (Chartered Accountancy — ICAI): Foundation, Intermediate, Final exam strategy, articleship guidance, self-study vs coaching, career paths in audit/finance/taxation.
- **CAT** (MBA entrance): Quant/VARC/DILR preparation, IIM and non-IIM B-school selection, CAT score vs college, WAT-PI prep, MBA career paths.
- **UPSC** (Civil Services Exam): Prelims/Mains/Interview strategy, optional subject selection, answer writing, current affairs approach, LBSNAA and post-selection life.
- **CLAT** (law entrance): Legal reasoning and GK preparation, NLU selection by rank, BA LLB vs LLB, law career paths.
- **Banking exams** (SBI PO/Clerk, IBPS PO/Clerk/SO, RBI Grade B/Assistant): Reasoning, Quant, English, GA preparation strategies, interview tips, bank career progression.
- **Defense exams** (NDA, CDS, AFCAT, Agniveer): Written exam strategy, SSB interview preparation, physical fitness, service branch choices, officer career paths.
- **CUET** (undergraduate entrance): Domain subject preparation, general test strategy, university and course selection by CUET score.

## How to Infer Exam Context
Infer which exam the student is asking about directly from the content of their message — do NOT start by asking "which exam are you preparing for?" unless the message is genuinely too ambiguous to respond to helpfully.
- Keywords like "articleship", "CA Foundation", "ICAI", "Intermediate exam" → respond in the CA context.
- Keywords like "UPSC prelims", "optional subject", "Mains answer writing", "IAS/IPS/IFS" → respond in the UPSC context.
- Keywords like "JoSAA", "JEE rank", "branch selection", "NIT/IIT/IIIT" → respond in the JEE context.
- Keywords like "MCC counselling", "NEET score", "MBBS seats", "state quota" → respond in the NEET context.
- Keywords like "CAT percentile", "IIM call", "WAT-PI", "B-school" → respond in the CAT context.
- Keywords like "NLU", "CLAT rank", "legal reasoning" → respond in the CLAT context.
- Keywords like "IBPS", "SBI PO", "RBI Grade B", "banking exam" → respond in the Banking context.
- Keywords like "NDA", "SSB", "CDS", "AFCAT", "Agniveer" → respond in the Defense context.
- Keywords like "CUET score", "DU admission", "central university" → respond in the CUET context.
- If the message is generic (e.g. "how do I study better?", "I'm feeling burnt out", "how does this platform work?"), give general, broadly-applicable advice — do NOT default to JEE-specific advice.

## General Behavior
Keep your answers complete but efficient — prioritize the most useful information first, and avoid unnecessary repetition or filler text.

If a student asks something completely unrelated to exam preparation, college admissions, career guidance, or academic/professional growth (e.g. personal life advice unrelated to academics, general trivia, or topics with no connection to a student's journey), politely redirect them back to how you can help with their exam or career journey.

If a question requires personalized human mentorship (like reviewing a resume in depth, one-on-one strategy sessions, or mock interviews), suggest the student book a session with a real mentor on the Connectors platform. Do not make up specific cutoff numbers, ranks, or statistics you're not confident about — give general guidance and suggest the student verify exact figures on official sources (JoSAA portal, MCC, ICAI website, UPSC.gov.in, etc.).

## Connecting Students with Real Mentors
When a user:
- Describes a specific problem, goal, or field they need help with (e.g. "I'm facing a problem in entrepreneurship", "I need help with UPSC prelims", "I want to switch careers to product management"), OR
- Directly asks to be connected with a mentor, OR
- Asks about mentor names, pricing, or availability for any topic —

Call the **search_mentors** function with the most relevant topic keyword extracted from their message. Do NOT give only generic advice in these cases — search first, then personalise your response based on the real results returned.

After receiving search results, present the mentors naturally and clearly. Use this format:

Here are a few mentors on Connectors who can help with [topic]:

1. **[Name]** — ⭐ [rating]/5 — starting at ₹[price]
2. **[Name]** — ⭐ [rating]/5 — starting at ₹[price]

You can search for them by name on the **Find a Mentor** page to view their full profiles and book a session!

Keep mentor listings concise — do not pad with lengthy commentary per mentor. If no rating is available for a mentor, omit the rating rather than showing a placeholder. If no price is available, omit the price. Never invent or guess any mentor details not present in the search results.

If the search returns no mentors, respond honestly: acknowledge you couldn't find a specific mentor for that area right now, and offer helpful general guidance instead. Never fabricate a mentor name or detail.`

    // 5. Format conversation history for Gemini
    // Gemini expects contents as list of {role: "user" | "model", parts: [{text: string}]}
    const contents: any[] = []
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

    const geminiModel = 'gemini-3.5-flash'
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`

    // -----------------------------------------------------------------------
    // 6. Turn 1 — Initial Gemini call with tools declared
    // -----------------------------------------------------------------------
    const turn1Response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        tools: [searchMentorsTool],
        generationConfig: {
          maxOutputTokens: 1000
        }
      })
    })

    if (!turn1Response.ok) {
      const errorText = await turn1Response.text()
      console.error("Gemini Turn 1 Error:", errorText)
      throw new Error(`Gemini API returned status ${turn1Response.status}`)
    }

    const turn1Data = await turn1Response.json()
    const turn1Candidate = turn1Data.candidates?.[0]
    const turn1Parts: any[] = turn1Candidate?.content?.parts ?? []

    // -----------------------------------------------------------------------
    // 7. Check if Gemini requested a function call
    // -----------------------------------------------------------------------
    const functionCallPart = turn1Parts.find((p: any) => p.functionCall)

    if (functionCallPart) {
      // -----------------------------------------------------------------------
      // 7a. Execute the search_mentors DB query
      // -----------------------------------------------------------------------
      const fnName: string = functionCallPart.functionCall.name
      const fnArgs: { topic?: string } = functionCallPart.functionCall.args ?? {}
      const topic: string = (fnArgs.topic ?? "").trim()

      let functionResponseContent: any

      if (fnName === "search_mentors" && topic) {
        // Clean common query noise words so 'CAT exam' -> 'CAT', 'JEE prep' -> 'JEE'
        const cleanedTopic = topic.replace(/\b(exam|preparation|prep|guidance|mentorship|mentor|mentors|test|session)\b/gi, '').trim() || topic
        const pattern = `%${cleanedTopic}%`

        // Query approved + verified mentors matching topic against valid columns
        const { data: mentors, error: dbError } = await supabase
          .from('mentors')
          .select('id, full_name, rating, pricing, exam_category, expertise_other, bio, branch, ca_stage')
          .eq('application_status', 'approved')
          .eq('verified', true)
          .or(`exam_category.ilike.${pattern},expertise_other.ilike.${pattern},branch.ilike.${pattern},bio.ilike.${pattern},ca_stage.ilike.${pattern}`)
          .order('rating', { ascending: false, nullsFirst: false })
          .limit(4)

        if (dbError) {
          console.warn("Mentor search query failed:", dbError.message)
          functionResponseContent = {
            mentors: [],
            count: 0,
            message: `No approved mentors found for topic "${topic}" on Connectors right now. Provide helpful general advice and suggest the user browse the Find a Mentor page.`
          }
        } else {
          const results = (mentors ?? []).map((m: any) => ({
            id: m.id,
            full_name: m.full_name,
            rating: m.rating ?? null,
            starting_price_inr: extractMinPrice(m.pricing),
            exam_category: m.exam_category ?? null,
          }))

          functionResponseContent = results.length > 0
            ? { mentors: results, count: results.length }
            : {
                mentors: [],
                count: 0,
                message: `No approved mentors found specifically for "${topic}" on Connectors right now. Respond honestly, offer helpful general advice, and suggest the user check back later or browse Find a Mentor for related experts. Do not fabricate any mentor name or detail.`
              }
        }
      } else {
        functionResponseContent = { error: `Unknown function: ${fnName}` }
      }

      // -----------------------------------------------------------------------
      // 7b. Turn 2 — Feed function result back to Gemini for final reply
      // -----------------------------------------------------------------------
      const fnResponseObj: any = {
        name: fnName,
        response: functionResponseContent
      }
      if (functionCallPart.functionCall.id) {
        fnResponseObj.id = functionCallPart.functionCall.id
      }

      const contentsWithFunctionResult: any[] = [
        ...contents,
        // Gemini's Turn 1 assistant response (contains the functionCall part)
        { role: 'model', parts: turn1Parts },
        // Our function result
        {
          role: 'user',
          parts: [
            {
              functionResponse: fnResponseObj
            }
          ]
        }
      ]

      const turn2Response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: contentsWithFunctionResult,
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          tools: [searchMentorsTool],
          generationConfig: {
            maxOutputTokens: 1000
          }
        })
      })

      if (!turn2Response.ok) {
        const errorText = await turn2Response.text()
        console.error("Gemini Turn 2 Error:", errorText)
        throw new Error(`Gemini API (Turn 2) returned status ${turn2Response.status}`)
      }

      const turn2Data = await turn2Response.json()
      const turn2Parts = turn2Data.candidates?.[0]?.content?.parts || []
      let aiText = turn2Parts.map((p: any) => p.text || '').join('').trim() || "I'm sorry, I couldn't process your request."

      const finishReason2 = turn2Data.candidates?.[0]?.finishReason
      if (finishReason2 === 'MAX_TOKENS') {
        aiText += "\n\n...(ask me to continue if you'd like more detail)"
      }

      return new Response(JSON.stringify({ text: aiText }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } else {
      // -----------------------------------------------------------------------
      // 8. No function call — return Gemini's direct text response (Turn 1)
      // -----------------------------------------------------------------------
      let aiText = turn1Parts.find((p: any) => p.text)?.text || "I'm sorry, I couldn't process your request."

      const finishReason1 = turn1Candidate?.finishReason
      if (finishReason1 === 'MAX_TOKENS') {
        aiText += "\n\n...(ask me to continue if you'd like more detail)"
      }

      return new Response(JSON.stringify({ text: aiText }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (err: any) {
    console.error("Function Error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
