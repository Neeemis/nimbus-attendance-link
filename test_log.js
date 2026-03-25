const postgres = require('postgres');

const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@34.206.177.121/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { 
  ssl: { 
    rejectUnauthorized: false,
    servername: 'ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech'
  } 
});

async function run() {
  try {
    const [st] = await sql`SELECT id, name FROM students LIMIT 1`;
    if (st) {
      console.log(`🚀 Toggling status for ${st.name}...`);
      const now = new Date();
      await sql.begin(async (tx) => {
        await tx`UPDATE students SET campus_status='out', campus_status_time=${now} WHERE id=${st.id}`;
        await tx`INSERT INTO campus_status_logs (student_id, action, timestamp) VALUES (${st.id}, 'out', ${now})`;
      });
      console.log('✅ Log generated.');
    } else {
      console.log('❌ No students found.');
    }
  } catch (err) {
    console.error('❌ Error test log:', err.message);
  } finally {
    await sql.end();
  }
}

run();
