import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAuth, getTargetUserId } from '@/lib/auth';

export async function GET(request) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token, authorization denied' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    let rows;

    if (user.role === 'admin' && !searchParams.get('userId')) {
      rows = await sql`
        SELECT a.date,
               SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
               COUNT(*) as total_count
        FROM attendance a
        GROUP BY a.date
        ORDER BY a.date
      `;
    } else {
      const targetUserId = getTargetUserId(user, searchParams);
      rows = await sql`
        SELECT a.date,
               SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_count,
               COUNT(*) as total_count
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        WHERE s.user_id = ${targetUserId}
        GROUP BY a.date
        ORDER BY a.date
      `;
    }

    return NextResponse.json(rows);
  } catch (err) {
    console.error('Get attendance dates error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
