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
