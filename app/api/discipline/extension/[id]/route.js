import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { ensureExtensionSchema } from '@/lib/schema';

export async function PUT(request, { params }) {
  const user = verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'No token, authorization denied' }, { status: 401 });

  // Only Faculty, Discipline Officer, or Admins can cancel or reinstate extensions
  if (user.email !== 'discipline@nimbus.com' && user.email !== 'faculty@nimbus.com' && user.role !== 'admin') {
    return NextResponse.json({ 
      error: 'Access denied. Only Faculty and Discipline Officers can modify extension permissions.' 
    }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { cancelled, reason } = await request.json();

    await ensureExtensionSchema();

    const cancelledBool = Boolean(cancelled);
    const now = new Date();
    const performer = user.name ? `${user.name} (${user.email})` : user.email;
    const finalReason = reason ? String(reason).trim() : null;

    const [updated] = await sql.begin(async (tx) => {
      const [s] = await tx`
        UPDATE students
        SET extension_cancelled = ${cancelledBool},
            extension_cancelled_at = ${cancelledBool ? now : null},
            extension_cancelled_by = ${cancelledBool ? performer : null},
            extension_cancelled_reason = ${cancelledBool ? finalReason : null}
        WHERE id = ${id}
        RETURNING id, name, roll_number, gender, hostel, campus_status, user_id,
                  extension_cancelled, extension_cancelled_at, extension_cancelled_by, extension_cancelled_reason
      `;

      if (s) {
        await tx`
          INSERT INTO extension_logs (student_id, action, performed_by, reason)
          VALUES (${id}, ${cancelledBool ? 'cancelled' : 'reinstated'}, ${performer}, ${finalReason})
        `;
      }
      return [s];
    });

    if (!updated) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('Update extension error:', err);
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}
