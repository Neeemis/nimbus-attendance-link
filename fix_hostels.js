const postgres = require('postgres');

const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@34.206.177.121/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { 
  ssl: { 
    rejectUnauthorized: false,
    servername: 'ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech'
  } 
});

async function fix() {
  console.log('🚀 Assigning Manimahesh Hostel to new students...');
  try {
    await sql`UPDATE students SET hostel = 'Manimahesh Hostel' WHERE roll_number LIKE '25%' AND (hostel IS NULL OR hostel = '')`;
    console.log('✅ Hostels assigned.');
    await sql.end();
  } catch (err) {
    console.error('❌ Error assigning hostels:', err);
    await sql.end();
  }
}

fix();
