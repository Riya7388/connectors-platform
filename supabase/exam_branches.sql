-- 1. Create exam_branches table
CREATE TABLE IF NOT EXISTS public.exam_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_category text NOT NULL, -- e.g. 'NEET', 'CA', 'CAT', 'UPSC', 'CLAT', 'Banking', 'Defense', 'CUET'
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Add index for faster lookups based on exam_category
CREATE INDEX IF NOT EXISTS idx_exam_branches_exam_category ON public.exam_branches(exam_category);

-- 3. Enable RLS and add public read policy
ALTER TABLE public.exam_branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view exam branches" ON public.exam_branches;
CREATE POLICY "Anyone can view exam branches" ON public.exam_branches
  FOR SELECT USING (true);

-- 4. Add new columns to mentors table
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS exam_branch text;
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS exam_branch_other text;
