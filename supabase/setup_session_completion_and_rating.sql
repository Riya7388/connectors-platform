-- =============================================================================
-- Automatic Session Completion + Session Ratings
-- Run this file manually in your Supabase SQL editor.
-- DO NOT modify the existing setup_notifications.sql / session-reminders-job.
-- =============================================================================

-- =============================================================================
-- PART 1: Auto-complete past sessions via pg_cron
-- =============================================================================
-- Note: booking_requests.status is a plain text column (no CHECK constraint),
-- so adding 'completed' as a value requires no schema alteration — we simply
-- start writing it.

CREATE OR REPLACE FUNCTION public.complete_past_sessions()
RETURNS void AS $$
DECLARE
  rec RECORD;
  scheduled_end timestamp with time zone;
BEGIN
  FOR rec IN
    SELECT id, confirmed_date, confirmed_time, confirmed_duration_minutes
    FROM public.booking_requests
    WHERE status = 'time_confirmed'
      AND confirmed_date IS NOT NULL
      AND confirmed_time IS NOT NULL
      AND confirmed_duration_minutes IS NOT NULL
  LOOP
    -- Build the session end timestamp.
    -- confirmed_date and confirmed_time are stored as IST values (UTC+5:30),
    -- matching the same assumption used by the existing session-reminders-job.
    scheduled_end := (rec.confirmed_date::text || ' ' || rec.confirmed_time::text || ' +05:30')::timestamp with time zone
                     + (rec.confirmed_duration_minutes || ' minutes')::interval;

    -- If the session has already ended, mark it completed.
    IF now() > scheduled_end THEN
      UPDATE public.booking_requests
      SET    status     = 'completed',
             updated_at = now()
      WHERE  id = rec.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unschedule any stale version of this job first (safe to run even if it
-- never existed — cron.unschedule returns false instead of erroring).
SELECT cron.unschedule('session-completion-job');

-- Run every 10 minutes, same cadence as the existing reminder job.
SELECT cron.schedule(
  'session-completion-job',
  '*/10 * * * *',
  $$ SELECT public.complete_past_sessions(); $$
);


-- =============================================================================
-- PART 2: session_ratings table + RLS + mentor rating aggregation trigger
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.session_ratings (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_request_id  uuid        NOT NULL REFERENCES public.booking_requests(id),
  mentor_id           uuid        NOT NULL REFERENCES public.mentors(id),
  rated_by            uuid        NOT NULL REFERENCES auth.users(id),
  rating              integer     NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review              text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  -- Prevent a student from rating the same session more than once.
  UNIQUE (booking_request_id, rated_by)
);

ALTER TABLE public.session_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can read ratings (needed for mentor profiles / FindMentor).
DROP POLICY IF EXISTS "Ratings are publicly readable" ON public.session_ratings;
CREATE POLICY "Ratings are publicly readable" ON public.session_ratings
  FOR SELECT USING (true);

-- Only the student of a *completed* booking can insert their own rating.
DROP POLICY IF EXISTS "Student can rate their own completed session" ON public.session_ratings;
CREATE POLICY "Student can rate their own completed session" ON public.session_ratings
  FOR INSERT WITH CHECK (
    auth.uid() = rated_by
    AND auth.uid() = (
      SELECT student_id FROM public.booking_requests WHERE id = booking_request_id
    )
    AND 'completed' = (
      SELECT status FROM public.booking_requests WHERE id = booking_request_id
    )
  );

-- Raters can update their own rating within 24 hours of submission.
DROP POLICY IF EXISTS "Rater can update within 24h" ON public.session_ratings;
CREATE POLICY "Rater can update within 24h" ON public.session_ratings
  FOR UPDATE
  USING (
    auth.uid() = rated_by
    AND created_at > now() - interval '24 hours'
  )
  WITH CHECK (auth.uid() = rated_by);

-- Raters can delete their own rating within 24 hours of submission.
DROP POLICY IF EXISTS "Rater can delete within 24h" ON public.session_ratings;
CREATE POLICY "Rater can delete within 24h" ON public.session_ratings
  FOR DELETE USING (
    auth.uid() = rated_by
    AND created_at > now() - interval '24 hours'
  );


-- =============================================================================
-- PART 3: Trigger — recompute mentors.rating after any rating change
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_mentor_average_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_mentor_id  uuid;
  v_avg_rating numeric;
BEGIN
  -- Identify which mentor was affected.
  IF TG_OP = 'DELETE' THEN
    v_mentor_id := OLD.mentor_id;
  ELSE
    v_mentor_id := NEW.mentor_id;
  END IF;

  -- Recalculate average (NULL when no ratings exist, matching the nullable column).
  SELECT ROUND(AVG(rating)::numeric, 2)
  INTO   v_avg_rating
  FROM   public.session_ratings
  WHERE  mentor_id = v_mentor_id;

  UPDATE public.mentors
  SET    rating = v_avg_rating
  WHERE  id = v_mentor_id;

  RETURN NULL; -- return value is ignored for AFTER triggers
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_session_rating_change ON public.session_ratings;
CREATE TRIGGER on_session_rating_change
AFTER INSERT OR UPDATE OR DELETE ON public.session_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_mentor_average_rating();
