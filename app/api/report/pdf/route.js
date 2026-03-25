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

  if (user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Access denied. Admin role required.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let rows;
    if (userId && userId !== 'null' && userId !== '') {
      rows = await sql`
        SELECT s.name as student_name, u.name as instructor_name, COUNT(a.id) as total_days,
               SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
               SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days
        FROM students s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN attendance a ON s.id = a.student_id
        WHERE s.user_id = ${userId}
        GROUP BY s.id, s.name, u.name
        ORDER BY u.name, s.name
      `;
    } else {
      rows = await sql`
        SELECT s.name as student_name, u.name as instructor_name, COUNT(a.id) as total_days,
               SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days,
               SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days
        FROM students s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN attendance a ON s.id = a.student_id
        GROUP BY s.id, s.name, u.name
        ORDER BY u.name, s.name
      `;
    }

    let totalDates = 0;
    if (userId && userId !== 'null' && userId !== '') {
      const [row] = await sql`
        SELECT COUNT(DISTINCT a.date) as total_dates 
        FROM attendance a JOIN students s ON a.student_id = s.id 
        WHERE s.user_id = ${userId}
      `;
      totalDates = row?.total_dates || 0;
    } else {
      const [row] = await sql`SELECT COUNT(DISTINCT date) as total_dates FROM attendance`;
      totalDates = row?.total_dates || 0;
    }

    // Create PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    
    const pdfPromise = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const reportTitle = userId && rows.length > 0 ? `Attendance Report: ${rows[0].instructor_name}` : (userId ? `Instructor Attendance Report` : `Global Attendance Report`);

    // --- Header Section ---
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1e3a8a').text('NIMBUS ATTENDANCE PORTAL', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#475569').text(reportTitle, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`Report Generated On: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });
    doc.fontSize(10).text(`Total Class Sessions Logged: ${totalDates}`, { align: 'center' });
    doc.moveDown(1.5);

    // --- Table Headers ---
    const tableTop = doc.y;
    const colWidths = [25, 120, 120, 50, 50, 70, 80]; // Total 515 (A4 is 595, -80 margins = 515)
    const headers = ['#', 'Student Name', 'Instructor', 'Pres.', 'Abs.', 'Days', 'Attend %'];

    doc.rect(40, tableTop - 5, 515, 22).fill('#2563eb');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');

    let x = 40;
    headers.forEach((header, i) => {
      doc.text(header, x + 4, tableTop, { width: colWidths[i], align: i === 0 ? 'center' : 'left' });
      x += colWidths[i];
    });

    doc.moveDown(1);
    doc.font('Helvetica').fontSize(9);

    // --- Table Rows ---
    rows.forEach((row, index) => {
      const y = doc.y;
      
      // Zebra striping
      if (index % 2 === 0) {
        doc.rect(40, y - 2, 515, 18).fill('#f1f5f9');
      }
      
      // REQUIRED: Reset color for every row text
      doc.fillColor('#0f172a');

      const totalDaysForStudent = parseInt(row.total_days || 0);
      const presentDays = parseInt(row.present_days || 0);
      const absentDays = parseInt(row.absent_days || 0);
      const percentage = totalDaysForStudent > 0 ? ((presentDays / totalDaysForStudent) * 100).toFixed(1) : '0.0';

      let cx = 40;
      const values = [(index+1).toString(), row.student_name, row.instructor_name, presentDays.toString(), absentDays.toString(), totalDaysForStudent.toString(), `${percentage}%`];

      values.forEach((val, i) => {
        doc.text(val || '-', cx + 4, y, { width: colWidths[i], align: i === 0 ? 'center' : 'left', lineBreak: false });
        cx += colWidths[i];
      });

      doc.moveDown(0.7);
      
      // Auto Page Break Logic
      if (doc.y > 740) {
        doc.addPage();
        // Redraw table header on new page (Simplified without rect for speed)
        doc.fillColor('#2563eb').rect(40, doc.y - 5, 515, 20).fill();
        doc.fillColor('#ffffff').font('Helvetica-Bold');
        let headerX = 40;
        headers.forEach((h, i) => {
          doc.text(h, headerX + 4, doc.y, { width: colWidths[i], align: i === 0 ? 'center' : 'left' });
          headerX += colWidths[i];
        });
        doc.moveDown(1).fillColor('#0f172a').font('Helvetica');
      }
    });

    doc.end();
    const pdfBuffer = await pdfPromise;

    return new Response(pdfBuffer, {
      status: 200,
      headers: { 
        'Content-Type': 'application/pdf', 
        'Content-Disposition': 'attachment; filename="nimbus_attendance_report.pdf"' 
      },
    });
  } catch (err) {
    console.error('PDF report generation critical failure:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate report. Check database connectivity.' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
