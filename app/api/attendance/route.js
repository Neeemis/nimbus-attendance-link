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

    const [existingCheck] = await sql`
      SELECT a.id FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE s.user_id = ${targetUserId} AND a.date = ${date}::date LIMIT 1
    `;

    if (existingCheck && user.role !== 'admin') {
      return NextResponse.json({ error: 'Attendance for this date has already been submitted and is locked.' }, { status: 403 });
    }

    try {
      await sql.begin(async sql => {
        if (user.role === 'admin' && existingCheck) {
          await sql`DELETE FROM attendance WHERE date = ${date}::date AND student_id IN (SELECT id FROM students WHERE user_id = ${targetUserId})`;
        }
        for (const record of records) {
          if (!validStudentIds.has(record.studentId)) {
            throw new Error(`Student ID ${record.studentId} does not belong to you.`);
          }
          const status = record.status === 'present' ? 'present' : 'absent';
          await sql`INSERT INTO attendance (student_id, date, status) VALUES (${record.studentId}, ${date}::date, ${status})`;
        }
      });
    } catch (txErr) {
      if (txErr.message.includes('does not belong')) {
        return NextResponse.json({ error: txErr.message }, { status: 400 });
      }
      throw txErr;
    }

    return NextResponse.json({ message: 'Attendance submitted successfully.' }, { status: 201 });
  } catch (err) {
    console.error('Submit attendance error:', err);
    if (err.code === '23505') {
      return NextResponse.json({ error: 'Duplicate attendance entry detected. Attendance is locked.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
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

    const locked = rows.some(r => r.submitted === 1);
    return NextResponse.json({ records: rows, locked });
  } catch (err) {
    console.error('Get attendance error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
