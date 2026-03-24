import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function PUT(request, { params }) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token, authorization denied' }, { status: 401 });

  if (user.email !== 'discipline@nimbus.com' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Access denied. Discipline only.' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { status } = await request.json();

    if (!status || !['in', 'out'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be "in" or "out".' }, { status: 400 });
    }

    const [studentCheck] = await sql`SELECT id FROM students WHERE id = ${id}`;
    if (!studentCheck) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    const [student] = await sql`
      UPDATE students SET campus_status = ${status} WHERE id = ${id}
      RETURNING id, name, roll_number, gender, hostel, campus_status
    `;

    return NextResponse.json(student);
  } catch (err) {
    console.error('Update campus status error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
