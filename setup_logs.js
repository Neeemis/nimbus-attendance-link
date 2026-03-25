const postgres = require('postgres');

const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@34.206.177.121/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { 
  ssl: { 
    rejectUnauthorized: false,
    servername: 'ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech'
  } 
});

async function setup() {
  console.log('🚀 Setting up Status Logs table...');
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS campus_status_logs (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`ALTER TABLE students ADD COLUMN IF NOT EXISTS campus_status_time TIMESTAMPTZ`;
    console.log('✅ Status Logs setup complete.');
    await sql.end();
  } catch (err) {
    console.error('❌ Error setting up logs:', err);
    await sql.end();
  }
}

setup();
