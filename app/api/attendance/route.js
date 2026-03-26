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

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
    }

    const userStudents = await sql`SELECT id FROM students WHERE user_id = ${targetUserId}`;
    const validStudentIds = new Set(userStudents.map(s => s.id));

    // 🚀 ATOMIC RE-WRITE (Delete existing for target + insert fresh)
    // This is the most robust way to avoid "duplicate key" issues without knowing the exact unique constraint name.
    await sql.begin(async sql => {
      // Step 1: Remove any records for this user's students on this specific day
      await sql`
        DELETE FROM attendance 
        WHERE date = ${date}::date 
        AND student_id IN (SELECT id FROM students WHERE user_id = ${targetUserId})
      `;

      // Step 2: Batch insert the new records (Deduplicated to prevent PK violations in same batch)
      const uniqueRecordsMap = new Map();
      records.forEach(r => {
        if (validStudentIds.has(r.studentId)) {
          uniqueRecordsMap.set(r.studentId, {
            student_id: r.studentId,
            date: date,
            status: r.status === 'present' ? 'present' : 'absent'
          });
        }
      });

      const insertRows = Array.from(uniqueRecordsMap.values());

      if (insertRows.length > 0) {
        console.log(`🚀 Inserting ${insertRows.length} unique records for ${date}`);
        await sql`INSERT INTO attendance ${sql(insertRows, 'student_id', 'date', 'status')}`;
      }
    });

    return NextResponse.json({ message: 'Attendance submitted successfully.' }, { status: 201 });
  } catch (err) {
    console.error('Submit attendance error:', err);
    return NextResponse.json({ error: 'Submission failed: ' + err.message }, { status: 500 });
  }
}

export async function GET(request) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token, authorization denied' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Date query parameter is required.' }, { status: 400 });
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

    // A session is considered "Marked/Locked" if ANY record exists for the selected set of students.
    const locked = rows.some(r => r.submitted === 1);
    
    return NextResponse.json({ records: rows, locked });
  } catch (err) {
    console.error('Get attendance error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
