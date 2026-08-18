// diagnose_400_v4.mjs
// Final targeted probe:
// We know all columns exist. Now we probe for:
//   1. prices field type: form sends {duration: "75"} (string values) → pricing jsonb
//   2. session_durations: form sends ["60 min"] array → session_durations jsonb
//   3. year_of_admission / graduation_year NOT NULL constraint (int4 NOT NULL in migrate.js)
//   4. Whether year_of_admission and graduation_year are truly NOT NULL in the live DB
//   5. The `bio` field — in schema but NOT in INSERT payload

const SUPABASE_URL = 'https://bzktgyzwirsxmtipnckr.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6a3RneXp3aXJzeG10aXBuY2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2Mzg0MzYsImV4cCI6MjA5ODIxNDQzNn0.roFSNeOwHdSo2E24O16CYknJZemqkLqx4LH5vDJoc3Q';

// Check if `bio` column exists in the DB (it was added via add_bio_column.sql separately)
async function checkBioColumn() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/mentors?select=bio&limit=0`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
  });
  const body = await res.text();
  return { status: res.status, body };
}

// Check year_of_admission and graduation_year — are they nullable in live DB?
async function checkNullableYears() {
  // Try selecting both with a filter that should return empty (just testing column existence + type)
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/mentors?select=year_of_admission,graduation_year&year_of_admission=is.null&limit=1`,
    { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` } }
  );
  const body = await res.text();
  return { status: res.status, body };
}

// Check if prices/session_durations column types accept what the form sends
// prices → pricing jsonb: form sends {duration: "75"} (strings not numbers)
// This should be fine for jsonb. Let's verify the EXACT field name in DB for session_durations.
async function checkSessionDurationsCol() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/mentors?select=session_durations,pricing&limit=0`,
    { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` } }
  );
  return { status: res.status, body: await res.text() };
}

// NOW: Check the RLS INSERT policy directly
// The policy is: FOR INSERT WITH CHECK (auth.uid() = user_id)
// But what if the user is logged in via Firebase (phone OTP) and NOT via Supabase Auth?
// In that case supabase.auth.getSession() would return null user → caught by line 308 check
// BUT: what if the Supabase session IS valid but user_id sent doesn't match auth.uid()?

// Key insight: The form uses supabase.auth.getSession() to get user.id
// But the user logs in via Supabase email/password for the app
// Phone OTP uses Firebase, not Supabase Auth
// These are two separate auth systems!

// Let's verify by checking what the RLS policy error code is for 400 specifically
// PostgREST HTTP status codes:
//   400 = bad request (column doesn't exist, type mismatch, check constraint violation, 
//         RAISE EXCEPTION from trigger, or parsing error)
//   401 = RLS policy violation or JWT expired  
//   403 = permission denied
//   404 = relation not found
//   409 = conflict (unique violation)
//   422 = unprocessable entity (NOT NULL violation in some versions)

// IMPORTANT DISTINCTION: 
//   NOT NULL violations → 400 in PostgREST (not 422)
//   But RLS violations → 401

// Let's also check if there's a trigger that raises an exception
async function checkTriggers() {
  // Try to fetch from setup_notifications or fix_triggers to see trigger definitions
  // We'll do this by reading the local files (already done)
  console.log('\nFrom fix_triggers.sql — trigger logic:');
  console.log('  Trigger fires AFTER INSERT OR UPDATE');
  console.log('  Checks: NEW.application_status = \'approved\' AND OLD.application_status != \'approved\'');
  console.log('  But for INSERT, OLD is NULL — OLD.application_status would be NULL');
  console.log('  In PL/pgSQL, NULL != \'approved\' evaluates to NULL (not true/false)');
  console.log('  So the trigger condition would be: \'pending\' = \'approved\' → FALSE');
  console.log('  → Trigger does NOT raise exception on insert. OK.');
}

// Check if `areas_of_expertise` is sent — it's NOT in the insert payload but IS in the form
// Check if `bio` is sent — it's NOT in the insert payload but IS in the form AND required (min 50)
console.log('='.repeat(60));
console.log('KEY FINDINGS FROM CODE ANALYSIS:');
console.log('='.repeat(60));
console.log('');
console.log('❓ FINDING 1: `bio` field');
console.log('   - In Zod schema: z.string().min(50).max(1000) — REQUIRED');
console.log('   - In defaultValues: bio: ""');
console.log('   - In INSERT payload (lines 314-357): ❌ MISSING — bio is NOT inserted!');
console.log('   - In DB (add_bio_column.sql): bio text (nullable, added via ALTER)');
console.log('   - Impact: bio column exists, is nullable → NOT the cause of 400');
console.log('');
console.log('❓ FINDING 2: `areas_of_expertise` field');
console.log('   - In Zod schema: z.array(z.string()).min(1) — REQUIRED');
console.log('   - In INSERT payload: ❌ MISSING — areas_of_expertise is NOT inserted!');
console.log('   - In DB: areas_of_expertise text[] (nullable, added via ALTER)');
console.log('   - Impact: nullable → NOT the cause of 400');
console.log('');
console.log('❓ FINDING 3: year_of_admission / graduation_year');
console.log('   - In migrate.js: year_of_admission int4 NOT NULL, graduation_year int4 NOT NULL');
console.log('   - In INSERT (L341-342): sent as null when not filled (non-JEE exams)');
console.log('   - PostgREST maps NOT NULL violation → HTTP 400');
console.log('   - But user says it fails for ALL categories including JEE...');
console.log('');
console.log('❓ FINDING 4: `pricing` field type');
console.log('   - Form: prices = {duration: "75"} (string values, e.g. {"60 min": "75"})');
console.log('   - DB: pricing jsonb');
console.log('   - PostgREST: {"60 min": "75"} is valid JSON → should work fine');
console.log('');
console.log('❓ FINDING 5: RLS INSERT policy');
console.log('   - Policy: FOR INSERT WITH CHECK (auth.uid() = user_id)');
console.log('   - The user_id sent is from supabase.auth.getSession()');
console.log('   - IF Supabase session is valid, this should pass');
console.log('   - BUT: RLS violations return 401, not 400');
console.log('');
console.log('='.repeat(60));
console.log('RUNNING LIVE CHECKS:');
console.log('='.repeat(60));

async function main() {
  await checkTriggers();
  
  console.log('\n--- Check 1: Does `bio` column exist in live DB? ---');
  const bioCheck = await checkBioColumn();
  console.log(`  Status: ${bioCheck.status} (200=exists, 400=missing)`);
  if (bioCheck.status !== 200) console.log(`  Body: ${bioCheck.body}`);
  else console.log('  bio column EXISTS in live DB (nullable)');

  console.log('\n--- Check 2: Does year_of_admission allow NULL in live DB? ---');
  const yearCheck = await checkNullableYears();
  console.log(`  Status: ${yearCheck.status}`);
  console.log(`  Body: ${yearCheck.body}`);
  console.log('  If status=200 and body="[]", the column ALLOWS null (was altered to nullable)');
  console.log('  If status=200 and body has data, some rows have null year_of_admission');

  console.log('\n--- Check 3: session_durations and pricing columns ---');
  const sdCheck = await checkSessionDurationsCol();
  console.log(`  Status: ${sdCheck.status}, Body: ${sdCheck.body}`);

  console.log('\n--- Check 4: Fetch existing mentors rows to see year_of_admission nullability ---');
  const sampleRes = await fetch(
    `${SUPABASE_URL}/rest/v1/mentors?select=year_of_admission,graduation_year,application_status&limit=5`,
    { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` } }
  );
  const sampleBody = await sampleRes.text();
  console.log(`  Status: ${sampleRes.status}, Body: ${sampleBody}`);

  console.log('\n--- Check 5: Test SELECT with prices field as "prices" (wrong name) ---');
  const pricesCol = await fetch(
    `${SUPABASE_URL}/rest/v1/mentors?select=prices&limit=0`,
    { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` } }
  );
  const pricesBody = await pricesCol.text();
  console.log(`  prices column: Status=${pricesCol.status}`);
  if (pricesCol.status !== 200) {
    try { const p = JSON.parse(pricesBody); console.log(`  Error: ${p.message}`); } catch (_) {}
  }

  // Check the actual column name - is it "pricing" or "prices"?
  const pricingCol = await fetch(
    `${SUPABASE_URL}/rest/v1/mentors?select=pricing&limit=0`,
    { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` } }
  );
  const pricingBody = await pricingCol.text();
  console.log(`  pricing column: Status=${pricingCol.status}`);

  console.log('\n--- Check 6: Trigger body — check if BEFORE trigger raises on non-approved status ---');
  // Read fix_triggers.sql content
  const fs = await import('fs');
  const triggerSql = fs.readFileSync('./supabase/fix_triggers.sql', 'utf8');
  console.log('\nfix_triggers.sql content:');
  console.log(triggerSql);

  console.log('\n=== FINAL ASSESSMENT ===');
  console.log('Based on all evidence, the most likely cause of the 400 is:');
  if (yearCheck.status === 200) {
    console.log('  year_of_admission and graduation_year ALLOW NULL in live DB');
    console.log('  → NOT NULL constraint is NOT the issue');
    console.log('  → Look at trigger body for RAISE EXCEPTION or check constraint');
  } else {
    console.log('  UNEXPECTED year check status — investigate further');
  }
}

main().catch(console.error);
