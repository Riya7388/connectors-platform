import pkg from 'pg';
const { Client } = pkg;

const client = new Client({ 
  connectionString: 'postgresql://postgres:Riy%40ryan3091@[2406:da18:e5c:b701:bc9e:393a:3d40:dc96]:5432/postgres' 
});

async function main() {
  await client.connect();
  console.log('Connected to live Postgres DB\n');

  // 1. Get ALL constraints on mentors table
  const constraints = await client.query(`
    SELECT 
      c.conname AS constraint_name,
      c.contype AS type,
      pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'mentors'
    ORDER BY c.contype, c.conname;
  `);
  console.log('=== MENTORS TABLE CONSTRAINTS ===');
  constraints.rows.forEach(r => 
    console.log(`  [${r.type}] ${r.constraint_name}: ${r.definition}`)
  );
  // contype: p=PRIMARY KEY, u=UNIQUE, f=FOREIGN KEY, c=CHECK, n=NOT NULL trigger

  // 2. Get ALL columns with nullable info
  const columns = await client.query(`
    SELECT column_name, is_nullable, data_type, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='mentors'
    ORDER BY ordinal_position;
  `);
  console.log('\n=== MENTORS TABLE COLUMNS (LIVE) ===');
  columns.rows.forEach(r => 
    console.log(`  ${r.column_name.padEnd(30)} ${r.data_type.padEnd(22)} nullable:${r.is_nullable.padEnd(4)} default:${r.column_default ?? 'none'}`)
  );
  
  // 3. Check for any indexes (including unique indexes)
  const indexes = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'mentors'
    ORDER BY indexname;
  `);
  console.log('\n=== MENTORS TABLE INDEXES ===');
  indexes.rows.forEach(r => console.log(`  ${r.indexname}: ${r.indexdef}`));
  
  // 4. Check for triggers on mentors
  const triggers = await client.query(`
    SELECT trigger_name, event_manipulation, action_timing, action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'mentors'
    ORDER BY trigger_name;
  `);
  console.log('\n=== MENTORS TABLE TRIGGERS ===');
  triggers.rows.forEach(r => 
    console.log(`  ${r.trigger_name} [${r.action_timing} ${r.event_manipulation}]: ${r.action_statement}`)
  );
  
  // 5. Check if there are any NOT NULL columns that code sends NULL for
  const notNullCols = columns.rows.filter(r => r.is_nullable === 'NO');
  console.log('\n=== NOT NULL COLUMNS ===');
  notNullCols.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));
  
  await client.end();
}

main().catch(e => { console.error('ERROR:', e.message); client.end(); });
