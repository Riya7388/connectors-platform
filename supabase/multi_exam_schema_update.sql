-- ============================================================================
-- Multi-Exam Support Migration
-- Paste this ENTIRE file into Supabase SQL Editor and run it.
-- ============================================================================

-- 1. Create Institutions Table (for NEET, CAT, CLAT colleges)
CREATE TABLE IF NOT EXISTS public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_category text NOT NULL, -- e.g. 'NEET', 'CAT', 'CLAT'
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Index for faster filtering by exam_category
CREATE INDEX IF NOT EXISTS idx_institutions_exam_category ON public.institutions(exam_category);

-- Enable RLS and add public read policy
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view institutions" ON public.institutions;
CREATE POLICY "Anyone can view institutions" ON public.institutions
  FOR SELECT USING (true);


-- 2. Add New Columns to Mentors Table
-- We add these conditionally so the script is idempotent (safe to run multiple times)
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS exam_category text;
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS ca_stage text;
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS upsc_stage text;
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS upsc_optional_subject text;
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS target_attempt_year integer;
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS institution_other text;
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS current_prep_stage text;
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS course_type text;
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS target_exam text;
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS target_college text;
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS other_exam text;

-- 3. Backfill existing data
-- Since the platform previously only supported engineering (JEE),
-- we assume all existing mentors without an exam_category are JEE mentors.
UPDATE public.mentors
SET exam_category = 'JEE'
WHERE exam_category IS NULL;

-- ============================================================================
-- DONE! Verify by checking the mentors table structure.
-- ============================================================================
