-- Migration: Add requested_duration_minutes to booking_requests
-- Allows storing the student's selected session duration at initial request time.

ALTER TABLE public.booking_requests 
ADD COLUMN IF NOT EXISTS requested_duration_minutes int4;
