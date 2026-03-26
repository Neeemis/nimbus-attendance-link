import sql from './lib/db.js';
async function run() {
  const u = await sql`SELECT id, email FROM users WHERE email LIKE '%discipline%'`;
  console.log('Discipline Users:', u);
  if (u.length > 0) {
    const s = await sql`SELECT count(*) FROM students WHERE user_id = ${u[0].id}`;
    if (s[0].count === '0') {
      console.log('No students found for discipline user. Checking unassigned or grouping...');
      // Check if there are students in a group called 'Discipline'
      const dg = await sql`SELECT count(*) FROM students WHERE name ILIKE '%discipline%' OR roll_number ILIKE '%disc%'`;
      console.log('Students matching DISCIPLINE keyword:', dg[0].count);
      
      // If we need to assign EVERY student for duty picking, we can do that too
      // But let's check who THEY are.
    } else {
      console.log('Students already assigned: ', s[0].count);
    }
  }
  process.exit(0);
}
run();
