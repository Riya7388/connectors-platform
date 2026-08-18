-- 1. Add reminder_sent column
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false;

-- 2. Trigger for mentor_approved
CREATE OR REPLACE FUNCTION public.handle_mentor_approved()
RETURNS TRIGGER AS $$
DECLARE
  anon_key text;
BEGIN
  -- Hardcoded anon key to ensure the edge function can be called even when triggered
  -- from unauthenticated environments like the Supabase Table Editor.
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6a3RneXp3aXJzeG10aXBuY2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2Mzg0MzYsImV4cCI6MjA5ODIxNDQzNn0.roFSNeOwHdSo2E24O16CYknJZemqkLqx4LH5vDJoc3Q';

  IF (NEW.application_status = 'approved' AND OLD.application_status != 'approved') OR
     (NEW.verified = true AND OLD.verified = false) THEN
     
     -- Ensure both are true to send the welcome email
     IF NEW.application_status = 'approved' AND NEW.verified = true THEN
       PERFORM net.http_post(
         url := 'https://bzktgyzwirsxmtipnckr.supabase.co/functions/v1/send-email',
         headers := ('{"Content-Type": "application/json", "Authorization": "Bearer ' || anon_key || '"}')::jsonb,
         body := json_build_object(
           'type', 'mentor_approved',
           'mentorId', NEW.id
         )::jsonb
       );
     END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_mentor_approved ON public.mentors;
CREATE TRIGGER on_mentor_approved
AFTER UPDATE ON public.mentors
FOR EACH ROW EXECUTE FUNCTION public.handle_mentor_approved();

-- 3. Trigger for payment_success
CREATE OR REPLACE FUNCTION public.handle_payment_success()
RETURNS TRIGGER AS $$
DECLARE
  anon_key text;
BEGIN
  -- Hardcoded anon key to ensure the edge function can be called even when triggered
  -- from unauthenticated environments like the Supabase Table Editor.
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6a3RneXp3aXJzeG10aXBuY2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2Mzg0MzYsImV4cCI6MjA5ODIxNDQzNn0.roFSNeOwHdSo2E24O16CYknJZemqkLqx4LH5vDJoc3Q';

  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
     PERFORM net.http_post(
       url := 'https://bzktgyzwirsxmtipnckr.supabase.co/functions/v1/send-email',
       headers := ('{"Content-Type": "application/json", "Authorization": "Bearer ' || anon_key || '"}')::jsonb,
       body := json_build_object(
         'type', 'payment_success',
         'studentId', NEW.student_id,
         'mentorId', NEW.mentor_id,
         'date', NEW.confirmed_date,
         'amount', NEW.amount_due
       )::jsonb
     );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_payment_success ON public.booking_requests;
CREATE TRIGGER on_payment_success
AFTER UPDATE ON public.booking_requests
FOR EACH ROW EXECUTE FUNCTION public.handle_payment_success();

-- 4. Session Reminder Cron Job
-- Note: confirmed_date and confirmed_time are stored as strings (e.g. '2023-10-25', '14:30').
-- Assuming they represent IST (UTC+5:30) time since users are in India.
CREATE OR REPLACE FUNCTION public.send_session_reminders()
RETURNS void AS $$
DECLARE
  rec RECORD;
  scheduled_timestamp timestamp with time zone;
  minutes_until integer;
  anon_key text;
BEGIN
  -- We don't have request.jwt in cron context, we must hardcode or fetch the anon key.
  -- Alternatively, we can use the service role key if available.
  -- For safety, please replace 'YOUR_ANON_KEY' with your actual anon key from .env
  anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6a3RneXp3aXJzeG10aXBuY2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2Mzg0MzYsImV4cCI6MjA5ODIxNDQzNn0.roFSNeOwHdSo2E24O16CYknJZemqkLqx4LH5vDJoc3Q';

  FOR rec IN
    SELECT id, student_id, mentor_id, confirmed_date, confirmed_time, meet_link
    FROM public.booking_requests
    WHERE status = 'time_confirmed'
      AND meet_link IS NOT NULL
      AND reminder_sent = false
  LOOP
    -- Calculate scheduled timestamp in IST
    scheduled_timestamp := (rec.confirmed_date || ' ' || rec.confirmed_time || ' +05:30')::timestamp with time zone;
    
    -- Extract minutes until session starts
    minutes_until := EXTRACT(EPOCH FROM (scheduled_timestamp - now())) / 60;
    
    -- Check if it is between 15 and 40 minutes away
    IF minutes_until >= 15 AND minutes_until <= 40 THEN
       -- Call edge function
       PERFORM net.http_post(
         url := 'https://bzktgyzwirsxmtipnckr.supabase.co/functions/v1/send-email',
         headers := ('{"Content-Type": "application/json", "Authorization": "Bearer ' || anon_key || '"}')::jsonb,
         body := json_build_object(
           'type', 'session_reminder',
           'studentId', rec.student_id,
           'mentorId', rec.mentor_id,
           'time', rec.confirmed_time,
           'meet_link', rec.meet_link
         )::jsonb
       );
       
       -- Mark reminder as sent
       UPDATE public.booking_requests SET reminder_sent = true WHERE id = rec.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing job if any
SELECT cron.unschedule('session-reminders-job');

-- Schedule the cron job to run every 10 minutes
SELECT cron.schedule(
    'session-reminders-job',
    '*/10 * * * *',
    $$ SELECT public.send_session_reminders(); $$
);
