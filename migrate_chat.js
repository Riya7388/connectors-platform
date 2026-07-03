import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres.bzktgyzwirsxmtipnckr:Riy%40ryan3091@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

const sql = `
-- Create chat_usage table to track messages and apply rate limiting
CREATE TABLE IF NOT EXISTS public.chat_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  message_date date DEFAULT current_date NOT NULL,
  message_count int DEFAULT 1 NOT NULL,
  CONSTRAINT unique_user_date UNIQUE (user_id, message_date),
  CONSTRAINT unique_session_date UNIQUE (session_id, message_date)
);

-- Enable RLS
ALTER TABLE public.chat_usage ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own limits (if needed, though edge function runs as service_role)
DROP POLICY IF EXISTS "Users can select own chat usage" ON public.chat_usage;
CREATE POLICY "Users can select own chat usage" ON public.chat_usage
  FOR SELECT USING (auth.uid() = user_id);
`;

async function runMigration() {
  const client = new Client({ 
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
  try {
    await client.connect();
    console.log("Connected to database. Running chat_usage migration...");
    await client.query(sql);
    console.log("Migration executed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.end();
  }
}

runMigration();
