const postgres = require('postgres');

const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@34.206.177.121/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { 
  ssl: { 
    rejectUnauthorized: false,
    servername: 'ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech'
  } 
});

async function updateRoles() {
  console.log('🚀 Updating roles for strict admin separation...');
  try {
    // 1. Change discipline@nimbus.com to 'user' role
    await sql`UPDATE users SET role = 'user' WHERE email = 'discipline@nimbus.com'`;
    console.log('✅ Discipline Officer role changed to "user".');
    await sql.end();
  } catch (err) {
    console.error('❌ Error updating roles:', err);
    await sql.end();
  }
}

updateRoles();
