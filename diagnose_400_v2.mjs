// diagnose_400_v2.mjs
// Strategy:
//  1. Use `select` with all field names to trigger PostgREST column validation errors
//  2. Try INSERT with fields one-by-one removed to isolate the bad one
//  3. Use information_schema via a SELECT query that PostgREST can relay

const SUPABASE_URL = 'https://bzktgyzwirsxmtipnckr.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6a3RneXp3aXJzeG10aXBuY2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2Mzg0MzYsImV4cCI6MjA5ODIxNDQzNn0.roFSNeOwHdSo2E24O16CYknJZemqkLqx4LH5vDJoc3Q';

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

// ── Strategy 1: SELECT with all columns listed — PostgREST returns 400 for unknown columns ──
async function checkSelectColumns() {
  const allFields = insertedFields.join(',');
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/mentors?select=${allFields}&limit=0`,
    {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
      },
    }
  );
  const body = await res.text();
  return { status: res.status, body };
}

// ── Strategy 2: SELECT each field individually to find the bad ones ──
async function checkEachField() {
  const results = [];
  for (const field of insertedFields) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/mentors?select=${field}&limit=0`,
      {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
        },
      }
    );
    const status = res.status;
    // 200 = column exists (even if RLS filters all rows)
    // 400 = column does not exist
    if (status !== 200) {
      const body = await res.text();
      results.push({ field, status, body });
    } else {
      results.push({ field, status, body: 'OK' });
    }
  }
  return results;
}

// ── Strategy 3: Fetch actual column list by selecting from information_schema via REST ──
async function fetchSchemaViaRest() {
  // PostgREST exposes information_schema views if they're in the schema path
  // Try selecting from information_schema.columns directly
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/get_mentors_columns`,
    {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    }
  );
  const body = await res.text();
  return { status: res.status, body };
}

async function main() {
  console.log('='.repeat(60));
  console.log('STEP 1: SELECT with ALL inserted field names at once');
  console.log('='.repeat(60));
  const selectAll = await checkSelectColumns();
  console.log(`Status: ${selectAll.status}`);
  console.log(`Body: ${selectAll.body}`);

  console.log('\n' + '='.repeat(60));
  console.log('STEP 2: SELECT each field individually (finds missing columns)');
  console.log('='.repeat(60));
  const fieldResults = await checkEachField();
  
  const badFields = fieldResults.filter(r => r.status !== 200);
  const goodFields = fieldResults.filter(r => r.status === 200);

  console.log(`\n✅ Fields that EXIST in DB (${goodFields.length}):`);
  goodFields.forEach(r => console.log(`   OK [${r.status}]: ${r.field}`));

  if (badFields.length > 0) {
    console.log(`\n❌ Fields that FAILED (${badFields.length}) — these do NOT exist or cause errors:`);
    badFields.forEach(r => {
      console.log(`\n   FAILED [${r.status}]: ${r.field}`);
      try {
        const p = JSON.parse(r.body);
        console.log(`   Error code: ${p.code}`);
        console.log(`   Message:    ${p.message}`);
        console.log(`   Details:    ${p.details}`);
        console.log(`   Hint:       ${p.hint}`);
      } catch (_) {
        console.log(`   Body: ${r.body}`);
      }
    });
  } else {
    console.log('\n✅ All fields exist in the schema — the 400 must be from something else (type mismatch, constraint, RLS).');
  }

  console.log('\n' + '='.repeat(60));
  console.log('STEP 3: Check for RPC function get_mentors_columns');
  console.log('='.repeat(60));
  const schemaRpc = await fetchSchemaViaRest();
  console.log(`Status: ${schemaRpc.status}`);
  console.log(`Body: ${schemaRpc.body}`);
}

main().catch(console.error);
