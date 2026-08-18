import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bzktgyzwirsxmtipnckr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6a3RneXp3aXJzeG10aXBuY2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2Mzg0MzYsImV4cCI6MjA5ODIxNDQzNn0.roFSNeOwHdSo2E24O16CYknJZemqkLqx4LH5vDJoc3Q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRls() {
  const { data, error } = await supabase
    .from('mentors')
    .select('id, full_name, application_status, verified');
  
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log("Found", data.length, "mentors");
  const pending = data.filter(m => m.application_status !== 'approved' || !m.verified);
  console.log("Pending/unverified mentors accessible via anon key:", pending);
}

testRls();
