const postgres = require('postgres');
const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

async function find() {
  try {
    const users = await sql`SELECT email, role, name FROM users WHERE name LIKE 'Faculty View%'`;
    console.log(users);
  } catch (err) {
    console.error(err);
  } finally {
    await sql.end();
  }
}
find();
