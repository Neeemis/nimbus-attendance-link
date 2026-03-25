const postgres = require('postgres');

const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@34.206.177.121/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { 
  ssl: { 
    rejectUnauthorized: false,
    servername: 'ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech'
  } 
});

async function runBulkNormalization() {
  console.log('🚀 Final fix...');
  try {
    // Correct Neelkant
    await sql`UPDATE students SET hostel = 'Neelkanth Boys Hostel' WHERE hostel ILIKE '%neelkant%' AND hostel != 'Neelkanth Boys Hostel'`;
    // Standardize Case (Trim whitespace)
    await sql`UPDATE students SET hostel = TRIM(hostel)`;
    
    console.log('\n🎉 FINAL CLEANUP COMPLETE!\n');
    
    const final = await sql`SELECT DISTINCT hostel FROM students ORDER BY hostel`;
    console.log('Final Unique Hostels:');
    final.forEach(h => console.log(`- "${h.hostel}"`));
    
    await sql.end();
  } catch (err) {
    console.error('❌ Bulk normalization failed:', err);
    await sql.end();
  }
}

runBulkNormalization();
