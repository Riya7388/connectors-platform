ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false;
