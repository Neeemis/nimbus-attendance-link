const postgres = require('postgres');

const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@34.206.177.121/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { 
  ssl: { 
    rejectUnauthorized: false,
    servername: 'ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech'
  } 
});

async function check() {
  try {
    const r = await sql`SELECT count(*) FROM campus_status_logs`;
    console.log('Logs count:', r);
    const s = await sql`SELECT * FROM students LIMIT 1`;
    console.log('Sample student:', s);
    await sql.end();
  } catch (err) {
    console.error('Check failed:', err.message);
    await sql.end();
  }
}

check();
