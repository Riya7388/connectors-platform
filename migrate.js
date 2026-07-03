import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres:Riy%40ryan3091@[2406:da18:e5c:b701:bc9e:393a:3d40:dc96]:5432/postgres';

const sql = `
-- Drop existing table
DROP TABLE IF EXISTS public.mentors CASCADE;

-- Create mentors table
CREATE TABLE public.mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  full_name text NOT NULL,
  profile_photo_url text,
  date_of_birth date NOT NULL,
  gender text,
  phone_number text NOT NULL,
  phone_verified boolean DEFAULT false,
  personal_email text NOT NULL,
  city text NOT NULL,
  whatsapp_number text,
  college_name text NOT NULL,
  branch text NOT NULL,
  degree_type text NOT NULL,
  year_of_admission int4 NOT NULL,
  graduation_year int4 NOT NULL,
  current_semester text,
  govt_id_url text,
  student_id_front_url text,
  student_id_back_url text,
  linkedin_url text NOT NULL,
  languages_known text[],
  session_durations jsonb,
  pricing jsonb,
  free_intro_session boolean DEFAULT false,
  payout_type text,
  bank_account_number text,
  bank_ifsc text,
  bank_account_holder text,
  upi_id text,
  application_status text DEFAULT 'pending',
  verified boolean DEFAULT false,
  rating numeric DEFAULT null
);

-- Enable RLS
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;

-- Create policies for mentors
CREATE POLICY "Users can insert their own mentor row" ON public.mentors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own row" ON public.mentors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own row" ON public.mentors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Public can view approved mentors" ON public.mentors
  FOR SELECT USING (application_status = 'approved' AND verified = true);

-- Storage Buckets setup
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
('profile-photos', 'profile-photos', true, 5242880, '{"image/jpeg", "image/png", "image/webp"}'),
('government-ids', 'government-ids', false, 10485760, '{"image/jpeg", "image/png", "image/webp", "application/pdf"}'),
('student-ids', 'student-ids', false, 10485760, '{"image/jpeg", "image/png", "image/webp", "application/pdf"}')
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public, 
  file_size_limit = EXCLUDED.file_size_limit, 
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage Policies

-- 1. profile-photos (public read, authenticated write)
DROP POLICY IF EXISTS "Public Profile Photos" ON storage.objects;
CREATE POLICY "Public Profile Photos" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-photos');

DROP POLICY IF EXISTS "Users can upload profile photos" ON storage.objects;
CREATE POLICY "Users can upload profile photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'profile-photos' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can update their profile photos" ON storage.objects;
CREATE POLICY "Users can update their profile photos" ON storage.objects
FOR UPDATE USING (bucket_id = 'profile-photos' AND auth.uid() = owner);

-- 2. government-ids (private, only owner)
DROP POLICY IF EXISTS "Users can read own govt id" ON storage.objects;
CREATE POLICY "Users can read own govt id" ON storage.objects
FOR SELECT USING (bucket_id = 'government-ids' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can upload govt id" ON storage.objects;
CREATE POLICY "Users can upload govt id" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'government-ids' AND auth.uid() = owner);

-- 3. student-ids (private, only owner)
DROP POLICY IF EXISTS "Users can read own student id" ON storage.objects;
CREATE POLICY "Users can read own student id" ON storage.objects
FOR SELECT USING (bucket_id = 'student-ids' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can upload student id" ON storage.objects;
CREATE POLICY "Users can upload student id" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'student-ids' AND auth.uid() = owner);

`;

async function runMigration() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected to database. Running migration...");
    await client.query(sql);
    console.log("Migration executed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.end();
  }
}

runMigration();
