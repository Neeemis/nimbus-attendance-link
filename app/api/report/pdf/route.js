import sql from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import PDFDocument from 'pdfkit';

export async function GET(request) {
  const user = verifyAuth(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'No token, authorization denied' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const dateParam = searchParams.get('date');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Role-based target user scoping
    const isFaculty = user.email?.startsWith('faculty@') || user.email === 'faculty@nimbus.com' || user.role === 'faculty';
    const isAdmin = user.role === 'admin';

    let targetUserId = null;
    if (isAdmin || isFaculty) {
      if (userIdParam && userIdParam !== 'null' && userIdParam !== 'all' && userIdParam !== '') {
        targetUserId = parseInt(userIdParam, 10);
      }
    } else {
      // Regular club coordinators can only export their own section
      targetUserId = user.id;
    }

    let isSpan = false;
    let startDate = dateParam || startDateParam;
    let endDate = dateParam || endDateParam || startDate;

    if (startDateParam && endDateParam && startDateParam !== endDateParam) {
      isSpan = true;
      startDate = startDateParam;
      endDate = endDateParam;
    } else if (dateParam) {
      startDate = dateParam;
      endDate = dateParam;
    }

    let rows;
    if (isSpan) {
      if (targetUserId) {
        rows = await sql`
          SELECT s.name as student_name, s.roll_number, u.name as instructor_name,
                 COUNT(DISTINCT a.date) as total_days,
                 SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
                 SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days
          FROM students s
          JOIN users u ON s.user_id = u.id
          LEFT JOIN attendance a ON s.id = a.student_id AND a.date >= ${startDate}::date AND a.date <= ${endDate}::date
          WHERE s.user_id = ${targetUserId}
          GROUP BY s.id, s.name, s.roll_number, u.name
          ORDER BY u.name, s.roll_number ASC, s.name ASC
        `;
      } else {
        rows = await sql`
          SELECT s.name as student_name, s.roll_number, u.name as instructor_name,
                 COUNT(DISTINCT a.date) as total_days,
                 SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
                 SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days
          FROM students s
          JOIN users u ON s.user_id = u.id
          LEFT JOIN attendance a ON s.id = a.student_id AND a.date >= ${startDate}::date AND a.date <= ${endDate}::date
          GROUP BY s.id, s.name, s.roll_number, u.name
          ORDER BY u.name, s.roll_number ASC, s.name ASC
        `;
      }
    } else if (startDate) {
      // Single Date
      if (targetUserId) {
        rows = await sql`
          SELECT s.name as student_name, s.roll_number, u.name as instructor_name,
                 1 as total_days,
                 SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
                 SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days
          FROM students s
          JOIN users u ON s.user_id = u.id
          LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ${startDate}::date
          WHERE s.user_id = ${targetUserId}
          GROUP BY s.id, s.name, s.roll_number, u.name
          ORDER BY u.name, s.roll_number ASC, s.name ASC
        `;
      } else {
        rows = await sql`
          SELECT s.name as student_name, s.roll_number, u.name as instructor_name,
                 1 as total_days,
                 SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
                 SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days
          FROM students s
          JOIN users u ON s.user_id = u.id
          LEFT JOIN attendance a ON s.id = a.student_id AND a.date = ${startDate}::date
          GROUP BY s.id, s.name, s.roll_number, u.name
          ORDER BY u.name, s.roll_number ASC, s.name ASC
        `;
      }
    } else {
      // All-time
      if (targetUserId) {
        rows = await sql`
          SELECT s.name as student_name, s.roll_number, u.name as instructor_name,
                 COUNT(DISTINCT a.date) as total_days,
                 SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
                 SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days
          FROM students s
          JOIN users u ON s.user_id = u.id
          LEFT JOIN attendance a ON s.id = a.student_id
          WHERE s.user_id = ${targetUserId}
          GROUP BY s.id, s.name, s.roll_number, u.name
          ORDER BY u.name, s.roll_number ASC, s.name ASC
        `;
      } else {
        rows = await sql`
          SELECT s.name as student_name, s.roll_number, u.name as instructor_name,
                 COUNT(DISTINCT a.date) as total_days,
                 SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
                 SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days
          FROM students s
          JOIN users u ON s.user_id = u.id
          LEFT JOIN attendance a ON s.id = a.student_id
          GROUP BY s.id, s.name, s.roll_number, u.name
          ORDER BY u.name, s.roll_number ASC, s.name ASC
        `;
      }
    }

    // Calculate Distinct Dates Logged in that window
    let totalDates = 0;
    if (isSpan) {
      const [r] = targetUserId
        ? await sql`SELECT COUNT(DISTINCT a.date) as total_dates FROM attendance a JOIN students s ON a.student_id = s.id WHERE s.user_id = ${targetUserId} AND a.date >= ${startDate}::date AND a.date <= ${endDate}::date`
        : await sql`SELECT COUNT(DISTINCT date) as total_dates FROM attendance WHERE date >= ${startDate}::date AND date <= ${endDate}::date`;
      totalDates = r?.total_dates || 0;
    } else if (startDate) {
      totalDates = 1;
    } else {
      const [r] = targetUserId
        ? await sql`SELECT COUNT(DISTINCT a.date) as total_dates FROM attendance a JOIN students s ON a.student_id = s.id WHERE s.user_id = ${targetUserId}`
        : await sql`SELECT COUNT(DISTINCT date) as total_dates FROM attendance`;
      totalDates = r?.total_dates || 0;
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    
    const pdfPromise = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const reportTitle = targetUserId && rows.length > 0 
      ? `Attendance Report: ${rows[0].instructor_name}` 
      : (targetUserId ? `Section Attendance Report` : `Global Attendance Report`);

    // --- Header Section ---
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1e3a8a').text('EXTENSION TRACKER', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#2563eb').text(reportTitle, { align: 'center' });
    doc.moveDown(0.3);

    const spanInfo = isSpan 
      ? `Selected Duration: ${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}`
      : (startDate ? `Date: ${new Date(startDate).toLocaleDateString('en-IN')}` : 'All-Time Cumulative Report');

    doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(spanInfo, { align: 'center' });
    doc.fontSize(9).text(`Report Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST | Class Sessions in Period: ${totalDates}`, { align: 'center' });
    doc.moveDown(1.5);

    // --- Table Headers ---
    const tableTop = doc.y;
    const colWidths = [25, 130, 80, 110, 45, 45, 40, 40]; // Total 515
    const headers = ['#', 'Student Name', 'Roll No.', 'Club / Section', 'Pres.', 'Abs.', 'Days', '%'];

    doc.rect(40, tableTop - 5, 515, 22).fill('#2563eb');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');

    let x = 40;
    headers.forEach((header, i) => {
      doc.text(header, x + 4, tableTop, { width: colWidths[i], align: i === 0 ? 'center' : 'left' });
      x += colWidths[i];
    });

    doc.moveDown(1);
    doc.font('Helvetica').fontSize(9);

    if (rows.length === 0) {
      doc.moveDown(1.5);
      doc.fillColor('#64748b').fontSize(11).text('No attendance records found for this period.', 40, doc.y, { align: 'center', width: 515 });
    } else {
      // --- Table Rows ---
      rows.forEach((row, index) => {
        if (doc.y > 740) {
          doc.addPage();
          doc.fillColor('#2563eb').rect(40, doc.y - 5, 515, 20).fill();
          doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
          let headerX = 40;
          headers.forEach((h, i) => {
            doc.text(h, headerX + 4, doc.y, { width: colWidths[i], align: i === 0 ? 'center' : 'left' });
            headerX += colWidths[i];
          });
          doc.moveDown(1).fillColor('#0f172a').font('Helvetica');
        }

        const y = doc.y;
        if (index % 2 === 0) {
          doc.rect(40, y - 2, 515, 18).fill('#f1f5f9');
        }
        
        doc.fillColor('#0f172a');

        const totalDaysForStudent = parseInt(row.total_days || 0);
        const presentDays = parseInt(row.present_days || 0);
        const absentDays = parseInt(row.absent_days || 0);
        const totalMarked = presentDays + absentDays;
        const percentage = totalMarked > 0 ? ((presentDays / totalMarked) * 100).toFixed(0) : '0';

        let cx = 40;
        const values = [
          (index + 1).toString(),
          row.student_name,
          row.roll_number || '-',
          row.instructor_name || '-',
          presentDays.toString(),
          absentDays.toString(),
          totalDaysForStudent.toString(),
          `${percentage}%`
        ];

        values.forEach((val, i) => {
          if (headers[i] === '%') {
            doc.fillColor(parseInt(percentage) >= 75 ? '#16a34a' : (parseInt(percentage) >= 50 ? '#d97706' : '#dc2626'));
          } else {
            doc.fillColor('#0f172a');
          }
          doc.text(val || '-', cx + 4, y, { width: colWidths[i], align: i === 0 ? 'center' : 'left', lineBreak: false });
          cx += colWidths[i];
        });

        doc.moveDown(0.7);
      });
    }

    doc.end();
    const pdfBuffer = await pdfPromise;

    const filename = isSpan 
      ? `attendance_${startDate}_to_${endDate}.pdf` 
      : (startDate ? `attendance_${startDate}.pdf` : `attendance_report.pdf`);

    return new Response(pdfBuffer, {
      status: 200,
      headers: { 
        'Content-Type': 'application/pdf', 
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (err) {
    console.error('PDF report generation critical failure:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate report: ' + err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
