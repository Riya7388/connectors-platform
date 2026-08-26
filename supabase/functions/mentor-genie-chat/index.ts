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

If a question requires personalized human mentorship (like reviewing a resume in depth, one-on-one strategy sessions, or mock interviews), suggest the student book a session with a real mentor on the Connectors platform. Do not make up specific cutoff numbers, ranks, or statistics you're not confident about — give general guidance and suggest the student verify exact figures on official sources (JoSAA portal, MCC, ICAI website, UPSC.gov.in, etc.).`

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
