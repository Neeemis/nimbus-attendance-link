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
      rows = await sql`SELECT id, name, roll_number, gender, hostel, created_at FROM students ORDER BY roll_number ASC, name ASC`;
    } else {
      const targetUserId = getTargetUserId(user, searchParams);
      rows = await sql`SELECT id, name, roll_number, gender, hostel, created_at FROM students WHERE user_id = ${targetUserId} ORDER BY roll_number ASC, name ASC`;
    }
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Get students error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token, authorization denied' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const targetUserId = getTargetUserId(user, searchParams);
    const { name, roll_number, gender, hostel } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Student name is required.' }, { status: 400 });
    }

    const [student] = await sql`
      INSERT INTO students (name, roll_number, gender, hostel, user_id) 
      VALUES (${name.trim()}, ${roll_number || null}, ${gender}, ${hostel}, ${targetUserId}) 
      RETURNING id, name, roll_number, gender, hostel, created_at
    `;

    return NextResponse.json(student, { status: 201 });
  } catch (err) {
    console.error('Add student error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
