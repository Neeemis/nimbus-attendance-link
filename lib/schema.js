import sql from './db';

let initialized = false;

export async function ensureExtensionSchema() {
  if (initialized) return;
  try {
    await sql`
      ALTER TABLE students 
      ADD COLUMN IF NOT EXISTS extension_cancelled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS extension_cancelled_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS extension_cancelled_by VARCHAR(100),
      ADD COLUMN IF NOT EXISTS extension_cancelled_reason TEXT;
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS extension_logs (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        action VARCHAR(20) NOT NULL,
        performed_by VARCHAR(100),
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    initialized = true;
  } catch (err) {
    console.warn('ensureExtensionSchema warning:', err.message);
  }
}
