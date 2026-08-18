-- ============================================================================
-- Adds the `bio` column to the `mentors` table for the Mentor Profile page
-- ============================================================================

ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS bio text;
