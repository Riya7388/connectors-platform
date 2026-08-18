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

    const { 
      bookingRequestId, 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = await req.json()

    if (!bookingRequestId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing required fields for payment verification')
    }

    // Verify signature
    const generatedSignature = await generateHmac(`${razorpay_order_id}|${razorpay_payment_id}`, RAZORPAY_KEY_SECRET)

    if (generatedSignature !== razorpay_signature) {
      throw new Error('Payment signature verification failed')
    }

    // Verification successful, update booking status
    const { error: updateError } = await supabaseAdmin
      .from('booking_requests')
      .update({ 
        payment_status: 'paid',
        razorpay_payment_id: razorpay_payment_id 
      })
      .eq('id', bookingRequestId)
      // Extra safety check: ensure we're updating the matching order
      .eq('razorpay_order_id', razorpay_order_id);

    if (updateError) {
      console.error("Supabase Update Error:", updateError);
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
