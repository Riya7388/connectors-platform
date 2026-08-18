CREATE TABLE IF NOT EXISTS public.booking_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid REFERENCES auth.users(id) NOT NULL,
    mentor_id uuid REFERENCES public.mentors(id) NOT NULL,
    status text DEFAULT 'pending', -- 'pending' | 'accepted' | 'declined' | 'expired' | 'time_confirmed'
    initial_message text,
    confirmed_date date,
    confirmed_time time,
    confirmed_duration_minutes int4,
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '48 hours'),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_request_id uuid REFERENCES public.booking_requests(id) NOT NULL,
    sender_id uuid REFERENCES auth.users(id) NOT NULL,
    message text NOT NULL,
    is_system boolean DEFAULT false,
    read_at timestamptz, -- NULL until the recipient has viewed it (used for unread badge count)
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student can view own requests" ON public.booking_requests
    FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Student can create requests" ON public.booking_requests
    FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Mentor can view requests sent to them" ON public.booking_requests
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.mentors WHERE id = mentor_id));
CREATE POLICY "Mentor can update requests sent to them" ON public.booking_requests
    FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.mentors WHERE id = mentor_id));

CREATE POLICY "Participants can view messages" ON public.chat_messages
    FOR SELECT USING (
        auth.uid() IN (
            SELECT student_id FROM public.booking_requests WHERE id = booking_request_id
            UNION
            SELECT user_id FROM public.mentors WHERE id = (SELECT mentor_id FROM public.booking_requests WHERE id = booking_request_id)
        )
    );
CREATE POLICY "Participants can send messages" ON public.chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        auth.uid() IN (
            SELECT student_id FROM public.booking_requests WHERE id = booking_request_id
            UNION
            SELECT user_id FROM public.mentors WHERE id = (SELECT mentor_id FROM public.booking_requests WHERE id = booking_request_id)
        )
    );
CREATE POLICY "Participants can mark messages read" ON public.chat_messages
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT student_id FROM public.booking_requests WHERE id = booking_request_id
            UNION
            SELECT user_id FROM public.mentors WHERE id = (SELECT mentor_id FROM public.booking_requests WHERE id = booking_request_id)
        )
    );
