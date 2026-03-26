const postgres = require('postgres');

const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@34.206.177.121/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { 
  ssl: { rejectUnauthorized: false } 
});

async function setup() {
  try {
    console.log('🛠️ Adding UNIQUE constraint to attendance table (student_id, date)...');
    await sql`ALTER TABLE attendance ADD CONSTRAINT unique_attendance_date UNIQUE (student_id, date)`;
    console.log('✅ Constraint added successfully.');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('ℹ️ Constraint already exists.');
    } else {
      console.error('❌ Setup failed:', err.message);
    }
  } finally {
    await sql.end();
  }
}

setup();
