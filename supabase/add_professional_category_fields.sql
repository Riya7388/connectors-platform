-- Migration: Add professional category fields to public.mentors table
-- Run this script in your Supabase SQL Editor.

ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS current_organization text;
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS years_of_experience text;
