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

export type SessionAccessType = 'free_for_all' | 'nit_free_others_paid';
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
  created_at?: string;
  updated_at?: string;
  speaker?: Speaker | null;
}
