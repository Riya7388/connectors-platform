import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID')
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys not configured')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { kind = 'booking', bookingRequestId, amountDue, session_id, registration_id } = body

    // =========================================================================
    // WORKSHOP SESSION PAYMENT FLOW
    // =========================================================================
    if (kind === 'workshop_session') {
      if (!session_id || !registration_id) {
        throw new Error('Missing session_id or registration_id')
      }

      // 1. Resolve user from Authorization header
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      const token = authHeader.replace(/^Bearer\s+/i, '')
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized user' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      // 2. Load workshop session
      const { data: session, error: sessionError } = await supabaseAdmin
        .from('workshop_sessions')
        .select('*')
        .eq('id', session_id)
        .single()

      if (sessionError || !session) {
        return new Response(
          JSON.stringify({ error: 'Session not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      // 3. Validate access type
      if (session.access_type !== 'nit_free_others_paid') {
        return new Response(
          JSON.stringify({ error: 'This session is free — no payment required' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // 4. Recompute NIT status server-side from real auth email
      const email = user.email?.toLowerCase().trim() || ''
      const parts = email.split('@')
      const domain = parts.length === 2 ? parts[1].trim() : ''
      const isNit = domain === 'nitrr.ac.in' || domain.endsWith('.nitrr.ac.in')

      if (isNit) {
        return new Response(
          JSON.stringify({ error: 'This session is free for NIT Raipur students' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // 5. Load registration row and assert ownership and pending status
      const { data: reg, error: regError } = await supabaseAdmin
        .from('session_registrations')
        .select('*')
        .eq('id', registration_id)
        .eq('session_id', session_id)
        .eq('user_id', user.id)
        .single()

      if (regError || !reg) {
        return new Response(
          JSON.stringify({ error: 'Registration record not found or does not belong to user' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      if (reg.payment_status === 'paid') {
        return new Response(
          JSON.stringify({ error: 'Registration is already paid' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // 6. Read price_amount from session
      const priceInPaise = session.price_amount
      if (!priceInPaise || priceInPaise <= 0) {
        return new Response(
          JSON.stringify({ error: 'Session price is not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      // 7. Create Razorpay order
      const orderPayload = {
        amount: priceInPaise,
        currency: 'INR',
        receipt: registration_id.substring(0, 40),
      }

      const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
        },
        body: JSON.stringify(orderPayload)
      })

      const orderData = await rzpResponse.json()

      if (!rzpResponse.ok) {
        console.error('Razorpay Error:', orderData)
        throw new Error(orderData.error?.description || 'Failed to create Razorpay order')
      }

      // 8. Return order details
      return new Response(
        JSON.stringify({
          order_id: orderData.id,
          amount: priceInPaise,
          currency: 'INR',
          key_id: RAZORPAY_KEY_ID
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // =========================================================================
    // LEGACY 1-ON-1 BOOKING PAYMENT FLOW
    // =========================================================================
    if (!bookingRequestId) {
      throw new Error('Missing bookingRequestId')
    }

    // Convert amount to paise (multiply by 100)
    // Fetch it from DB to be safe
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('booking_requests')
      .select('amount_due, status')
      .eq('id', bookingRequestId)
      .single()

    if (fetchError || !booking) {
      throw new Error('Booking not found')
    }
    
    const finalAmount = booking.amount_due || amountDue;
    if (!finalAmount || finalAmount <= 0) {
      throw new Error('Invalid amount: Amount must be greater than zero');
    }
    const amountInPaise = Math.round(finalAmount * 100);

    const orderPayload = {
      amount: amountInPaise,
      currency: "INR",
      receipt: bookingRequestId.substring(0, 40), // max 40 chars
    };

    // Call Razorpay API
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
      },
      body: JSON.stringify(orderPayload)
    });

    const orderData = await response.json();

    if (!response.ok) {
      console.error("Razorpay Error:", orderData);
      throw new Error(orderData.error?.description || 'Failed to create order');
    }

    // Store the order ID in the database
    const { error: updateError } = await supabaseAdmin
      .from('booking_requests')
      .update({ razorpay_order_id: orderData.id })
      .eq('id', bookingRequestId);

    if (updateError) {
      console.error("Supabase Update Error:", updateError);
      throw new Error('Failed to update booking with order ID');
    }

    return new Response(
      JSON.stringify({ 
        order_id: orderData.id,
        key_id: RAZORPAY_KEY_ID
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in create-razorpay-order function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
