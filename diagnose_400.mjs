// diagnose_400.mjs
// Queries the LIVE Supabase DB schema for `mentors` table
// and cross-checks against the exact fields the insert handler sends.

const SUPABASE_URL = 'https://bzktgyzwirsxmtipnckr.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6a3RneXp3aXJzeG10aXBuY2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2Mzg0MzYsImV4cCI6MjA5ODIxNDQzNn0.roFSNeOwHdSo2E24O16CYknJZemqkLqx4LH5vDJoc3Q';

// ALL fields the onSubmit handler tries to INSERT (BecomeMentor.tsx L314-357)
const insertedFields = [
  'user_id','full_name','profile_photo_url','date_of_birth','gender',
  'phone_number','personal_email','city','whatsapp_number',
  'exam_category','ca_stage','upsc_stage','upsc_optional_subject',
  'target_attempt_year','institution_other','current_prep_stage',
  'exam_branch','exam_branch_other','course_type','target_exam',
  'target_college','other_exam','college_name','branch','degree_type',
  'year_of_admission','graduation_year','current_semester',
  'govt_id_url','student_id_front_url','student_id_back_url','linkedin_url',
  'languages_known','session_durations','pricing','free_intro_session',
  'payout_type','bank_account_number','bank_ifsc','bank_account_holder',
  'upi_id','application_status',
];

// Probe INSERT with full payload to capture exact 400 body
async function probeInsert() {
  const payload = {
    user_id: '00000000-0000-0000-0000-000000000000',
    full_name: '__PROBE__',
    profile_photo_url: null,
    date_of_birth: '2000-01-01',
    gender: 'Male',
    phone_number: '9999999999',
    personal_email: 'probe@test.com',
    city: 'Test',
    whatsapp_number: null,
    exam_category: 'JEE',
    ca_stage: null,
    upsc_stage: null,
    upsc_optional_subject: null,
    target_attempt_year: null,
    institution_other: null,
    current_prep_stage: null,
    exam_branch: 'CSE',
    exam_branch_other: null,
    course_type: null,
    target_exam: null,
    target_college: null,
    other_exam: null,
    college_name: 'Test College',
    branch: 'CSE',
    degree_type: 'B.Tech',
    year_of_admission: 2021,
    graduation_year: 2025,
    current_semester: '7',
    govt_id_url: null,
    student_id_front_url: null,
    student_id_back_url: null,
    linkedin_url: 'https://linkedin.com/in/test',
    languages_known: ['English'],
    session_durations: { '30': true },
    pricing: { '30': 50 },
    free_intro_session: false,
    payout_type: 'UPI',
    bank_account_number: null,
    bank_ifsc: null,
    bank_account_holder: null,
    upi_id: 'test@upi',
    application_status: 'pending',
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/mentors`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(payload),
  });

  const body = await res.text();
  return { status: res.status, body };
}

// Use PostgREST OpenAPI spec to get actual column list
async function fetchColumnsFromOpenAPI() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
    },
  });

  if (!res.ok) {
    console.error('OpenAPI fetch failed:', res.status, await res.text());
    return null;
  }

  const spec = await res.json();
  const mentorsDef = spec?.definitions?.mentors;
  if (!mentorsDef) {
    console.error('No mentors definition in OpenAPI spec');
    console.log('Available definitions:', Object.keys(spec?.definitions || {}));
    return null;
  }
  return mentorsDef.properties;
}

async function main() {
  console.log('='.repeat(60));
  console.log('STEP 1: Probing INSERT to capture exact 400 error body');
  console.log('='.repeat(60));

  const probe = await probeInsert();
  console.log(`HTTP Status: ${probe.status}`);
  console.log(`Raw response body:\n${probe.body}`);

  try {
    const parsed = JSON.parse(probe.body);
    console.log('\nParsed error:');
    console.log('  code:   ', parsed.code);
    console.log('  message:', parsed.message);
    console.log('  details:', parsed.details);
    console.log('  hint:   ', parsed.hint);
  } catch (_) {}

  console.log('\n' + '='.repeat(60));
  console.log('STEP 2: Fetching schema from PostgREST OpenAPI');
  console.log('='.repeat(60));

  const columns = await fetchColumnsFromOpenAPI();
  if (columns) {
    const actualColumnNames = Object.keys(columns);
    console.log(`\nActual columns in mentors table (${actualColumnNames.length} total):`);
    actualColumnNames.forEach(c => {
      const info = columns[c];
      console.log(`  - ${c}  [${info.type ?? info.format ?? 'unknown'}]`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('STEP 3: Column diff — INSERT fields vs. actual DB schema');
    console.log('='.repeat(60));

    const missing = insertedFields.filter(f => !actualColumnNames.includes(f));
    const extra = actualColumnNames.filter(
      c => !insertedFields.includes(c) && !['id','created_at','verified','rating','areas_of_expertise','phone_verified'].includes(c)
    );

    if (missing.length === 0) {
      console.log('\n✅ All inserted fields EXIST in the schema.');
    } else {
      console.log('\n❌ Fields in INSERT that do NOT exist in DB:');
      missing.forEach(f => console.log(`   MISSING: ${f}`));
    }

    if (extra.length > 0) {
      console.log('\nℹ️  DB columns not in INSERT payload:');
      extra.forEach(f => console.log(`   UNUSED: ${f}`));
    }
  }
}

main().catch(console.error);
