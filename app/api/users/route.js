import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import sql from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token, authorization denied' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 });

  try {
    const rows = await sql`SELECT id, name, email, created_at FROM users WHERE role = 'user' ORDER BY name`;
    return NextResponse.json(rows);
  } catch (err) {
    console.error('Get users error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token, authorization denied' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 });

  try {
    const { name, email, password } = await request.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    const [check] = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (check) {
      return NextResponse.json({ error: 'Email already exists.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [newUser] = await sql`
      INSERT INTO users (name, email, password_hash, role) 
      VALUES (${name}, ${email}, ${passwordHash}, 'user')
      RETURNING id, name, email, created_at
    `;

    return NextResponse.json(newUser, { status: 201 });
  } catch (err) {
    console.error('Create user error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
