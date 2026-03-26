const postgres = require('postgres');
const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@34.206.177.121/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

async function clear() {
  try {
    console.log('🚮 Clearing all attendance records...');
    await sql`TRUNCATE TABLE attendance RESTART IDENTITY CASCADE`;
    
    console.log('🚮 Clearing all campus status logs...');
    await sql`TRUNCATE TABLE campus_status_logs RESTART IDENTITY CASCADE`;

    console.log('✨ Data cleared successfully. Start Fresh!');
    await sql.end();
  } catch (err) {
    console.error('❌ Clearance failed:', err.message);
    await sql.end();
  }
}
clear();
