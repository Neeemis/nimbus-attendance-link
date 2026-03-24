import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token, authorization denied' }, { status: 401 });

  if (user.email !== 'discipline@nimbus.com' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied. Discipline only.' }, { status: 403 });
  }

  try {
    const rows = await sql`
      SELECT s.id, s.name, s.roll_number, s.gender, s.hostel, s.campus_status, u.name as club_name
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.gender = 'Female'
      ORDER BY s.roll_number ASC, s.name ASC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Get discipline girls error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
