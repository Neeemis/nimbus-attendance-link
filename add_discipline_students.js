const postgres = require('postgres');

const DATABASE_URL = 'postgresql://neondb_owner:npg_EKVpFvy4e3mN@34.206.177.121/neondb?sslmode=require';
const sql = postgres(DATABASE_URL, { 
  ssl: { 
    rejectUnauthorized: false,
    servername: 'ep-noisy-river-amuot4pt-pooler.c-5.us-east-1.aws.neon.tech'
  } 
});

async function addStudents() {
  console.log('🚀 Starting Student Import...');
  try {
    // 1. Get Discipline Officer User ID
    const [user] = await sql`SELECT id FROM users WHERE email = 'discipline@nimbus.com'`;
    if (!user) throw new Error('Discipline user not found.');
    const disciplineUserId = user.id;

    // 2. Data from images
    const studentsToInsert = [
      // Image 1
      { name: 'Priti Priya', roll: '24MMB031', gender: 'female' },
      { name: 'Muskaan Chaudhary', roll: '22BME066', gender: 'female' },
      { name: 'Anjali Chaudhary', roll: '22BME021', gender: 'female' },
      { name: 'Ansh Sahore', roll: '22BCE012', gender: 'male' },
      { name: 'Ayush Srivastava', roll: '22BCE122', gender: 'male' },
      { name: 'Priyanshu Chaudhary', roll: '23BME076', gender: 'male' },
      { name: 'Kajal Katnoria', roll: '23BCS044', gender: 'female' },
      { name: 'Piyush', roll: '23BCE071', gender: 'male' },
      { name: 'Abhay Negi', roll: '23DEC001', gender: 'male' },
      { name: 'Surya Chaudhary', roll: '23BCE106', gender: 'male' },
      { name: 'Inika Aggarwal', roll: '23BCE043', gender: 'female' },
      // Image 2
      { name: 'Mohit Thakur', roll: '24BCH031', gender: 'male' },
      { name: 'Kartik Parwari', roll: '24BEE053', gender: 'male' },
      { name: 'Vivek Kumar', roll: '24BCE087', gender: 'male' },
      { name: 'Rahul Kumar', roll: '24BMS019', gender: 'male' },
      { name: 'Laraib', roll: '24DEC011', gender: 'male' },
      { name: 'Vikram Negi', roll: '24BEE108', gender: 'male' },
      { name: 'Ayush Chauhan', roll: '24BEE025', gender: 'male' },
      { name: 'Aman Kumar', roll: '24BEC014', gender: 'male' },
      { name: 'Arpit Kaushal', roll: '24BME019', gender: 'male' },
      { name: 'Abhishek Meena', roll: '24BME002', gender: 'male' },
      { name: 'Arpit Meena', roll: '24BME020', gender: 'male' },
      { name: 'Chaudhary Hempratap Singh', roll: '25BME026', gender: 'male' },
      { name: 'Rishab Gupta', roll: '25BCH049', gender: 'male' },
      { name: 'Rahul Khatker', roll: '25BME079', gender: 'male' },
      { name: 'Anirudh', roll: '25BPH005', gender: 'male' },
      { name: 'Aman', roll: '25BME007', gender: 'male' },
      { name: 'Lumish', roll: '25BEE061', gender: 'male' },
      { name: 'Vikas', roll: '25BCH072', gender: 'male' },
      { name: 'Padma Chiwang', roll: '25BAR028', gender: 'male' },
      { name: 'Ansh', roll: '25BCS026', gender: 'male' },
      { name: 'Deepak', roll: '25BCS043', gender: 'male' },
      { name: 'Sushma', roll: '25BCE112', gender: 'female' },
      { name: 'Tanmay Rana', roll: '25BEE112', gender: 'male' },
      { name: 'Ritesh', roll: '25BEE092', gender: 'male' },
      { name: 'Abhishek Yadav', roll: '25BCH003', gender: 'male' },
      { name: 'Adarsh', roll: '25BCH005', gender: 'male' },
      { name: 'Anshu Gautam', roll: '25BCH012', gender: 'male' },
      { name: 'Ayush Kumar', roll: '25BEE027', gender: 'male' },
      { name: 'Digvijay', roll: '25BCH025', gender: 'male' },
      { name: 'Parneet Kaur', roll: '25BCE087', gender: 'female' },
      { name: 'Sanidhya Sharma', roll: '25BEE098', gender: 'male' },
      { name: 'Rudra Pratap Singh', roll: '25BEC090', gender: 'male' },
      { name: 'Aditya Chaudhary', roll: '25BEE005', gender: 'male' },
      { name: 'Harshit Kumar', roll: '25BCS053', gender: 'male' },
      { name: 'Pallavi', roll: '25BCE085', gender: 'female' },
      { name: 'Abhishek Jamwal', roll: '25BME002', gender: 'male' },
      { name: 'Pankaj', roll: '25BCE086', gender: 'male' },
      { name: 'Nikhil Thakur', roll: '25BME066', gender: 'male' },
      { name: 'Sahil Kumar', roll: '25RCE004', gender: 'male' },
    ];

    console.log(`Prepared ${studentsToInsert.length} students to insert.`);

    let inserted = 0;
    for (const student of studentsToInsert) {
      // Check if student exists by roll number
      const [existing] = await sql`SELECT id FROM students WHERE roll_number = ${student.roll}`;
      if (!existing) {
        await sql`
          INSERT INTO students (name, roll_number, gender, user_id, campus_status)
          VALUES (${student.name}, ${student.roll}, ${student.gender}, ${disciplineUserId}, 'in')
        `;
        inserted++;
      }
    }

    console.log(`✅ Success! Inserted ${inserted} new students. (Skipped ${studentsToInsert.length - inserted} duplicates)`);
    await sql.end();
  } catch (err) {
    console.error('❌ Error injecting students:', err);
    await sql.end();
  }
}

addStudents();
