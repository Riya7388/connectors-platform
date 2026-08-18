import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres:Riy%40ryan3091@db.bzktgyzwirsxmtipnckr.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'mentors';
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await client.end();
  }
}
run();
