const postgres = require('postgres');
const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    const users = await sql`SELECT id, email, name, role FROM users`;
    console.log('--- USERS ---');
    console.table(users);

    const email = 'discipline@nimbus.com';
    const disciplineUser = users.find(u => u.email === email);
    if (disciplineUser) {
      const studentCount = await sql`SELECT count(*) FROM students WHERE user_id = ${disciplineUser.id}`;
      console.log(`Discipline User (${disciplineUser.email}, ID: ${disciplineUser.id}) has ${studentCount[0].count} students.`);
    } else {
      console.log(`User with email ${email} not found.`);
    }

    const femaleCount = await sql`SELECT count(*) FROM students WHERE gender ILIKE 'female'`;
    console.log(`There are ${femaleCount[0].count} female students in total.`);

  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    await sql.end();
  }
}
check();
