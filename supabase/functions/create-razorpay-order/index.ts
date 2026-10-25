import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const ALLOWED_ORIGINS = [
  "https://connectorsapp.info",
  "https://www.connectorsapp.info",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || ""
  const isAllowed = ALLOWED_ORIGINS.includes(origin)

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://connectorsapp.info",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error("Server config error: Missing Razorpay environment variables")
      return new Response(
        JSON.stringify({ error: "Payment service is currently unavailable. Please contact support." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    // Authenticate caller (required for both workshop and legacy flows)
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    const token = authHeader.replace(/^Bearer\s+/i, "")
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { kind = "booking", bookingRequestId, session_id, registration_id } = body

    // =========================================================================
    // WORKSHOP SESSION PAYMENT FLOW
    // =========================================================================
    if (kind === "workshop_session") {
      if (!session_id || !registration_id) {
        return new Response(
          JSON.stringify({ error: "Missing session_id or registration_id" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        )
      }

      // 1. Load workshop session
      const { data: session, error: sessionError } = await supabaseAdmin
        .from("workshop_sessions")
        .select("id, access_type, price_amount")
        .eq("id", session_id)
        .single()

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: "Session not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        )
      }

      // 2. Validate access type
      if (session.access_type === "free_for_all") {
        return new Response(
          JSON.stringify({ error: "This session is free — no payment required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        )
      }

      // 3. Recompute NIT status server-side from real auth email
      if (session.access_type === "nit_free_others_paid") {
        const email = user.email?.toLowerCase().trim() || ""
        const parts = email.split("@")
        const domain = parts.length === 2 ? parts[1].trim() : ""
        const isNit = domain === "nitrr.ac.in" || domain.endsWith(".nitrr.ac.in")

        if (isNit) {
          return new Response(
            JSON.stringify({ error: "This session is free for NIT Raipur students" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          )
        }
      }

      // 4. Load registration row and assert ownership
      const { data: reg, error: regError } = await supabaseAdmin
        .from("session_registrations")
        .select("id, payment_status, user_id")
        .eq("id", registration_id)
        .eq("session_id", session_id)
        .single()

      if (regError || !reg) {
        return new Response(
          JSON.stringify({ error: "Registration record not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        )
      }

      if (reg.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Forbidden: You do not own this registration" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        )
      }

      if (reg.payment_status === "paid") {
        return new Response(
          JSON.stringify({ error: "Registration is already paid" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        )
      }

      // 5. Read price_amount from session
      const priceInPaise = session.price_amount
      if (!priceInPaise || priceInPaise <= 0) {
        console.error("Session price_amount invalid for session:", session_id)
        return new Response(
          JSON.stringify({ error: "Session price is not configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        )
      }

      // 6. Create Razorpay order
      const orderPayload = {
        amount: priceInPaise,
        currency: "INR",
        receipt: registration_id.substring(0, 40),
      }

      const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
        },
        body: JSON.stringify(orderPayload),
      })

      const orderData = await rzpResponse.json()

      if (!rzpResponse.ok || !orderData.id) {
        console.error("Razorpay Error:", orderData)
        return new Response(
          JSON.stringify({ error: "Failed to create payment order" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        )
      }

      // 7. Store Razorpay order ID on session_registrations record
      const { error: updateRegError } = await supabaseAdmin
        .from("session_registrations")
        .update({ razorpay_order_id: orderData.id })
        .eq("id", registration_id)

      if (updateRegError) {
        console.error("Failed to store razorpay_order_id on registration:", updateRegError)
        return new Response(
          JSON.stringify({ error: "Failed to link order with registration" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        )
      }

      return new Response(
        JSON.stringify({
          order_id: orderData.id,
          amount: priceInPaise,
          currency: "INR",
          key_id: RAZORPAY_KEY_ID,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      )
    }

    // =========================================================================
    // LEGACY 1-ON-1 BOOKING PAYMENT FLOW
    // =========================================================================
    if (!bookingRequestId) {
      return new Response(
        JSON.stringify({ error: "Missing bookingRequestId" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // 1. Fetch booking from DB
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("booking_requests")
      .select("id, student_id, amount_due, status, payment_status")
      .eq("id", bookingRequestId)
      .single()

    if (fetchError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking request not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      )
    }

    // 2. Assert caller is the student who owns this booking
    if (booking.student_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You do not own this booking" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      )
    }

    // 3. Verify status and payment state
    if (booking.payment_status === "paid") {
      return new Response(
        JSON.stringify({ error: "Booking is already paid" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    if (booking.status !== "time_confirmed") {
      return new Response(
        JSON.stringify({ error: "Booking time has not been confirmed yet" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // 4. Use ONLY server-verified amount_due (never trust client fallback)
    const finalAmount = Number(booking.amount_due)
    if (!finalAmount || finalAmount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid session amount due" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    const amountInPaise = Math.round(finalAmount * 100)

    const orderPayload = {
      amount: amountInPaise,
      currency: "INR",
      receipt: bookingRequestId.substring(0, 40),
    }

    // 5. Call Razorpay API
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify(orderPayload),
    })

    const orderData = await response.json()

    if (!response.ok || !orderData.id) {
      console.error("Razorpay Error:", orderData)
      return new Response(
        JSON.stringify({ error: "Failed to create payment order" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // 6. Store Razorpay order ID on booking_requests
    const { error: updateError } = await supabaseAdmin
      .from("booking_requests")
      .update({ razorpay_order_id: orderData.id })
      .eq("id", bookingRequestId)

    if (updateError) {
      console.error("Supabase Booking Update Error:", updateError)
      return new Response(
        JSON.stringify({ error: "Failed to update booking with order ID" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({
        order_id: orderData.id,
        amount: amountInPaise,
        currency: "INR",
        key_id: RAZORPAY_KEY_ID,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error: any) {
    console.error("Error in create-razorpay-order function:", error)
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred while processing order" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
