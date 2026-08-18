-- ============================================================================
-- Fixes for RLS Policies (Mentor Dashboard & Chat Messages)
-- Paste this ENTIRE file into the Supabase SQL Editor and run it.
-- ============================================================================

-- 1. Helper function for booking_requests (Mentor view)
-- Using SECURITY DEFINER bypasses nested RLS checks that cause silent failures
CREATE OR REPLACE FUNCTION public.is_mentor_for_request(mentor_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.mentors
        WHERE id = mentor_id_param
        AND user_id = auth.uid()
    );
$$;

-- 2. Helper function for chat_messages (Participant check)
-- Solves the 403/400 errors by safely evaluating permissions without recursion
CREATE OR REPLACE FUNCTION public.is_chat_participant(request_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.booking_requests br
        LEFT JOIN public.mentors m ON br.mentor_id = m.id
        WHERE br.id = request_id
        AND (br.student_id = auth.uid() OR m.user_id = auth.uid())
    );
$$;

-- 3. Recreate policies for booking_requests
DROP POLICY IF EXISTS "Mentor can view requests sent to them" ON public.booking_requests;
CREATE POLICY "Mentor can view requests sent to them" ON public.booking_requests
    FOR SELECT USING (public.is_mentor_for_request(mentor_id));

DROP POLICY IF EXISTS "Mentor can update requests sent to them" ON public.booking_requests;
CREATE POLICY "Mentor can update requests sent to them" ON public.booking_requests
    FOR UPDATE USING (public.is_mentor_for_request(mentor_id));

-- 4. Recreate policies for chat_messages
DROP POLICY IF EXISTS "Participants can view messages" ON public.chat_messages;
CREATE POLICY "Participants can view messages" ON public.chat_messages
    FOR SELECT USING (public.is_chat_participant(booking_request_id));

DROP POLICY IF EXISTS "Participants can send messages" ON public.chat_messages;
CREATE POLICY "Participants can send messages" ON public.chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        public.is_chat_participant(booking_request_id)
    );

DROP POLICY IF EXISTS "Participants can mark messages read" ON public.chat_messages;
CREATE POLICY "Participants can mark messages read" ON public.chat_messages
    FOR UPDATE USING (public.is_chat_participant(booking_request_id));

-- 5. Ensure is_system column exists
-- If this was missing on the remote DB, it caused the 400 Bad Request on auto-insert
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;
