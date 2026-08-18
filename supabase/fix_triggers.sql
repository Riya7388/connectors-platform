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
