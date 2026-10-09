export interface CareerMilestone {
  year: string;
  title: string;
  description: string;
}

export type SpeakerType = 'alumni' | 'junior' | 'external';

export interface Speaker {
  id: string;
  full_name: string;
  headline?: string | null;
  photo_url?: string | null;
  speaker_type: SpeakerType;
  batch_year?: string | null;
  branch?: string | null;
  current_role?: string | null;
  current_company?: string | null;
  linkedin_url?: string | null;
  my_journey?: string | null;
  career_milestones: CareerMilestone[];
  areas_of_expertise: string[];
  mentoring_note?: string | null;
  is_published: boolean;
  created_at?: string;
  updated_at?: string;
}

export type SessionAccessType = 'free_for_all' | 'nit_free_others_paid' | 'paid_for_all';
export type SessionStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';
export type SessionDuration = 60 | 90;

export interface WorkshopSession {
  id: string;
  title: string;
  description?: string | null;
  speaker_id?: string | null;
  session_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS or HH:MM
  duration_minutes: SessionDuration;
  access_type: SessionAccessType;
  price_amount: number; // in paise (e.g. 49900 for ₹499)
  meet_link?: string | null;
  capacity?: number | null;
  cover_image_url?: string | null;
  status: SessionStatus;
  recording_url?: string | null;
  resource_summary?: string | null;
  created_at?: string;
  updated_at?: string;
  speaker?: Speaker | null;
}

export type PaymentStatus = 'not_required' | 'pending' | 'paid' | 'failed';


export interface SessionRegistration {
  id: string;
  session_id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  year_or_class?: string | null;
  question_for_speaker?: string | null;
  is_nit_verified: boolean;
  payment_status: PaymentStatus;
  razorpay_payment_id?: string | null;
  amount_paid: number;
  reminder_sent: boolean;
  start_mail_sent: boolean;
  registered_at: string;
  session?: WorkshopSession;
}
