import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = 'Connectors <noreply@connectorsapp.info>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const getWorkshopEmailHtml = ({
  badge,
  badgeBg,
  badgeColor,
  title,
  subtitle,
  speakerName,
  sessionTitle,
  sessionDateTime,
  durationMinutes,
  meetLink,
  buttonText,
  footerNote,
}: {
  badge: string
  badgeBg: string
  badgeColor: string
  title: string
  subtitle: string
  speakerName: string
  sessionTitle: string
  sessionDateTime: string
  durationMinutes?: number
  meetLink?: string
  buttonText?: string
  footerNote?: string
}) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #FFFFFF;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #09090B; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #141417; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; text-align: left;">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; background-color: ${badgeBg}; color: ${badgeColor}; border-radius: 6px; margin-bottom: 12px;">
                      ${badge}
                    </span>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FFFFFF; line-height: 1.3;">
                      ${title}
                    </h1>
                    <p style="margin: 6px 0 0 0; font-size: 14px; color: #A1A1AA; line-height: 1.5;">
                      ${subtitle}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Session Details Card -->
          <tr>
            <td style="padding: 24px 32px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1C1C21; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 20px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 12px 0; font-size: 17px; font-weight: 700; color: #FFFFFF; line-height: 1.4;">
                      ${sessionTitle}
                    </h2>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 13px; color: #A1A1AA; line-height: 1.8;">
                      <tr>
                        <td width="90" style="color: #71717A; font-weight: 600;">Speaker</td>
                        <td style="color: #FFFFFF; font-weight: 600;">${speakerName}</td>
                      </tr>
                      <tr>
                        <td width="90" style="color: #71717A; font-weight: 600;">Schedule</td>
                        <td style="color: #FF9D2E; font-weight: 600;">${sessionDateTime}</td>
                      </tr>
                      ${durationMinutes ? `
                      <tr>
                        <td width="90" style="color: #71717A; font-weight: 600;">Duration</td>
                        <td style="color: #FFFFFF;">${durationMinutes} minutes</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button or Message -->
              ${meetLink ? `
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="${meetLink}" target="_blank" style="display: block; background: linear-gradient(135deg, #FF9D2E 0%, #FF2D8F 38%, #A855F7 70%, #4F46E5 100%); color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; text-align: center; box-shadow: 0 4px 14px rgba(168, 85, 247, 0.25);">
                      ${buttonText || 'Join Live Session'} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              ` : footerNote ? `
              <div style="margin-top: 20px; padding: 12px 16px; background-color: rgba(255, 157, 46, 0.1); border: 1px solid rgba(255, 157, 46, 0.25); border-radius: 10px; color: #FF9D2E; font-size: 13px; line-height: 1.5;">
                ${footerNote}
              </div>
              ` : ''}

              ${meetLink && footerNote ? `
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #71717A; text-align: center; line-height: 1.5;">
                ${footerNote}
              </p>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px 32px; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #71717A;">
                Connectors Mentorship Platform &bull; NIT Raipur
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
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

    const body = await req.json()
    const { 
      type, 
      studentId, 
      mentorId, 
      senderId, 
      recipientId, 
      date, 
      time, 
      reporterId, 
      reason, 
      details, 
      bookingId, 
      meet_link, 
      amount,
      to: directTo,
      data
    } = body

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
      const { data, error } = await supabaseAdmin.from('mentors').select('user_id, full_name, is_online').eq('id', mid).single()
      if (error || !data) throw new Error(`Mentor not found: ${mid}`)
      return { user_id: data.user_id, name: data.full_name, is_online: data.is_online }
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
      const onlineNote = mentorData.is_online ? `<p><em>(Note: This mentor is currently online and available!)</em></p>` : ''
      html = `<p>Hi ${mentorData.name},</p><p>You have a new mentorship request from <strong>${student.name}</strong> on Connectors.</p>${onlineNote}<p>Log in to view and accept the request.</p>`
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
    } else if (type === 'workshop_registered') {
      to = Array.isArray(directTo) ? directTo : [directTo]
      subject = `Registration Confirmed: ${data?.session_title || 'Workshop Session'}`
      html = getWorkshopEmailHtml({
        badge: 'Registration Confirmed',
        badgeBg: 'rgba(16, 185, 129, 0.15)',
        badgeColor: '#10B981',
        title: `You're registered, ${data?.full_name || 'Student'}!`,
        subtitle: `Your seat has been reserved. Session link will be sent to your email before the start.`,
        sessionTitle: data?.session_title || 'Workshop Session',
        speakerName: data?.speaker_name || 'Connectors Team',
        sessionDateTime: data?.session_datetime_ist || 'Scheduled Soon',
        durationMinutes: data?.duration_minutes,
        meetLink: undefined,
        footerNote: `We'll email you the direct Google Meet link before the session starts. Zero spam.`
      })
    } else if (type === 'workshop_reminder') {
      to = Array.isArray(directTo) ? directTo : [directTo]
      subject = `⏰ Starting Soon: ${data?.session_title || 'Workshop Session'}`
      html = getWorkshopEmailHtml({
        badge: 'Starting Soon',
        badgeBg: 'rgba(255, 157, 46, 0.15)',
        badgeColor: '#FF9D2E',
        title: `Workshop Starting Soon!`,
        subtitle: `Hi ${data?.full_name || 'there'}, get ready! The masterclass is about to begin.`,
        sessionTitle: data?.session_title || 'Workshop Session',
        speakerName: data?.speaker_name || 'Connectors Team',
        sessionDateTime: data?.session_datetime_ist || 'Scheduled Soon',
        durationMinutes: data?.duration_minutes,
        meetLink: data?.meet_link?.trim() || undefined,
        buttonText: 'Join Live Workshop',
        footerNote: data?.meet_link?.trim()
          ? 'Please join on time to get the most out of the interactive Q&A.'
          : 'The live session link will follow shortly.'
      })
    } else if (type === 'workshop_started') {
      to = Array.isArray(directTo) ? directTo : [directTo]
      subject = `🔴 LIVE NOW: ${data?.session_title || 'Workshop Session'}`
      html = getWorkshopEmailHtml({
        badge: '🔴 Live Now',
        badgeBg: 'rgba(239, 68, 68, 0.15)',
        badgeColor: '#EF4444',
        title: `We're Live Now!`,
        subtitle: `Hi ${data?.full_name || 'there'}, the workshop has started. Join the room below:`,
        sessionTitle: data?.session_title || 'Workshop Session',
        speakerName: data?.speaker_name || 'Connectors Team',
        sessionDateTime: data?.session_datetime_ist || 'Happening Now',
        durationMinutes: data?.duration_minutes,
        meetLink: data?.meet_link?.trim() || undefined,
        buttonText: 'Enter Live Room',
        footerNote: data?.meet_link?.trim()
          ? 'Please note: This link is personal to your registration.'
          : 'The live session link will follow shortly.'
      })
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
        from: FROM_EMAIL,
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
