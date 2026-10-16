import sql from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import PDFDocument from 'pdfkit';
import { ensureExtensionSchema } from '@/lib/schema';

export async function GET(request) {
  const user = verifyAuth(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'No token, authorization denied' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await ensureExtensionSchema();
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    let isSpan = false;
    let startDate = dateParam || startDateParam || todayIST;
    let endDate = dateParam || endDateParam || startDate;

    if (startDateParam && endDateParam && startDateParam !== endDateParam) {
      isSpan = true;
      startDate = startDateParam;
      endDate = endDateParam;
    } else if (dateParam) {
      startDate = dateParam;
      endDate = dateParam;
      isSpan = false;
    }

    let rows;
    if (!isSpan) {
      rows = await sql`
        SELECT s.id, s.name, s.roll_number, s.gender, s.hostel,
               COALESCE(s.extension_cancelled, FALSE) as extension_cancelled,
               s.extension_cancelled_reason,
               d.date
        FROM students s
        JOIN duty_roaster d ON s.id = d.student_id AND d.date = ${startDate}::date
        WHERE s.user_id IN (
          SELECT id FROM users 
          WHERE email LIKE 'discipline@%' OR LOWER(name) LIKE '%discipline%'
        )
        ORDER BY s.roll_number ASC, s.name ASC
      `;
    } else {
      rows = await sql`
        SELECT s.id, s.name, s.roll_number, s.gender, s.hostel,
               COALESCE(s.extension_cancelled, FALSE) as extension_cancelled,
               s.extension_cancelled_reason,
               d.date
        FROM students s
        JOIN duty_roaster d ON s.id = d.student_id AND d.date >= ${startDate}::date AND d.date <= ${endDate}::date
        WHERE s.user_id IN (
          SELECT id FROM users 
          WHERE email LIKE 'discipline@%' OR LOWER(name) LIKE '%discipline%'
        )
        ORDER BY d.date ASC, s.roll_number ASC, s.name ASC
      `;
    }

    // PDF Generation
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    const pdfPromise = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const nowIST = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    // Header
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1e1b4b').text('EXTENSION TRACKER', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#4338ca').text('DISCIPLINE SQUAD — DUTY ROASTER REPORT', { align: 'center' });
    doc.moveDown(0.3);

    const subText = isSpan 
      ? `Duty Duration: ${new Date(startDate).toLocaleDateString('en-IN')} to ${new Date(endDate).toLocaleDateString('en-IN')}`
      : `Duty Date: ${new Date(startDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

    doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(subText, { align: 'center' });
    doc.fontSize(9).text(`Report Generated: ${nowIST} IST | Total Assigned Records: ${rows.length}`, { align: 'center' });
    doc.moveDown(1.2);

    // Table Setup
    const tableTop = doc.y;
    let colWidths, headers;

    if (isSpan) {
      colWidths = [25, 75, 125, 80, 85, 75, 50]; // Total 515
      headers = ['#', 'Duty Date', 'Student Name', 'Roll No.', 'Hostel', 'Ext. Status', 'Sign'];
    } else {
      colWidths = [30, 150, 95, 115, 65, 60]; // Total 515
      headers = ['#', 'Student Name', 'Roll Number', 'Gender / Hostel', 'Ext. Status', 'Signature'];
    }

    doc.rect(40, tableTop - 5, 515, 22).fill('#4338ca');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');

    let hx = 40;
    headers.forEach((h, i) => {
      doc.text(h, hx + 4, tableTop, { width: colWidths[i], align: i === 0 ? 'center' : 'left' });
      hx += colWidths[i];
    });

    doc.moveDown(1);
    doc.font('Helvetica').fontSize(9);

    if (rows.length === 0) {
      doc.moveDown(1.5);
      doc.fillColor('#64748b').fontSize(11).text('No students assigned for duty on the selected date / span.', 40, doc.y, { align: 'center', width: 515 });
    } else {
      rows.forEach((row, index) => {
        // Auto page break
        if (doc.y > 740) {
          doc.addPage();
          doc.fillColor('#4338ca').rect(40, doc.y - 5, 515, 20).fill();
          doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10);
          let newHx = 40;
          headers.forEach((h, i) => {
            doc.text(h, newHx + 4, doc.y, { width: colWidths[i], align: i === 0 ? 'center' : 'left' });
            newHx += colWidths[i];
          });
          doc.moveDown(1).fillColor('#0f172a').font('Helvetica').fontSize(9);
        }

        const y = doc.y;
        if (index % 2 === 0) {
          doc.rect(40, y - 2, 515, 18).fill('#f8fafc');
        }
        doc.fillColor('#0f172a');

        const extStatus = row.extension_cancelled ? 'CANCELLED' : 'ACTIVE';
        const dateStr = row.date ? new Date(row.date).toLocaleDateString('en-IN') : '-';

        let values;
        if (isSpan) {
          values = [
            (index + 1).toString(),
            dateStr,
            row.name,
            row.roll_number || '-',
            row.hostel || '-',
            extStatus,
            ''
          ];
        } else {
          values = [
            (index + 1).toString(),
            row.name,
            row.roll_number || '-',
            `${row.gender || ''} | ${row.hostel || 'Hostel N/A'}`,
            extStatus,
            ''
          ];
        }

        let cx = 40;
        values.forEach((val, i) => {
          if (headers[i] === 'Ext. Status') {
            doc.fillColor(row.extension_cancelled ? '#dc2626' : '#16a34a');
          } else {
            doc.fillColor('#0f172a');
          }
          doc.text(val || '-', cx + 4, y, { width: colWidths[i], align: i === 0 ? 'center' : 'left', lineBreak: false });
          cx += colWidths[i];
        });

        doc.moveDown(0.7);
      });
    }

    // Footer summary
    doc.moveDown(1.5);
    if (doc.y < 730) {
      doc.fontSize(8).fillColor('#94a3b8').text('Confidential Document — Generated by Extension Tracker Portal', { align: 'center' });
    }

    doc.end();
    const pdfBuffer = await pdfPromise;

    const filename = isSpan 
      ? `duty_roaster_${startDate}_to_${endDate}.pdf` 
      : `duty_roaster_${startDate}.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (err) {
    console.error('Duty PDF generation failed:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate duty PDF: ' + err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
