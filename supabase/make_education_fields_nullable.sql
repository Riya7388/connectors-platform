-- Make education-related columns nullable in public.mentors table
-- since they are only required for mentors in the 'JEE' exam category.
-- Run this in the Supabase SQL Editor.

ALTER TABLE public.mentors
  ALTER COLUMN college_name DROP NOT NULL,
  ALTER COLUMN branch DROP NOT NULL,
  ALTER COLUMN degree_type DROP NOT NULL,
  ALTER COLUMN year_of_admission DROP NOT NULL,
  ALTER COLUMN graduation_year DROP NOT NULL;
