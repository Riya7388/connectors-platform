-- =============================================================================
-- Migration: Add UNIQUE constraint to mentors.user_id
-- Description: Ensures one mentor record per authenticated user.
-- Run this in your Supabase SQL Editor.
-- =============================================================================

-- 1. (Safety Check) Verify if any duplicate user_id exists before applying constraint
DO $$
DECLARE
  dup_count integer;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT user_id
    FROM public.mentors
    WHERE user_id IS NOT NULL
    GROUP BY user_id
    HAVING COUNT(*) > 1
  ) dups;

  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Cannot add UNIQUE constraint: Found % user(s) with duplicate mentor rows. Please clean up duplicates first.', dup_count;
  END IF;
END $$;

-- 2. Safely add the UNIQUE constraint if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'mentors_user_id_unique' 
      AND conrelid = 'public.mentors'::regclass
  ) THEN
    ALTER TABLE public.mentors ADD CONSTRAINT mentors_user_id_unique UNIQUE (user_id);
    RAISE NOTICE 'Constraint mentors_user_id_unique added successfully.';
  ELSE
    RAISE NOTICE 'Constraint mentors_user_id_unique already exists.';
  END IF;
END $$;
