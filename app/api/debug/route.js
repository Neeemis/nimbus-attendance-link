import { NextResponse } from 'next/server';
import sql from '@/lib/db';

export async function GET() {
  try {
    const res = await sql`
      SELECT group_name, count(*) as count
      FROM students
      GROUP BY group_name
      ORDER BY count DESC
    `;
    const userGroups = await sql`
      SELECT u.email, s.group_name, count(s.id) as student_count
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      GROUP BY u.email, s.group_name
      ORDER BY student_count DESC
    `;
    return NextResponse.json({ groups: res, userGroups });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
