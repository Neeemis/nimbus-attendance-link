const postgres = require('postgres');

const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@34.206.177.121/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { 
  ssl: { 
    rejectUnauthorized: false,
    servername: 'ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech'
  } 
});

async function check() {
  const result = await sql`SELECT DISTINCT hostel FROM students ORDER BY hostel`;
  console.log('--- DB STATE ---');
  result.forEach(h => console.log(`[${h.hostel}]`));
  await sql.end();
}

check();
