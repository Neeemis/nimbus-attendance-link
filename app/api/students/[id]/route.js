import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAuth, getTargetUserId } from '@/lib/auth';

export async function PUT(request, { params }) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token, authorization denied' }, { status: 401 });

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const targetUserId = getTargetUserId(user, searchParams);
    const { name, roll_number, gender, hostel } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Student name is required.' }, { status: 400 });
    }

    const [check] = await sql`SELECT id FROM students WHERE id = ${id} AND user_id = ${targetUserId}`;
    if (!check) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    const [attCheck] = await sql`SELECT id FROM attendance WHERE student_id = ${id} LIMIT 1`;
    if (attCheck) {
      return NextResponse.json({ error: 'Cannot edit student after attendance has been marked.' }, { status: 403 });
    }

    const [student] = await sql`
      UPDATE students 
      SET name = ${name.trim()}, roll_number = ${roll_number || null}, gender = ${gender}, hostel = ${hostel} 
      WHERE id = ${id}
      RETURNING id, name, roll_number, gender, hostel, created_at
    `;
    
    return NextResponse.json(student);
  } catch (err) {
    console.error('Edit student error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token, authorization denied' }, { status: 401 });

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const targetUserId = getTargetUserId(user, searchParams);

    const [check] = await sql`SELECT id FROM students WHERE id = ${id} AND user_id = ${targetUserId}`;
    if (!check) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    const [attCheck] = await sql`SELECT id FROM attendance WHERE student_id = ${id} LIMIT 1`;
    if (attCheck) {
      return NextResponse.json({ error: 'Cannot delete student after attendance has been marked.' }, { status: 403 });
    }

    await sql`DELETE FROM students WHERE id = ${id}`;
    return NextResponse.json({ message: 'Student deleted.' });
  } catch (err) {
    console.error('Delete student error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
