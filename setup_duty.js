const postgres = require('postgres');
const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

async function setup() {
  try {
    console.log('🏗️ Creating duty_roaster table...');
    await sql`
      CREATE TABLE IF NOT EXISTS duty_roaster (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, date)
      )
    `;
    console.log('✅ Duty Roaster table created successfully.');
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
  } finally {
    await sql.end();
  }
}
setup();
