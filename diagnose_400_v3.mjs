// diagnose_400_v3.mjs
// Strategy: Focus on NOT NULL constraints vs. what BecomeMentor might send
// The SELECT 200 proves all columns exist.
// Now we check:
//  1. Which columns are NOT NULL in the original migrate.js schema
//  2. What values the form actually sends for those fields for non-JEE exams
//  3. Test INSERT with NEET/CAT/etc. where college_name/branch/degree_type might be empty

const SUPABASE_URL = 'https://bzktgyzwirsxmtipnckr.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6a3RneXp3aXJzeG10aXBuY2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2Mzg0MzYsImV4cCI6MjA5ODIxNDQzNn0.roFSNeOwHdSo2E24O16CYknJZemqkLqx4LH5vDJoc3Q';

async function tryInsert(label, payload) {
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
  let parsed = null;
  try { parsed = JSON.parse(body); } catch (_) {}
  return { label, status: res.status, body, parsed };
}

// From migrate.js — columns declared NOT NULL:
// full_name NOT NULL
// date_of_birth NOT NULL
// phone_number NOT NULL
// personal_email NOT NULL
// city NOT NULL
// college_name NOT NULL  <-- KEY: form sends "" for non-JEE exams!
// branch NOT NULL        <-- KEY: form sends "" for non-JEE exams!
// degree_type NOT NULL   <-- KEY: form sends "" for non-JEE exams!
// year_of_admission NOT NULL (int4)  <-- KEY: form sends null for non-JEE!
// graduation_year NOT NULL (int4)    <-- KEY: form sends null for non-JEE!
// linkedin_url NOT NULL  <-- might not fill for some exam types

const basePayload = {
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
  session_durations: { '60': true },
  pricing: { '60': 75 },
  free_intro_session: true,
  payout_type: 'UPI',
  bank_account_number: null,
  bank_ifsc: null,
  bank_account_holder: null,
  upi_id: 'riyasah@oksbi',
  application_status: 'pending',
};

async function main() {
  console.log('From migrate.js, these columns are NOT NULL:');
  console.log('  full_name, date_of_birth, phone_number, personal_email, city');
  console.log('  college_name, branch, degree_type');
  console.log('  year_of_admission (int4), graduation_year (int4), linkedin_url\n');
  
  console.log('In BecomeMentor.tsx onSubmit (L332-342):');
  console.log('  college_name: data.college || ""    <-- empty string for non-JEE');
  console.log('  branch: data.branch || ""           <-- empty string for non-JEE');
  console.log('  degree_type: data.degreeType || ""  <-- empty string for non-JEE');
  console.log('  year_of_admission: data.admissionYear ? parseInt(...) : null  <-- NULL for non-JEE');
  console.log('  graduation_year: data.gradYear ? parseInt(...) : null          <-- NULL for non-JEE');
  console.log();

  // Test 1: JEE payload (should fail with RLS, not a schema error)
  const t1 = await tryInsert('JEE full payload (should fail with RLS 401)', { ...basePayload });
  console.log(`[${t1.label}]`);
  console.log(`  Status: ${t1.status}`);
  if (t1.parsed) {
    console.log(`  code: ${t1.parsed.code}, message: ${t1.parsed.message}`);
  }

  // Test 2: NEET-like payload — college_name="", branch="", year_of_admission=null, graduation_year=null
  const t2 = await tryInsert('NEET payload (empty college/branch, null years)', {
    ...basePayload,
    exam_category: 'NEET',
    college_name: '',  // what the form sends for non-JEE!
    branch: '',
    degree_type: '',
    year_of_admission: null,  // null because admissionYear not filled!
    graduation_year: null,
  });
  console.log(`\n[${t2.label}]`);
  console.log(`  Status: ${t2.status}`);
  if (t2.parsed) {
    console.log(`  code:    ${t2.parsed.code}`);
    console.log(`  message: ${t2.parsed.message}`);
    console.log(`  details: ${t2.parsed.details}`);
    console.log(`  hint:    ${t2.parsed.hint}`);
  } else {
    console.log(`  body: ${t2.body}`);
  }

  // Test 3: Like NEET but with year_of_admission=0 to see if int4 NOT NULL allows 0
  const t3 = await tryInsert('NEET payload (year_of_admission=0 instead of null)', {
    ...basePayload,
    exam_category: 'NEET',
    college_name: '',
    branch: '',
    degree_type: '',
    year_of_admission: 0,
    graduation_year: 0,
  });
  console.log(`\n[${t3.label}]`);
  console.log(`  Status: ${t3.status}`);
  if (t3.parsed) {
    console.log(`  code:    ${t3.parsed.code}`);
    console.log(`  message: ${t3.parsed.message}`);
    console.log(`  details: ${t3.parsed.details}`);
    console.log(`  hint:    ${t3.parsed.hint}`);
  }

  // Test 4: CAT payload (no college, no branch)
  const t4 = await tryInsert('CAT payload (college_name empty, linkedin_url empty)', {
    ...basePayload,
    exam_category: 'CAT',
    college_name: '',
    branch: '',
    degree_type: '',
    year_of_admission: null,
    graduation_year: null,
    linkedin_url: '',  // user may skip this
  });
  console.log(`\n[${t4.label}]`);
  console.log(`  Status: ${t4.status}`);
  if (t4.parsed) {
    console.log(`  code:    ${t4.parsed.code}`);
    console.log(`  message: ${t4.parsed.message}`);
    console.log(`  details: ${t4.parsed.details}`);
    console.log(`  hint:    ${t4.parsed.hint}`);
  }

  // Test 5: Exact screenshot payload — free_intro_session=true, payout_type=UPI, upi_id=riyasah@oksbi
  // This mirrors what we see in the screenshot
  const t5 = await tryInsert('Exact screenshot-like payload (NEET/any non-JEE)', {
    ...basePayload,
    exam_category: 'NEET',
    college_name: '',
    branch: '',
    degree_type: '',
    year_of_admission: null,
    graduation_year: null,
    free_intro_session: true,
    upi_id: 'riyasah@oksbi',
    application_status: 'pending',
  });
  console.log(`\n[${t5.label}]`);
  console.log(`  Status: ${t5.status}`);
  if (t5.parsed) {
    console.log(`  code:    ${t5.parsed.code}`);
    console.log(`  message: ${t5.parsed.message}`);
    console.log(`  details: ${t5.parsed.details}`);
    console.log(`  hint:    ${t5.parsed.hint}`);
  }

  console.log('\n--- SUMMARY ---');
  const tests = [t1, t2, t3, t4, t5];
  tests.forEach(t => {
    const code = t.parsed?.code ?? 'N/A';
    console.log(`  [${t.status}] ${t.label} => code: ${code}, msg: ${t.parsed?.message?.substring(0,80) ?? t.body?.substring(0,80)}`);
  });
}

main().catch(console.error);
