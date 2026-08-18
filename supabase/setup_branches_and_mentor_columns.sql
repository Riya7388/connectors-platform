-- ============================================================================
-- Branches Table + Mentor Columns Setup
-- Paste this ENTIRE file into Supabase SQL Editor and run it.
--
-- Creates:
--   1. public.branches — 87 engineering branch names (used by both
--      the onboarding form and the Find Mentor filter)
--   2. Adds areas_of_expertise text[] column to public.mentors
--   3. Public SELECT policy on branches
-- ============================================================================

-- ========================== 1. BRANCHES TABLE ==============================
CREATE TABLE IF NOT EXISTS public.branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE
);

-- Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Public read policy
DROP POLICY IF EXISTS "Anyone can view branches" ON public.branches;
CREATE POLICY "Anyone can view branches" ON public.branches
  FOR SELECT USING (true);

-- Insert all 87 engineering branches
INSERT INTO public.branches (name) VALUES
    ('Aerospace Engineering'),
    ('Aeronautical Engineering'),
    ('Agricultural Engineering'),
    ('Artificial Intelligence (AI)'),
    ('Artificial Intelligence & Data Science (AIDS)'),
    ('Automobile Engineering'),
    ('Automation Engineering'),
    ('Avionics Engineering'),
    ('Bioengineering'),
    ('Biomedical Engineering'),
    ('Biotechnology Engineering'),
    ('Ceramic Engineering'),
    ('Chemical Engineering'),
    ('Civil Engineering'),
    ('Civil & Environmental Engineering'),
    ('Cloud Computing Engineering'),
    ('Computer Engineering'),
    ('Computer Science Engineering (CSE)'),
    ('Computer Science & Design'),
    ('Computer Science & Business Systems (CSBS)'),
    ('Cyber Security Engineering'),
    ('Data Engineering'),
    ('Data Science Engineering'),
    ('Dairy Engineering'),
    ('Digital Electronics Engineering'),
    ('Electrical Engineering (EE)'),
    ('Electrical & Electronics Engineering (EEE)'),
    ('Electronics Engineering'),
    ('Electronics & Communication Engineering (ECE)'),
    ('Electronics & Computer Engineering'),
    ('Electronics & Instrumentation Engineering (EIE)'),
    ('Energy Engineering'),
    ('Environmental Engineering'),
    ('Fire Engineering'),
    ('Food Engineering'),
    ('Food Technology'),
    ('Footwear Engineering'),
    ('Genetic Engineering'),
    ('Geoinformatics Engineering'),
    ('Geological Engineering'),
    ('Highway Engineering'),
    ('Industrial Engineering'),
    ('Industrial & Production Engineering'),
    ('Information Technology (IT)'),
    ('Instrumentation Engineering'),
    ('Instrumentation & Control Engineering'),
    ('Internet of Things (IoT) Engineering'),
    ('Knowledge Engineering'),
    ('Leather Technology'),
    ('Logistics Engineering'),
    ('Manufacturing Engineering'),
    ('Marine Engineering'),
    ('Materials Engineering'),
    ('Materials Science & Engineering'),
    ('Mechanical Engineering'),
    ('Mechanical & Automation Engineering'),
    ('Mechatronics Engineering'),
    ('Metallurgical Engineering'),
    ('Metallurgy & Materials Engineering'),
    ('Mining Engineering'),
    ('Nanotechnology Engineering'),
    ('Naval Architecture & Ocean Engineering'),
    ('Nuclear Engineering'),
    ('Ocean Engineering'),
    ('Oil & Gas Engineering'),
    ('Optical Engineering'),
    ('Petroleum Engineering'),
    ('Pharmaceutical Engineering'),
    ('Plastic Engineering'),
    ('Polymer Engineering'),
    ('Power Engineering'),
    ('Printing Technology'),
    ('Production Engineering'),
    ('Quantum Engineering (Emerging)'),
    ('Robotics Engineering'),
    ('Rubber Technology'),
    ('Safety Engineering'),
    ('Software Engineering'),
    ('Structural Engineering'),
    ('Telecommunication Engineering'),
    ('Textile Engineering'),
    ('Tool Engineering'),
    ('Transportation Engineering'),
    ('Urban Engineering'),
    ('VLSI Design Engineering'),
    ('Water Resources Engineering'),
    ('Welding Engineering')
ON CONFLICT (name) DO NOTHING;


-- ================ 2. ADD MISSING COLUMNS TO MENTORS =======================
-- areas_of_expertise — stores the expertise topics selected during onboarding
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS areas_of_expertise text[];

-- Ensure rating column exists (should already from migrate.js)
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS rating numeric DEFAULT null;

-- Ensure languages_known column exists
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS languages_known text[];

-- Ensure free_intro_session column exists
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS free_intro_session boolean DEFAULT false;

-- Ensure pricing column exists
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS pricing jsonb;

-- ============================================================================
-- DONE! Verify by running:
--   SELECT count(*) FROM public.branches;  -- should return 87
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'mentors' AND column_name = 'areas_of_expertise';
-- ============================================================================
