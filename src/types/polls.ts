export type PollStatus = 'draft' | 'active' | 'closed' | 'archived';
export type SuggestionStatus = 'new' | 'reviewed' | 'selected' | 'archived';

export interface Poll {
  id: string;
  question: string;
  subtitle?: string | null;
  status: PollStatus;
  nit_only: boolean;
  closes_at?: string | null;
  created_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  label: string;
  sort_order: number;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
}

export interface TopicSuggestion {
  id: string;
  user_id?: string | null;
  email?: string | null;
  title: string;
  category?: string | null;
  why_helpful?: string | null;
  status: SuggestionStatus;
  created_at: string;
}
