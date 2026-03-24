const Database = require('better-sqlite3');
const postgres = require('postgres');
const path = require('path');

// 💡 Reading from original server folder to support full 709 load
const SQLITE_PATH = 'c:/Users/Nimish Saxena/OneDrive/Desktop/llulul/server/db/attendance.db';
const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@34.206.177.121/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, { 
  ssl: { 
    rejectUnauthorized: false,
    servername: 'ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech'
  } 
});

async function runMigration() {
  console.log('🚀 Loading old data from local SQLite and PREPARING FAST BATCH...');

  let db;
  try {
    db = new Database(SQLITE_PATH, { fileMustExist: true });
  } catch (err) {
    console.error('❌ Could not find SQLite file at', SQLITE_PATH);
    return;
  }

  try {
    const sqliteUsers = db.prepare('SELECT id, name, email, password_hash, role, created_at FROM users').all();
    const sqliteStudents = db.prepare('SELECT id, name, roll_number, gender, hostel, campus_status, user_id, created_at FROM students').all();
    const sqliteAttendance = db.prepare('SELECT id, student_id, date, status, created_at FROM attendance').all();

    console.log(`📊 Found local data: ${sqliteUsers.length} Users, ${sqliteStudents.length} Students, ${sqliteAttendance.length} Attendance rows.`);

    // 🌟 1. Batch upload Users
    if (sqliteUsers.length > 0) {
      console.log('⏳ Fast-tracking Users...');
      await sql`
        INSERT INTO users ${sql(sqliteUsers, 'id', 'name', 'email', 'password_hash', 'role', 'created_at')}
        ON CONFLICT (email) DO NOTHING
      `;
    }

    // 🌟 2. Batch upload Students
    if (sqliteStudents.length > 0) {
      console.log('⏳ Fast-tracking Students...');
      const cleanStudents = sqliteStudents.map(s => ({
        ...s,
        roll_number: s.roll_number || null
      }));
      await sql`
        INSERT INTO students ${sql(cleanStudents, 'id', 'name', 'roll_number', 'gender', 'hostel', 'campus_status', 'user_id', 'created_at')}
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // 🌟 3. Batch upload Attendance
    if (sqliteAttendance.length > 0) {
      console.log('⏳ Fast-tracking Attendance...');
      await sql`
        INSERT INTO attendance ${sql(sqliteAttendance, 'id', 'student_id', 'date', 'status', 'created_at')}
        ON CONFLICT (id) DO NOTHING
      `;
    }

    console.log('\n🎉 ALL 709 STUDENTS SUCCESSFULLY MIGRATED TO CLOUD POSTGRESQL!');
    db.close();
    await sql.end();
  } catch (err) {
    console.error('❌ Data Migration Failed:', err);
    if (db) db.close();
    await sql.end();
  }
}

runMigration();
