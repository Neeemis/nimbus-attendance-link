import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(request) {
  const user = verifyAuth(request);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized system wipe' }, { status: 403 });
  }

  try {
    await sql`TRUNCATE TABLE attendance RESTART IDENTITY CASCADE`;
    await sql`TRUNCATE TABLE campus_status_logs RESTART IDENTITY CASCADE`;
    
    return NextResponse.json({ message: 'Fresh Start: All logs cleared successfully.' });
  } catch (err) {
    console.error('WIPE FAIL:', err);
    return NextResponse.json({ error: 'Clearance failed: ' + err.message }, { status: 500 });
  }
}
