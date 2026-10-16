import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { ensureExtensionSchema } from '@/lib/schema';

export async function POST(request) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token' }, { status: 401 });

  const isDiscipline = user.email?.startsWith('discipline@') || user.email === 'discipline@nimbus.com';
  const isFaculty = user.email?.startsWith('faculty@') || user.email === 'faculty@nimbus.com' || user.role === 'faculty';
  const isAdmin = user.role === 'admin';

  if (!isDiscipline && !isFaculty && !isAdmin) {
    return NextResponse.json({ 
      error: 'Access denied. Duty roaster can only be managed by Discipline Club and Faculty Incharge.' 
    }, { status: 403 });
  }

  try {
    const { date, studentIds } = await request.json(); // Array of IDs on duty

    if (!date || !Array.isArray(studentIds)) {
      return NextResponse.json({ error: 'Date and student IDs array required' }, { status: 400 });
    }

    await sql.begin(async tx => {
      // 1. Delete existing duty assignments for discipline club students on this date
      await tx`
        DELETE FROM duty_roaster 
        WHERE date = ${date}::date 
        AND student_id IN (
          SELECT id FROM students 
          WHERE user_id IN (
            SELECT id FROM users 
            WHERE email LIKE 'discipline@%' OR LOWER(name) LIKE '%discipline%'
          )
        )
      `;

      // 2. Only assign duty to confirmed members of the discipline club
      if (studentIds.length > 0) {
        const validDisciplineStudents = await tx`
          SELECT id FROM students 
          WHERE id = ANY(${studentIds})
            AND user_id IN (
              SELECT id FROM users 
              WHERE email LIKE 'discipline@%' OR LOWER(name) LIKE '%discipline%'
            )
        `;

        const validIds = validDisciplineStudents.map(s => s.id);
        if (validIds.length > 0) {
          const insertRows = validIds.map(sid => ({
            student_id: sid,
            date: date
          }));
          await tx`
            INSERT INTO duty_roaster ${tx(insertRows, 'student_id', 'date')}
            ON CONFLICT (student_id, date) DO NOTHING
          `;
        }
      }
    });

    return NextResponse.json({ message: 'Duty roaster updated successfully.' });
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

    await ensureExtensionSchema();

    if (isGlobal) {
      // GLOBAL VIEW: All students on duty today (used by dashboard and global badges)
      const rows = await sql`
        SELECT s.id, s.name, s.roll_number,
               COALESCE(s.extension_cancelled, FALSE) as extension_cancelled,
               TRUE as on_duty
        FROM students s
        JOIN duty_roaster d ON s.id = d.student_id AND d.date = ${date}::date
        ORDER BY s.roll_number ASC, s.name ASC
      `;
      return NextResponse.json(rows);
    }

    const isDiscipline = user.email?.startsWith('discipline@') || user.email === 'discipline@nimbus.com';
    const isFaculty = user.email?.startsWith('faculty@') || user.email === 'faculty@nimbus.com' || user.role === 'faculty';
    const isAdmin = user.role === 'admin';

    if (!isDiscipline && !isFaculty && !isAdmin) {
      return NextResponse.json({ 
        error: 'Access denied. Duty roaster can only be viewed and managed by Discipline Club and Faculty Incharge.' 
      }, { status: 403 });
    }

    // Management View: Strictly returns members of the Discipline Club
    const rows = await sql`
      SELECT s.id, s.name, s.roll_number,
             COALESCE(s.extension_cancelled, FALSE) as extension_cancelled,
             CASE WHEN d.id IS NOT NULL THEN TRUE ELSE FALSE END as on_duty
      FROM students s
      LEFT JOIN duty_roaster d ON s.id = d.student_id AND d.date = ${date}::date
      WHERE s.user_id IN (
        SELECT id FROM users 
        WHERE email LIKE 'discipline@%' OR LOWER(name) LIKE '%discipline%'
      )
      ORDER BY s.roll_number ASC, s.name ASC
    `;

    return NextResponse.json(rows);
  } catch (err) {
    console.error('Duty GET fail:', err);
    return NextResponse.json({ error: 'Failed to fetch duty list: ' + err.message }, { status: 500 });
  }
}
