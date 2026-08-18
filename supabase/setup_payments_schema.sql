-- Add payment & session tracking fields to booking_requests
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'not_required'; -- 'not_required' | 'pending' | 'paid' | 'refunded'
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS amount_due numeric;
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS razorpay_order_id text;
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS razorpay_payment_id text;
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS meet_link text;
ALTER TABLE public.booking_requests ADD COLUMN IF NOT EXISTS is_free_intro boolean DEFAULT false;

-- New table for issue reports
CREATE TABLE IF NOT EXISTS public.session_reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_request_id uuid REFERENCES public.booking_requests(id) NOT NULL,
    reported_by uuid REFERENCES auth.users(id) NOT NULL,
    reason text NOT NULL, -- 'mentor_no_show' | 'mentor_late' | 'technical_issue' | 'other'
    details text,
    status text DEFAULT 'open', -- 'open' | 'reviewing' | 'resolved_refunded' | 'resolved_no_refund'
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.session_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create their own reports" ON public.session_reports
    FOR INSERT WITH CHECK (auth.uid() = reported_by);
CREATE POLICY "Users can view their own reports" ON public.session_reports
    FOR SELECT USING (auth.uid() = reported_by);
