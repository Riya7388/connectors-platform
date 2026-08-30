-- =============================================================================
-- Migration: Add achievements, mentor_tag, and mentor_tag_other to mentors
-- Description: Adds columns for achievements array and customizable mentor tags.
-- Run this in your Supabase SQL Editor.
-- =============================================================================

ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS achievements text[];
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS mentor_tag text;
ALTER TABLE public.mentors ADD COLUMN IF NOT EXISTS mentor_tag_other text;
