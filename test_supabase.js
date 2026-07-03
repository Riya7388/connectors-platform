import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("Testing Supabase connection...");
  const { data, error } = await supabase.from('mentors').select('*').limit(1);
  if (error) {
    console.error("Connection failed or table mismatch:", error.message);
  } else {
    console.log("Connection successful! Table 'mentors' exists and is queryable.");
    console.log("Data:", data);
  }
}

testConnection();
