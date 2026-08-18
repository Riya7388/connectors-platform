// diagnose_final.mjs
// FINAL CHECK: Reproduce the exact INSERT the form sends for a logged-in user
// We need to test with a real Supabase auth session.
// Strategy: Sign in with email+password, then do the exact INSERT.

const SUPABASE_URL = 'https://bzktgyzwirsxmtipnckr.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6a3RneXp3aXJzeG10aXBuY2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2Mzg0MzYsImV4cCI6MjA5ODIxNDQzNn0.roFSNeOwHdSo2E24O16CYknJZemqkLqx4LH5vDJoc3Q';

// First, we'll sign in as the test user
async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  return { status: res.status, token: body.access_token, userId: body.user?.id, error: body.error_description || body.msg };
}

// Try the EXACT same INSERT the form does
async function tryExactInsert(token, userId, payload) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/mentors`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ ...payload, user_id: userId }),
  });
  const body = await res.text();
  return { status: res.status, body };
}

// From the screenshot: user used 60 min session, price ₹75, UPI, freeIntro=true
// session_durations in the form: watchSessionDurations is array of strings like ["60 min"]
// prices in the form: {"60 min": "75"} (strings, from z.record(z.string(), z.string()))
// The INSERT sends: session_durations: data.sessionDurations → array ["60 min"]
//                   pricing: data.prices → {"60 min": "75"}

const exactPayload = {
  // user_id: filled by signIn
  full_name: '__PROBE_DELETE_ME__',
  profile_photo_url: null,
  date_of_birth: '2000-01-01',
  gender: 'Female',
  phone_number: '9999999999',
  personal_email: 'probe_delete@test.com',
  city: 'Test',
  whatsapp_number: null,
  exam_category: 'JEE',
  ca_stage: null,
  upsc_stage: null,
  upsc_optional_subject: null,
  target_attempt_year: null,
  institution_other: null,
  current_prep_stage: null,
  exam_branch: '',
  exam_branch_other: '',
  course_type: null,
  target_exam: null,
  target_college: null,
  other_exam: null,
  college_name: 'IIT Delhi',
  branch: 'Computer Science Engineering (CSE)',
  degree_type: 'B.Tech',
  year_of_admission: 2021,
  graduation_year: 2025,
  current_semester: '7',
  govt_id_url: null,
  student_id_front_url: null,
  student_id_back_url: null,
  linkedin_url: 'https://linkedin.com/in/probe',
  languages_known: ['English', 'Hindi'],
  // EXACT format that the form sends for session_durations and pricing:
  session_durations: ['60 min'],           // array of strings
  pricing: { '60 min': '75' },            // record<string, string>
  free_intro_session: true,
  payout_type: 'upi',                      // Note: schema is z.enum(["bank","upi"]) → lowercase!
  bank_account_number: null,
  bank_ifsc: null,
  bank_account_holder: null,
  upi_id: 'riyasah@oksbi',
  application_status: 'pending',
};

async function main() {
  // We can't sign in with credentials we don't know.
  // Instead, let's do the most targeted thing: send the EXACT payload with ANON key
  // and compare the error code to what the user sees.
  
  // The key insight: the user IS getting past line 308 ("if !user" check),
  // so their Supabase session IS valid. The 400 is from a DB-level error.
  
  // Let's also check: what EXACTLY does PostgREST return for these specific scenarios
  // without auth (we'll get 401 from RLS, but the error CODE tells us if it's RLS or schema)
  
  console.log('Checking EXACT payload the form sends...\n');

  // Test 1: Check session_durations as jsonb — array format
  const sdArray = await fetch(`${SUPABASE_URL}/rest/v1/mentors?select=session_durations&session_durations=cs.["60 min"]&limit=0`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
  });
  console.log(`session_durations array query: ${sdArray.status}`);

  // Test 2: What is payout_type in DB vs what the form sends?
  // Form: z.enum(["bank", "upi"]) → sends lowercase "upi"
  // DB: payout_type text — accepts any string, so OK
  
  // Test 3: Check pricing as {"60 min": "75"} — valid JSONB?
  // Yes, all JSONB accepts any valid JSON. OK.
  
  // CRITICAL NEW HYPOTHESIS: Look at the Supabase JS client version
  // The .insert([{}]) array syntax vs .insert({}) object syntax
  // Check if there's a UNIQUE constraint on user_id — if user already has a row!
  
  console.log('\n--- Check: UNIQUE constraint on user_id? ---');
  // If the user already submitted once (even if it failed), there might be a duplicate
  // Let's check if there's a unique index on user_id
  const uniqueCheck = await fetch(
    `${SUPABASE_URL}/rest/v1/mentors?select=user_id&limit=10`,
    { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` } }
  );
  const rows = await uniqueCheck.json();
  console.log(`Total visible approved mentor rows: ${rows.length}`);
  console.log(`Rows: ${JSON.stringify(rows)}`);
  
  // CRITICAL: Is there a UNIQUE constraint on user_id?
  // From migrate.js: user_id uuid REFERENCES auth.users(id) — no UNIQUE keyword!
  // So multiple rows per user_id are allowed.
  
  // But wait — what if there's a unique constraint added later?
  // Let's try to detect via a unique violation (409)
  
  console.log('\n--- FINAL HYPOTHESIS SUMMARY ---');
  console.log('All columns exist. All types are compatible. No bad trigger.');
  console.log('The 400 must be from one of:');
  console.log('  A) NOT NULL constraint on year_of_admission/graduation_year (if NOT NULL still in live DB)');
  console.log('  B) A UNIQUE constraint on user_id (if user already has a row → 409, not 400)');  
  console.log('  C) A CHECK CONSTRAINT on some column we haven\'t identified yet');
  console.log('  D) The session_durations field type mismatch (array vs jsonb)');
  console.log('');
  console.log('MOST LIKELY: The user sees "400" but PostgREST wraps certain errors as 400.');
  console.log('The exact error text the user needs to read from Network tab > Response body.');
  console.log('');
  console.log('Based on Check 4 (sample rows exist with year_of_admission filled),');
  console.log('those rows passed. The question is: are those rows from migrate.js NOT NULL era');
  console.log('or from a NULLABLE era?');
  
  // Check sample rows more carefully
  const sample = await fetch(
    `${SUPABASE_URL}/rest/v1/mentors?select=*&limit=1`,
    { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` } }
  );
  const sampleRows = await sample.json();
  if (sampleRows && sampleRows.length > 0) {
    const row = sampleRows[0];
    console.log('\nSample approved row columns present:');
    console.log(Object.keys(row).sort().join(', '));
    console.log('\nFields from INSERT NOT present in DB row:');
    const insertFields = ['user_id','full_name','profile_photo_url','date_of_birth','gender','phone_number',
      'personal_email','city','whatsapp_number','exam_category','ca_stage','upsc_stage','upsc_optional_subject',
      'target_attempt_year','institution_other','current_prep_stage','exam_branch','exam_branch_other','course_type',
      'target_exam','target_college','other_exam','college_name','branch','degree_type','year_of_admission',
      'graduation_year','current_semester','govt_id_url','student_id_front_url','student_id_back_url',
      'linkedin_url','languages_known','session_durations','pricing','free_intro_session','payout_type',
      'bank_account_number','bank_ifsc','bank_account_holder','upi_id','application_status'];
    const rowCols = Object.keys(row);
    const missingFromRow = insertFields.filter(f => !rowCols.includes(f));
    const extraInRow = rowCols.filter(f => !insertFields.includes(f));
    console.log('Missing from sample row (columns not shown by RLS SELECT):', missingFromRow);
    console.log('Extra in sample row (DB cols not in INSERT):', extraInRow);
    
    console.log('\nSample row values:');
    console.log(JSON.stringify(row, null, 2));
  }
}

main().catch(console.error);
