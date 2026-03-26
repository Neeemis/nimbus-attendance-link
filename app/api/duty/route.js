import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAuth, getTargetUserId } from '@/lib/auth';

export async function POST(request) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const targetUserId = getTargetUserId(user, searchParams);
    const { date, studentIds } = await request.json(); // Array of IDs on duty

    if (!date || !Array.isArray(studentIds)) {
      return NextResponse.json({ error: 'Date and student IDs array required' }, { status: 400 });
    }

    await sql.begin(async sql => {
      // Clear old duty for students this user is allowed to manage on this date
      if (user.email === 'discipline@nimbus.com') {
        await sql`
          DELETE FROM duty_roaster 
          WHERE date = ${date}::date 
          AND student_id IN (
            SELECT s.id FROM students s
            LEFT JOIN users u ON s.user_id = u.id
            WHERE s.gender = 'Female' OR u.email = 'discipline@nimbus.com'
          )
        `;
      } else {
        await sql`
          DELETE FROM duty_roaster 
          WHERE date = ${date}::date 
          AND student_id IN (SELECT id FROM students WHERE user_id = ${targetUserId})
        `;
      }

      if (studentIds.length > 0) {
        const insertRows = studentIds.map(sid => ({
          student_id: sid,
          date: date
        }));
        await sql`
          INSERT INTO duty_roaster ${sql(insertRows, 'student_id', 'date')}
          ON CONFLICT (student_id, date) DO NOTHING
        `;
      }
    });

    return NextResponse.json({ message: 'Duty roaster updated.' });
  } catch (err) {
    console.error('Duty POST fail:', err);
    return NextResponse.json({ error: 'Update failed: ' + err.message }, { status: 500 });
  }
}

export async function GET(request) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const isGlobal = searchParams.get('global') === 'true';
    if (!date) return NextResponse.json({ error: 'Date required' }, { status: 400 });

    let rows;
    if (isGlobal || user.role === 'admin') {
      // GLOBAL VIEW: All students on duty today
      rows = await sql`
        SELECT s.id, s.name, s.roll_number,
               TRUE as on_duty
        FROM students s
        JOIN duty_roaster d ON s.id = d.student_id AND d.date = ${date}::date
        ORDER BY s.roll_number ASC, s.name ASC
      `;
    } else {
      // SUPERVISOR VIEW: Only their students
      const targetUserId = getTargetUserId(user, searchParams);
      rows = await sql`
        SELECT s.id, s.name, s.roll_number,
               CASE WHEN d.id IS NOT NULL THEN TRUE ELSE FALSE END as on_duty
        FROM students s
        LEFT JOIN duty_roaster d ON s.id = d.student_id AND d.date = ${date}::date
        WHERE s.user_id = ${targetUserId}
        ORDER BY s.roll_number ASC, s.name ASC
      `;
    }

    return NextResponse.json(rows);
  } catch (err) {
    console.error('Duty GET fail:', err);
    return NextResponse.json({ error: 'Failed to fetch duty list' }, { status: 500 });
  }
}
