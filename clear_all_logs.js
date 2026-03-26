const postgres = require('postgres');
const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

async function clear() {
  try {
    console.log('🚀 Clearing all attendance logs...');
    await sql`TRUNCATE TABLE attendance CASCADE`;
    console.log('✅ Attendance table cleared.');

    console.log('🧹 Clearing duty roaster history...');
    await sql`TRUNCATE TABLE duty_roaster CASCADE`;
    console.log('✅ Duty Roaster history cleared.');

    console.log('🏠 Resetting all students to "Inside" campus status...');
    await sql`UPDATE students SET campus_status = 'in'`;
    console.log('✅ Campus status reset complete.');

  } catch (err) {
    console.error('❌ Clear failed:', err.message);
  } finally {
    await sql.end();
  }
}
clear();
