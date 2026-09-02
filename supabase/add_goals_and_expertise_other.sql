-- =============================================================================
-- Migration: Add goals and expertise_other to mentors table
-- Description: Adds columns for mentor goals array and custom "Other" expertise text.
-- Run this in your Supabase SQL Editor.
-- =============================================================================

ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS goals text[];
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS expertise_other text;
