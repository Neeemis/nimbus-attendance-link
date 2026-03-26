import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token, authorization denied' }, { status: 401 });

  if (user.email !== 'discipline@nimbus.com' && user.email !== 'faculty@nimbus.com' && user.role !== 'admin') {
    return NextResponse.json({ 
      error: `Access denied. Your account (${user.email}, ${user.role}) does not have discipline access.` 
    }, { status: 403 });
  }

  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    let rows;
    if (user.role === 'admin') {
      rows = await sql`
        SELECT s.id, s.name, s.roll_number, s.gender, s.hostel, s.campus_status, u.name as club_name,
               CASE WHEN dr.id IS NOT NULL THEN TRUE ELSE FALSE END as on_duty
        FROM students s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN duty_roaster dr ON s.id = dr.student_id AND dr.date = ${today}::date
        ORDER BY s.roll_number ASC, s.name ASC
      `;
    } else {
      rows = await sql`
        SELECT s.id, s.name, s.roll_number, s.gender, s.hostel, s.campus_status, u.name as club_name,
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
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
