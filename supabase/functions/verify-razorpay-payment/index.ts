import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to create HMAC SHA256 signature using Web Crypto API
async function generateHmac(message: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );
  
  // Convert ArrayBuffer to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET')

    if (!RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay keys not configured')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { 
      kind = 'booking',
      bookingRequestId, 
      registration_id,
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing required Razorpay parameters for payment verification')
    }

    // Verify HMAC SHA256 signature
    const generatedSignature = await generateHmac(`${razorpay_order_id}|${razorpay_payment_id}`, RAZORPAY_KEY_SECRET)

    if (generatedSignature !== razorpay_signature) {
      if (kind === 'workshop_session' && registration_id) {
        await supabaseAdmin
          .from('session_registrations')
          .update({ payment_status: 'failed' })
          .eq('id', registration_id)
      }
      throw new Error('Payment signature verification failed')
    }

    // =========================================================================
    // WORKSHOP SESSION PAYMENT VERIFICATION
    // =========================================================================
    if (kind === 'workshop_session') {
      if (!registration_id) {
        throw new Error('Missing registration_id for workshop session verification')
      }

      // Fetch registration with session to obtain verified price_amount
      const { data: reg, error: regError } = await supabaseAdmin
        .from('session_registrations')
        .select(`
          id,
          session_id,
          session:workshop_sessions(
            price_amount
          )
        `)
        .eq('id', registration_id)
        .single()

      if (regError || !reg) {
        throw new Error('Registration record not found')
      }

      const verifiedAmount = (reg.session as any)?.price_amount || 0

      // Update registration record to paid using service role key (bypasses RLS)
      const { error: updateError } = await supabaseAdmin
        .from('session_registrations')
        .update({
          payment_status: 'paid',
          razorpay_payment_id: razorpay_payment_id,
          amount_paid: verifiedAmount
        })
        .eq('id', registration_id)

      if (updateError) {
        console.error('Supabase Workshop Update Error:', updateError)
        throw new Error('Failed to update workshop registration status after payment')
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Workshop registration verified and marked as paid' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // =========================================================================
    // LEGACY 1-ON-1 BOOKING PAYMENT VERIFICATION
    // =========================================================================
    if (!bookingRequestId) {
      throw new Error('Missing bookingRequestId for payment verification')
    }

    const { error: updateError } = await supabaseAdmin
      .from('booking_requests')
      .update({ 
        payment_status: 'paid',
        razorpay_payment_id: razorpay_payment_id 
      })
      .eq('id', bookingRequestId)
      .eq('razorpay_order_id', razorpay_order_id);

    if (updateError) {
      console.error("Supabase Booking Update Error:", updateError);
      throw new Error('Failed to update booking status after payment');
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in verify-razorpay-payment function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
