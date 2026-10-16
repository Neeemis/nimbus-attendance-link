import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { ensureExtensionSchema } from '@/lib/schema';

export async function GET(request) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token, authorization denied' }, { status: 401 });

  const isDiscipline = user.email?.startsWith('discipline@') || user.email === 'discipline@nimbus.com';
  const isFaculty = user.email?.startsWith('faculty@') || user.email === 'faculty@nimbus.com' || user.role === 'faculty';
  const isAdmin = user.role === 'admin';

  if (!isDiscipline && !isFaculty && !isAdmin) {
    return NextResponse.json({ 
      error: `Access denied. Your account (${user.email}, ${user.role}) does not have discipline access.` 
    }, { status: 403 });
  }

  try {
    await ensureExtensionSchema();
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    let rows;
    if (isAdmin || isFaculty) {
      rows = await sql`
        SELECT s.id, s.name, s.roll_number, s.gender, s.hostel, s.campus_status, u.name as club_name,
               COALESCE(s.extension_cancelled, FALSE) as extension_cancelled,
               s.extension_cancelled_at, s.extension_cancelled_by, s.extension_cancelled_reason,
               CASE WHEN dr.id IS NOT NULL THEN TRUE ELSE FALSE END as on_duty
        FROM students s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN duty_roaster dr ON s.id = dr.student_id AND dr.date = ${today}::date
        ORDER BY s.roll_number ASC, s.name ASC
      `;
    } else {
      rows = await sql`
        SELECT s.id, s.name, s.roll_number, s.gender, s.hostel, s.campus_status, u.name as club_name,
               COALESCE(s.extension_cancelled, FALSE) as extension_cancelled,
               s.extension_cancelled_at, s.extension_cancelled_by, s.extension_cancelled_reason,
               CASE WHEN dr.id IS NOT NULL THEN TRUE ELSE FALSE END as on_duty
        FROM students s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN duty_roaster dr ON s.id = dr.student_id AND dr.date = ${today}::date
        WHERE s.gender ILIKE 'female' 
           OR s.user_id = ${user.id}
           OR s.hostel ILIKE '%Ambika%'
           OR s.hostel ILIKE '%Satpura%'
           OR s.hostel ILIKE '%Parvati%'
        ORDER BY s.roll_number ASC, s.name ASC
      `;
    }
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Get discipline girls error:', err);
    return NextResponse.json({ error: 'Server Error: ' + err.message }, { status: 500 });
  }
}
