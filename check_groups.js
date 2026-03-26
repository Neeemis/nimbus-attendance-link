import sql from './lib/db.js';
async function run() {
  const groups = await sql`SELECT DISTINCT group_name FROM students`;
  console.log('Unique Groups:', groups);
  
  const discCount = await sql`SELECT count(*) FROM students WHERE group_name ILIKE '%discipline%'`;
  console.log('Students in [Discipline] group:', discCount[0].count);
  
  const dUser = await sql`SELECT id, email FROM users WHERE email LIKE '%discipline%'`;
  console.log('Discipline Users:', dUser);
  
  process.exit(0);
}
run();
