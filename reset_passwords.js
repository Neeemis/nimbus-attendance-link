const postgres = require('postgres');
const bcrypt = require('bcryptjs');

const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@34.206.177.121/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { 
  ssl: { 
    rejectUnauthorized: false,
    servername: 'ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech'
  } 
});

async function reset() {
  try {
    const users = await sql`SELECT id, email, name FROM users`;
    console.log(`🚀 Resetting passwords for ${users.length} users...`);

    for (const user of users) {
      const username = user.email.split('@')[0].toLowerCase();
      const newPassword = `${username}123`;
      const hash = await bcrypt.hash(newPassword, 10);
      
      await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${user.id}`;
      console.log(`✅ Set password for ${user.email} to: ${newPassword}`);
    }

    console.log('✨ All passwords reset successfully.');
    await sql.end();
  } catch (err) {
    console.error('❌ Reset failed:', err.message);
    await sql.end();
  }
}

reset();
