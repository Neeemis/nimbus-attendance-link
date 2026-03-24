const postgres = require('postgres');
const bcrypt = require('bcryptjs');

const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@34.206.177.121/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, { 
  ssl: { 
    rejectUnauthorized: false, 
    servername: 'ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech' 
  } 
});

async function resetPasswords() {
  console.log('🚀 Resetting all user passwords to "nimbus123"...');

  try {
    const hash = await bcrypt.hash('nimbus123', 10);
    
    // Update all users
    const result = await sql`UPDATE users SET password_hash = ${hash}`;
    
    console.log(`\n🎉 SUCCESS! All user passwords updated inside Cloud with total rows affected.`);
    await sql.end();
  } catch (err) {
    console.error('❌ Reset Failed:', err);
    await sql.end();
  }
}

resetPasswords();
