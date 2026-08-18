-- Enable Row Level Security on the chat_usage table
ALTER TABLE public.chat_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Users can select own chat usage" ON public.chat_usage;
DROP POLICY IF EXISTS "Users can insert own chat usage" ON public.chat_usage;
DROP POLICY IF EXISTS "Users can update own chat usage" ON public.chat_usage;
DROP POLICY IF EXISTS "Users can delete own chat usage" ON public.chat_usage;

-- 1. SELECT Policy: Users can only read their own chat usage records
CREATE POLICY "Users can select own chat usage" 
ON public.chat_usage 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. INSERT Policy: Users can only create chat usage records for themselves
CREATE POLICY "Users can insert own chat usage" 
ON public.chat_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE Policy: Users can only update their own chat usage records
CREATE POLICY "Users can update own chat usage" 
ON public.chat_usage 
FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 4. DELETE Policy: Users can only delete their own chat usage records
CREATE POLICY "Users can delete own chat usage" 
ON public.chat_usage 
FOR DELETE 
USING (auth.uid() = user_id);
