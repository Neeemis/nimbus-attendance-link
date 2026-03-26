import sql from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import PDFDocument from 'pdfkit';

export async function GET(request) {
  const user = verifyAuth(request);
  if (!user) return new Response(JSON.stringify({ error: 'No token' }), { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const filterDate = searchParams.get('date');

    // Fetch logs with student info
    let logs;
    if (filterDate) {
      logs = await sql`
        SELECT l.student_id, l.action, l.timestamp, s.name as student_name, s.roll_number, s.hostel
        FROM campus_status_logs l
        JOIN students s ON l.student_id = s.id
        WHERE l.timestamp >= ${filterDate + ' 00:00:00'}
        ORDER BY l.student_id, l.timestamp ASC
        LIMIT 2500
      `;
    } else {
      logs = await sql`
        SELECT l.student_id, l.action, l.timestamp, s.name as student_name, s.roll_number, s.hostel
        FROM campus_status_logs l
        JOIN students s ON l.student_id = s.id
        ORDER BY l.student_id, l.timestamp ASC
        LIMIT 2500
      `;
    }

    // PAIRING LOGIC
    const pairedData = [];
    const openExits = {}; 

    logs.forEach(log => {
      const sid = log.student_id;
      if (log.action === 'out') {
        openExits[sid] = {
          name: log.student_name,
          roll: log.roll_number,
          hostel: log.hostel,
          outTime: log.timestamp,
          inTime: null
        };
      } else if (log.action === 'in') {
        if (openExits[sid]) {
          openExits[sid].inTime = log.timestamp;
          pairedData.push(openExits[sid]);
          delete openExits[sid];
        } else {
          pairedData.push({
            name: log.student_name,
            roll: log.roll_number,
            hostel: log.hostel,
            outTime: null,
            inTime: log.timestamp
          });
        }
      }
    });

    Object.values(openExits).forEach(ex => pairedData.push(ex));

    pairedData.sort((a, b) => {
      const timeA = a.outTime || a.inTime;
      const timeB = b.outTime || b.inTime;
      return new Date(timeB) - new Date(timeA);
    });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    const pdfPromise = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const nowIST = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1e3a8a').text('CAMPUS MOVEMENT LOG REPORT', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`Standard IST Generated On: ${nowIST}`, { align: 'center' });
    if (filterDate) {
      doc.text(`Filtering Logs From: ${new Date(filterDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
    }
    doc.moveDown(1.5);

    const tableTop = doc.y;
    const colWidths = [25, 130, 100, 95, 85, 80]; 
    const headers = ['#', 'Student Name', 'Roll No', 'Hostel', 'OUT Time', 'IN Time'];

    doc.rect(40, tableTop - 5, 515, 22).fill('#3b82f6');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
    
    let x = 40;
    headers.forEach((h, i) => {
      doc.text(h, x + 4, tableTop, { width: colWidths[i], align: i === 0 ? 'center' : 'left' });
      x += colWidths[i];
    });

    doc.moveDown(1.2);
    doc.font('Helvetica').fontSize(9);

    if (pairedData.length === 0) {
      doc.fillColor('#64748b').text('No movement activity recorded for the selected period.', 40, doc.y, { align: 'center', width: 515 });
    } else {
      pairedData.forEach((row, index) => {
        if (doc.y > 740) {
          doc.addPage();
          doc.fillColor('#3b82f6').rect(40, doc.y - 5, 515, 20).fill();
          doc.fillColor('#ffffff').font('Helvetica-Bold');
          let hx = 40;
          headers.forEach((h, i) => {
            doc.text(h, hx + 4, doc.y, { width: colWidths[i], align: i === 0 ? 'center' : 'left' });
            hx += colWidths[i];
          });
          doc.moveDown(1).fillColor('#0f172a').font('Helvetica');
        }

        const y = doc.y;
        if (index % 2 === 0) doc.rect(40, y - 2, 515, 18).fill('#f8fafc');
        doc.fillColor('#0f172a');

        const outStr = row.outTime ? new Date(row.outTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '-';
        const inStr = row.inTime ? new Date(row.inTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : (row.outTime ? 'Still OUT' : '-');

        const values = [(index + 1).toString(), row.name, row.roll || '-', row.hostel || '-', outStr, inStr];
        let cx = 40;
        values.forEach((v, i) => {
          doc.text(v || '-', cx + 4, y, { width: colWidths[i], align: i === 0 ? 'center' : 'left', lineBreak: false });
          cx += colWidths[i];
        });
        doc.moveDown(0.7);
      });
    }

    doc.end();
    const buffer = await pdfPromise;
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="campus_movement_log.pdf"',
        'Cache-Control': 'no-store, must-revalidate'
      }
    });

  } catch (err) {
    console.error('Final Paired PDF failed:', err);
    return new Response(JSON.stringify({ error: 'PDF Failure', details: err.message }), { status: 500 });
  }
}
