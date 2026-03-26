const postgres = require('postgres');
const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

async function query() {
  try {
    const rows = await sql`SELECT id, student_id, date, status FROM attendance WHERE date = '2026-03-26'`;
    console.log('Attendance on 2026-03-26:', JSON.stringify(rows));
    
    // Check sequence
    const seq = await sql`SELECT last_value, is_called FROM attendance_id_seq`;
    console.log('ID Sequence:', seq);

    await sql.end();
  } catch (err) {
    console.error('Query failed:', err.message);
    await sql.end();
  }
}
query();
