import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runE2ETest() {
  console.log("Starting E2E Test...");
  const testEmail = 'testuser' + Math.floor(Math.random() * 10000) + '@gmail.com';
  const testPassword = 'testpassword123';

  console.log(`1. Signing up with ${testEmail}`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (signUpError) {
    console.error("Sign up failed:", signUpError.message);
    return;
  }
  console.log("Sign up successful. User ID:", signUpData.user?.id);

  console.log("2. Attempting to log in (to check if email confirmation is required)...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInError) {
    console.error("Sign in failed (Email confirmation might be enabled):", signInError.message);
    // Note: If sign in fails due to email confirmation, we can't test RLS insert easily without turning it off.
  } else {
    console.log("Sign in successful! Session established.");
  }
  
  // We will try inserting anyway, using the session if we got one.
  // If email confirmation is required but we got a user object from signUp, 
  // sometimes signUp returns a session if auto-confirm is enabled. Let's check.
  const session = signInData?.session || signUpData?.session;
  
  if (!session) {
     console.error("No active session. Cannot perform authenticated insert to test RLS.");
     return;
  }

  console.log("3. Inserting mentor application payload...");
  const payload = {
    user_id: session.user.id,
    full_name: "E2E Test User",
    profile_photo_url: "https://example.com/photo.jpg",
    date_of_birth: "2000-01-01",
    gender: "Other",
    phone_number: "9876543210",
    personal_email: testEmail,
    city: "Test City",
    college_name: "Test Institute",
    branch: "CSE",
    degree_type: "B.Tech",
    year_of_admission: 2020,
    graduation_year: 2024,
    linkedin_url: "https://linkedin.com/in/test",
    languages_known: ["English"],
    application_status: "pending",
    phone_verified: true
  };

  const { error: insertError } = await supabase.from('mentors').insert([payload]);

  if (insertError) {
    console.error("Insert failed:", insertError.message);
  } else {
    console.log("Insert successful! Row added to 'mentors' table.");
  }
}

runE2ETest();
