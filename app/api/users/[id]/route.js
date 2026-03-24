import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import sql from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function PUT(request, { params }) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token, authorization denied' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 });

  try {
    const { id } = await params;
    const { name, email, password } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }

    const [existingUser] = await sql`SELECT * FROM users WHERE id = ${id} AND role = 'user'`;
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const [emailCheck] = await sql`SELECT id FROM users WHERE email = ${email} AND id != ${id}`;
    if (emailCheck) {
      return NextResponse.json({ error: 'Email already in use by another account.' }, { status: 400 });
    }

    let updatedUser;
    if (password && password.trim() !== '') {
      const passwordHash = await bcrypt.hash(password, 10);
      [updatedUser] = await sql`
        UPDATE users SET name = ${name}, email = ${email}, password_hash = ${passwordHash} WHERE id = ${id}
        RETURNING id, name, email, created_at
      `;
    } else {
      [updatedUser] = await sql`
        UPDATE users SET name = ${name}, email = ${email} WHERE id = ${id}
        RETURNING id, name, email, created_at
      `;
    }

    return NextResponse.json(updatedUser);
  } catch (err) {
    console.error('Update user error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token, authorization denied' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 });

  try {
    const { id } = await params;
    const [check] = await sql`SELECT id FROM users WHERE id = ${id} AND role = 'user'`;
    if (!check) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    await sql`DELETE FROM users WHERE id = ${id}`;
    return NextResponse.json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Delete user error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
