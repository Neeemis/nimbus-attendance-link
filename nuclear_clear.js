const postgres = require('postgres');
const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

async function clear() {
  try {
    console.log('🚮 NUCLEAR WIPE: Clearing all records...');
    await sql`TRUNCATE TABLE attendance RESTART IDENTITY CASCADE`;
    await sql`TRUNCATE TABLE campus_status_logs RESTART IDENTITY CASCADE`;
    
    // Safety: check if table is empty
    const counts = await sql`SELECT (SELECT count(*) from attendance) as att, (SELECT count(*) from campus_status_logs) as stat`;
    console.log('✅ Counts now:', counts);

    await sql.end();
  } catch (err) {
    console.error('❌ Clearance failed:', err.message);
    await sql.end();
  }
}
clear();
