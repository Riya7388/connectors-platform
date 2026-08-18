import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres:Riy%40ryan3091@[2406:da18:e5c:b701:bc9e:393a:3d40:dc96]:5432/postgres';

async function fetchPolicies() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected");
    const res = await client.query(`
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename IN ('booking_requests', 'chat_messages');
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

fetchPolicies();
