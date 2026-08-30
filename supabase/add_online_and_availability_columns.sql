-- =============================================================================
-- Online/Offline Toggle & Availability Time Schema Update
-- Run this file manually in your Supabase SQL editor.
-- =============================================================================

-- Add columns to mentors table
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS is_online boolean DEFAULT false;
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS last_online_at timestamptz;
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS availability_time text;

-- =============================================================================
-- Auto-offline after inactivity (2 hours threshold, checked every 30 minutes)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.auto_offline_inactive_mentors()
RETURNS void AS $$
BEGIN
  UPDATE public.mentors
  SET is_online = false,
      last_online_at = now()
  WHERE is_online = true
    AND last_online_at < (now() - interval '2 hours');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unschedule any previous instance
SELECT cron.unschedule('auto-offline-mentors-job');

-- Schedule the job to run every 30 minutes
SELECT cron.schedule(
  'auto-offline-mentors-job',
  '*/30 * * * *',
  $$ SELECT public.auto_offline_inactive_mentors(); $$
);
