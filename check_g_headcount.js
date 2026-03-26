const postgres = require('postgres');
const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    const students = await sql`SELECT count(*) FROM students`;
    const girls = await sql`SELECT count(*) FROM students WHERE gender ILIKE 'female' OR hostel ILIKE '%Ambika%' OR hostel ILIKE '%Satpura%' OR hostel ILIKE '%Parvati%'`;
    console.log(`Total students: ${students[0].count}`);
    console.log(`Girls identifyable by gender/hostel: ${girls[0].count}`);

  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await sql.end();
  }
}
check();
