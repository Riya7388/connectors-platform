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

// Helper function to create HMAC SHA256 signature using Web Crypto API
async function generateHmac(message: string, secret: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  )

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
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
        JSON.stringify({ error: "Payment verification service is currently unavailable. Please contact support." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    // Authenticate caller
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
    const {
      kind = "booking",
      bookingRequestId,
      registration_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ error: "Missing required Razorpay parameters for payment verification" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // 1. Verify HMAC SHA256 signature
    const generatedSignature = await generateHmac(
      `${razorpay_order_id}|${razorpay_payment_id}`,
      RAZORPAY_KEY_SECRET
    )

    if (generatedSignature !== razorpay_signature) {
      console.error("Payment signature mismatch for order:", razorpay_order_id)
      return new Response(
        JSON.stringify({ error: "Payment signature verification failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // 2. Fetch payment details from Razorpay API (with retry if status is 'authorized')
    let paymentData: any = null
    const MAX_RETRIES = 3

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const rzpResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
        method: "GET",
        headers: {
          "Authorization": "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
        },
      })

      paymentData = await rzpResponse.json()

      if (!rzpResponse.ok || !paymentData.id) {
        console.error("Failed to fetch payment details from Razorpay:", paymentData)
        return new Response(
          JSON.stringify({ error: "Failed to verify payment status with gateway" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        )
      }

      if (paymentData.status === "captured") {
        break
      }

      // If authorized, wait 1s and re-fetch up to MAX_RETRIES times
      if (paymentData.status === "authorized" && attempt < MAX_RETRIES) {
        console.warn(`Payment ${razorpay_payment_id} is authorized, waiting 1s for capture (attempt ${attempt + 1}/${MAX_RETRIES})...`)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        continue
      }

      break
    }

    // Enforce payment status: accept ONLY 'captured'
    if (paymentData.status !== "captured") {
      console.error("Payment is not captured. Current status:", paymentData.status)
      return new Response(
        JSON.stringify({
          error: `Payment is not in captured status (status: ${paymentData.status}). If money was deducted, please contact support and share your payment id.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // Enforce currency: must be INR
    if (paymentData.currency !== "INR") {
      console.error("Payment currency mismatch. Expected INR, got:", paymentData.currency)
      return new Response(
        JSON.stringify({ error: "Payment currency is not INR. If money was deducted, please contact support and share your payment id." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // Enforce order match on payment gateway record
    if (paymentData.order_id !== razorpay_order_id) {
      console.error("Payment order_id mismatch. Gateway:", paymentData.order_id, "Expected:", razorpay_order_id)
      return new Response(
        JSON.stringify({ error: "Payment does not match the expected order" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // =========================================================================
    // WORKSHOP SESSION PAYMENT VERIFICATION
    // =========================================================================
    if (kind === "workshop_session") {
      if (!registration_id) {
        return new Response(
          JSON.stringify({ error: "Missing registration_id for workshop session verification" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        )
      }

      // Fetch registration with session to verify ownership, order_id, and price_amount
      const { data: reg, error: regError } = await supabaseAdmin
        .from("session_registrations")
        .select(`
          id,
          session_id,
          user_id,
          payment_status,
          razorpay_order_id,
          session:workshop_sessions(
            price_amount
          )
        `)
        .eq("id", registration_id)
        .single()

      if (regError || !reg) {
        return new Response(
          JSON.stringify({ error: "Registration record not found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
        )
      }

      // Assert ownership
      if (reg.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Forbidden: You do not own this registration" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        )
      }

      // Assert order belongs to this registration
      if (!reg.razorpay_order_id || reg.razorpay_order_id !== razorpay_order_id) {
        console.error("Order ID mismatch on registration. Expected:", reg.razorpay_order_id, "Got:", razorpay_order_id)
        return new Response(
          JSON.stringify({ error: "Order does not match registration record" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        )
      }

      const verifiedAmount = (reg.session as any)?.price_amount || 0

      // Assert payment amount matches session price
      if (paymentData.amount !== verifiedAmount) {
        console.error("Amount mismatch for workshop session. Paid:", paymentData.amount, "Expected:", verifiedAmount)
        return new Response(
          JSON.stringify({ error: "Payment amount does not match session price" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        )
      }

      // Update registration record to paid using service role key (bypasses RLS)
      const { data: updatedReg, error: updateError } = await supabaseAdmin
        .from("session_registrations")
        .update({
          payment_status: "paid",
          razorpay_payment_id: razorpay_payment_id,
          amount_paid: verifiedAmount,
        })
        .eq("id", registration_id)
        .eq("razorpay_order_id", razorpay_order_id)
        .select("id")
        .maybeSingle()

      if (updateError || !updatedReg) {
        console.error("Supabase Workshop Update Error:", updateError)
        return new Response(
          JSON.stringify({ error: "Failed to update workshop registration status after payment" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: "Workshop registration verified and marked as paid" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      )
    }

    // =========================================================================
    // LEGACY 1-ON-1 BOOKING PAYMENT VERIFICATION
    // =========================================================================
    if (!bookingRequestId) {
      return new Response(
        JSON.stringify({ error: "Missing bookingRequestId for payment verification" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // 1. Fetch booking to verify ownership, order_id, amount_due, and mentor details
    const { data: booking, error: fetchBookingError } = await supabaseAdmin
      .from("booking_requests")
      .select("id, student_id, amount_due, mentor_id, razorpay_order_id, payment_status, mentors:mentor_id(id, is_paid)")
      .eq("id", bookingRequestId)
      .single()

    if (fetchBookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking request not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      )
    }

    // 2. Assert ownership
    if (booking.student_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: You do not own this booking" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      )
    }

    // 3. Assert order belongs to this booking
    if (!booking.razorpay_order_id || booking.razorpay_order_id !== razorpay_order_id) {
      console.error("Order ID mismatch on booking. Expected:", booking.razorpay_order_id, "Got:", razorpay_order_id)
      return new Response(
        JSON.stringify({ error: "Order does not match booking record" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    const mentor = booking.mentors as any
    const amountDue = Number(booking.amount_due) || 0
    const expectedAmountPaise = Math.round(amountDue * 100)

    // 4. Assert payment amount matches booking amount_due
    if (paymentData.amount !== expectedAmountPaise) {
      console.error("Amount mismatch for booking. Paid:", paymentData.amount, "Expected:", expectedAmountPaise)
      return new Response(
        JSON.stringify({ error: "Payment amount does not match session amount due" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    let platformFee: number | null = null
    let mentorPayout: number | null = null
    let payoutStatus: "pending" | "not_applicable" = "not_applicable"

    // 5. Phase 13 logic: If mentor is paid, read commission_percent from mentor_payout_settings
    if (mentor?.is_paid && amountDue > 0) {
      const { data: payoutSettings } = await supabaseAdmin
        .from("mentor_payout_settings")
        .select("commission_percent")
        .eq("mentor_id", booking.mentor_id)
        .maybeSingle()

      const commissionPercent = payoutSettings?.commission_percent != null
        ? Number(payoutSettings.commission_percent)
        : null

      if (commissionPercent != null && commissionPercent >= 0) {
        platformFee = Math.round((amountDue * (commissionPercent / 100)) * 100) / 100
        mentorPayout = Math.round((amountDue - platformFee) * 100) / 100
        payoutStatus = "pending"
      }
    }

    // 6. Mark booking paid and save fee/payout calculations (bypasses RLS via service role)
    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from("booking_requests")
      .update({
        payment_status: "paid",
        razorpay_payment_id: razorpay_payment_id,
        platform_fee: platformFee,
        mentor_payout: mentorPayout,
        payout_status: payoutStatus,
      })
      .eq("id", bookingRequestId)
      .eq("razorpay_order_id", razorpay_order_id)
      .select("id")
      .maybeSingle()

    if (updateError || !updatedBooking) {
      console.error("Supabase Booking Update Error:", updateError)
      return new Response(
        JSON.stringify({ error: "Failed to update booking status after payment" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error: any) {
    console.error("Error in verify-razorpay-payment function:", error)
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred while verifying payment" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
