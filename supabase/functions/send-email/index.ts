import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      console.log('RESEND_API_KEY not set. Skipping email send (mock mode).');
      return new Response(
        JSON.stringify({ message: "Emails mocked successfully (key missing)" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { type, studentId, mentorId, senderId, recipientId, date, time, reporterId, reason, details, bookingId, meet_link, amount } = await req.json()

    // Helper to get user email and name
    const getUserData = async (uid: string) => {
      const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(uid)
      if (error || !user) throw new Error(`User not found: ${uid}`)
      return {
        email: user.email,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
      }
    }

    // Helper to get mentor user_id from mentor table if mentorId is the mentor table UUID
    const getMentorUserId = async (mid: string) => {
      const { data, error } = await supabaseAdmin.from('mentors').select('user_id, full_name').eq('id', mid).single()
      if (error || !data) throw new Error(`Mentor not found: ${mid}`)
      return { user_id: data.user_id, name: data.full_name }
    }

    let to = []
    let subject = ''
    let html = ''

    if (type === 'new_request') {
      const student = await getUserData(studentId)
      const mentorData = await getMentorUserId(mentorId)
      const mentor = await getUserData(mentorData.user_id)

      to = [mentor.email]
      subject = `New Mentorship Request from ${student.name}`
      html = `<p>Hi ${mentorData.name},</p><p>You have a new mentorship request from <strong>${student.name}</strong> on Connectors.</p><p>Log in to view and accept the request.</p>`
    } 
    else if (type === 'request_accepted') {
      const student = await getUserData(studentId)
      const mentorData = await getMentorUserId(mentorId)

      to = [student.email]
      subject = `${mentorData.name} accepted your request!`
      html = `<p>Hi ${student.name},</p><p>Great news! <strong>${mentorData.name}</strong> accepted your request! Head to the Connectors chat to schedule a time.</p>`
    }
    else if (type === 'request_declined') {
      const student = await getUserData(studentId)
      const mentorData = await getMentorUserId(mentorId)

      to = [student.email]
      subject = `Update on your mentorship request`
      html = `<p>Hi ${student.name},</p><p><strong>${mentorData.name}</strong> is unable to connect right now. Browse other mentors on Connectors to find your perfect match.</p>`
    }
    else if (type === 'first_message') {
      const sender = await getUserData(senderId)
      const recipient = await getUserData(recipientId)

      to = [recipient.email]
      subject = `New message from ${sender.name} on Connectors`
      html = `<p>Hi ${recipient.name},</p><p><strong>${sender.name}</strong> sent you a message.</p><p>Head over to Connectors to reply and schedule your session.</p>`
    }
    else if (type === 'session_confirmed') {
      const student = await getUserData(studentId)
      const mentorData = await getMentorUserId(mentorId)
      const mentor = await getUserData(mentorData.user_id)

      to = [student.email, mentor.email]
      subject = `Mentorship Session Confirmed: ${date} at ${time}`
      html = `<p>Your mentorship session is confirmed!</p>
              <p><strong>Mentor:</strong> ${mentorData.name}<br/>
              <strong>Student:</strong> ${student.name}<br/>
              <strong>Date:</strong> ${date}<br/>
              <strong>Time:</strong> ${time}</p>
              <p>Log in to Connectors for more details.</p>`
    } else if (type === 'issue_report') {
      const reporter = await getUserData(reporterId)
      const student = studentId ? await getUserData(studentId) : { name: 'Unknown' }
      const mentorData = mentorId ? await getMentorUserId(mentorId) : { name: 'Unknown' }

      to = ['riyasah3091@gmail.com']
      subject = `[Issue Report] ${reason} reported by ${reporter.name}`
      html = `<p>A new issue has been reported.</p>
              <p><strong>Reporter:</strong> ${reporter.name}</p>
              <p><strong>Student:</strong> ${student.name}</p>
              <p><strong>Mentor:</strong> ${mentorData.name}</p>
              <p><strong>Reason:</strong> ${reason}</p>
              <p><strong>Details:</strong> ${details || 'None provided'}</p>
              <p><strong>Booking ID:</strong> ${bookingId}</p>`
    } else if (type === 'mentor_approved') {
      const mentorData = await getMentorUserId(mentorId)
      const mentor = await getUserData(mentorData.user_id)
      
      to = [mentor.email]
      subject = `Welcome to Connectors, ${mentorData.name}! Your profile is now live.`
      html = `<p>Congratulations ${mentorData.name}!</p>
              <p>Your mentor application has been approved and you are now live on Connectors. You can now start receiving booking requests from students.</p>
              <p>Log in to view your profile and manage your availability.</p>`
    } else if (type === 'payment_success') {
      const student = await getUserData(studentId)
      const mentorData = await getMentorUserId(mentorId)
      
      to = [student.email]
      subject = `Payment Confirmation: Session with ${mentorData.name}`
      html = `<p>Hi ${student.name},</p>
              <p>We have successfully received your payment for your upcoming mentorship session.</p>
              <p><strong>Mentor:</strong> ${mentorData.name}<br/>
              <strong>Date:</strong> ${date}<br/>
              <strong>Amount Paid:</strong> ₹${amount || 'N/A'}</p>
              <p>Thank you for using Connectors!</p>`
    } else if (type === 'session_reminder') {
      const student = await getUserData(studentId)
      const mentorData = await getMentorUserId(mentorId)
      const mentor = await getUserData(mentorData.user_id)
      
      to = [student.email, mentor.email]
      subject = `⏰ Reminder: Your session starts in 30 minutes!`
      html = `<p>Hi there,</p>
              <p>This is a quick reminder that your mentorship session starts in about 30 minutes at ${time}.</p>
              <p><strong>Join here:</strong> <a href="${meet_link}">${meet_link}</a></p>
              <p>See you soon!</p>`
    } else {
      throw new Error(`Unknown email type: ${type}`)
    }

    // Call Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Connectors <onboarding@resend.dev>', // Replace with your verified domain
        to,
        subject,
        html
      })
    })

    const resData = await res.json()

    if (!res.ok) {
      console.error('Resend API Error:', resData)
      // We don't throw to avoid breaking the client flow, just log it
    }

    return new Response(
      JSON.stringify(resData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Error in send-email function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
