const postgres = require('postgres');
const bcrypt = require('bcryptjs');

// 💡 Inserted by AI for setup triggers
const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

async function main() {
  console.log('🚀 Connecting & creating cloud tables...');

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Users table ready');

    await sql`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        roll_number VARCHAR(20),
        gender VARCHAR(10),
        hostel VARCHAR(100),
        campus_status VARCHAR(5) DEFAULT 'in',
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Students table ready');

    await sql`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        status VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, date)
      )
    `;
    console.log('✅ Attendance table ready');

    const [checkAdmin] = await sql`SELECT id FROM users WHERE email = 'admin@nimbus.com'`;
    if (!checkAdmin) {
      const hash = await bcrypt.hash('admin123', 10);
      await sql`
        INSERT INTO users (name, email, password_hash, role)
        VALUES ('System Administrator', 'admin@nimbus.com', ${hash}, 'admin')
      `;
      console.log('✅ Admin user added: admin@nimbus.com / admin123');
    }

    console.log('\n🎉 CLOUD DATABASE IS READY TO USE!');
    await sql.end();
  } catch (err) {
    console.error('❌ Error building tables:', err);
    await sql.end();
  }
}

main();
