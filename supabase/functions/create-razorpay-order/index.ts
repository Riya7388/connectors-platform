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

    console.log("DEBUG: RAZORPAY_KEY_ID prefix:", RAZORPAY_KEY_ID?.substring(0, 6));

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { bookingRequestId, amountDue } = await req.json()

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
    
    // We can fallback to passed amountDue if DB is somehow null, but it shouldn't be.
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
