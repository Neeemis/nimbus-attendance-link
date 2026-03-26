const postgres = require('postgres');
const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@34.206.177.121/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'attendance'
    `;
    console.log('Columns:', tableInfo);

    const constraints = await sql`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE conrelid = 'attendance'::regclass
    `;
    console.log('Constraints:', constraints);

    await sql.end();
  } catch (err) {
    console.error('Check failed:', err.message);
    await sql.end();
  }
}
check();
