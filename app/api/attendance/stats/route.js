import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAuth, getTargetUserId } from '@/lib/auth';

export async function GET(request) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token, authorization denied' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    let stats, studentCount;

    if (user.role === 'admin' && !searchParams.get('userId')) {
      [stats] = await sql`
        SELECT 
           COUNT(DISTINCT a.date) as total_days,
           SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as total_present,
           COUNT(a.id) as total_records
        FROM attendance a
      `;
      [studentCount] = await sql`SELECT COUNT(*) as total_students FROM students`;
    } else {
      const targetUserId = getTargetUserId(user, searchParams);
      [stats] = await sql`
        SELECT 
           COUNT(DISTINCT a.date) as total_days,
           SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as total_present,
           COUNT(a.id) as total_records
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        WHERE s.user_id = ${targetUserId}
      `;
      [studentCount] = await sql`SELECT COUNT(*) as total_students FROM students WHERE user_id = ${targetUserId}`;
    }

    return NextResponse.json({
      total_days: stats?.total_days || 0,
      total_present: stats?.total_present || 0,
      total_records: stats?.total_records || 0,
      total_students: studentCount?.total_students || 0,
    });
  } catch (err) {
    console.error('Get stats error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
