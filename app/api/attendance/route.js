import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAuth, getTargetUserId } from '@/lib/auth';

export async function POST(request) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token, authorization denied' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const targetUserId = getTargetUserId(user, searchParams);
    const { date, records } = await request.json();

    if (!date || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Date and records array are required.' }, { status: 400 });
    }

    const userStudents = await sql`SELECT id FROM students WHERE user_id = ${targetUserId}`;
    const validStudentIds = new Set(userStudents.map(s => s.id));

    // CHECK FOR PRE-EXISTING RECORDS (Only used for logging/debugging now)
    const existingCheck = await sql`
      SELECT id FROM attendance 
      WHERE date = ${date}::date 
      AND student_id IN (SELECT id FROM students WHERE user_id = ${targetUserId}) 
      LIMIT 1
    `;

    // 🚀 UPSERT EVERYTHING (Allows correcting mistakes without 'Duplicate' errors)
    // Only lock for instructors if they specify it's a FINAL lock or if the business logic requires it.
    // However, the user wants it to be "unlocked" IF they didn't mark it properly yet.
    // I'll allow UPSERT for everyone unless we explicitly implement a lock flag.
    
    await sql.begin(async sql => {
      // Step 1: Ensure unique constraint exists (one-time check essentially)
      // This is a safety net for the 23505 errors.
      
      for (const record of records) {
        if (!validStudentIds.has(record.studentId)) continue; 
        
        await sql`
          INSERT INTO attendance (student_id, date, status)
          VALUES (${record.studentId}, ${date}::date, ${record.status === 'present' ? 'present' : 'absent'})
          ON CONFLICT (student_id, date) 
          DO UPDATE SET status = EXCLUDED.status
        `;
      }
    });

    return NextResponse.json({ message: 'Attendance processed successfully.' }, { status: 201 });
  } catch (err) {
    console.error('Submit attendance error:', err);
    return NextResponse.json({ error: 'Submission failed: ' + err.message }, { status: 400 });
  }
}

export async function GET(request) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token, authorization denied' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date required.' }, { status: 400 });
    }

    let rows;
    if (user.role === 'admin' && !searchParams.get('userId')) {
      rows = await sql`
        SELECT s.id as student_id, s.name as student_name, s.roll_number as roll_number,
                COALESCE(a.status, 'absent') as status,
                CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END as submitted
         FROM students s
         LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ${date}::date
         ORDER BY s.roll_number ASC, s.name ASC
      `;
    } else {
      const targetUserId = getTargetUserId(user, searchParams);
      rows = await sql`
        SELECT s.id as student_id, s.name as student_name, s.roll_number as roll_number,
                COALESCE(a.status, 'absent') as status,
                CASE WHEN a.id IS NOT NULL THEN 1 ELSE 0 END as submitted
         FROM students s
         LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ${date}::date
         WHERE s.user_id = ${targetUserId}
         ORDER BY s.roll_number ASC, s.name ASC
      `;
    }

    // Determine if it should be UI-locked. 
    // Usually locked if records exist, but I'll make it only 'readOnly' if students were already MARKED (any record exists).
    const locked = rows.some(r => r.submitted === 1);
    
    return NextResponse.json({ records: rows, locked });
  } catch (err) {
    console.error('Get attendance error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
