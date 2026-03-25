const postgres = require('postgres');

const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@34.206.177.121/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { 
  ssl: { 
    rejectUnauthorized: false,
    servername: 'ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech'
  } 
});

async function fix() {
  console.log('🚀 Fixing gender casing...');
  try {
    await sql`UPDATE students SET gender = 'Female' WHERE gender = 'female'`;
    await sql`UPDATE students SET gender = 'Male' WHERE gender = 'male'`;
    console.log('✅ Casing fixed.');
    await sql.end();
  } catch (err) {
    console.error('❌ Error fixing gender casing:', err);
    await sql.end();
  }
}

fix();
