const postgres = require('postgres');
const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    const genders = await sql`SELECT DISTINCT gender FROM students`;
    console.log('--- Genders in DB ---');
    console.log(genders);

  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await sql.end();
  }
}
check();
