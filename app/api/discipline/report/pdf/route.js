import sql from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import PDFDocument from 'pdfkit';

export async function GET(request) {
  const user = verifyAuth(request);
  if (!user) return new Response(JSON.stringify({ error: 'No token' }), { status: 401 });

  if (user.email !== 'discipline@nimbus.com' && user.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403 });
  }

  try {
    // Fetch logs with student info
    const logs = await sql`
      SELECT l.action, l.timestamp, s.name as student_name, s.roll_number, s.hostel
      FROM campus_status_logs l
      JOIN students s ON l.student_id = s.id
      ORDER BY l.timestamp DESC
      LIMIT 1000
    `;

    // Create PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    const pdfPromise = new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // --- Header ---
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1e3a8a').text('CAMPUS STATUS HISTORY REPORT', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`Status Logs - Generated On: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
    doc.moveDown(2);

    // --- Table Headers ---
    const tableTop = doc.y;
    const colWidths = [25, 120, 110, 80, 100, 80]; 
    const headers = ['#', 'Student Name', 'Roll No', 'Hostel', 'Action', 'Log (Time)'];

    doc.rect(40, tableTop - 5, 515, 22).fill('#3b82f6');
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');

    let x = 40;
    headers.forEach((h, i) => {
      doc.text(h, x + 4, tableTop, { width: colWidths[i], align: i === 0 || i === 4 ? 'center' : 'left' });
      x += colWidths[i];
    });

    doc.moveDown(1);
    doc.font('Helvetica').fontSize(9).fillColor('#0f172a');

    // --- Logs ---
    logs.forEach((log, index) => {
      if (doc.y > 740) {
        doc.addPage();
        doc.fillColor('#3b82f6').rect(40, doc.y - 5, 515, 20).fill();
        doc.fillColor('#ffffff').font('Helvetica-Bold');
        let hx = 40;
        headers.forEach((h, i) => {
          doc.text(h, hx + 4, doc.y, { width: colWidths[i], align: i === 0 || i === 4 ? 'center' : 'left' });
          hx += colWidths[i];
        });
        doc.moveDown(1).fillColor('#0f172a').font('Helvetica');
      }

      const y = doc.y;
      if (index % 2 === 0) doc.rect(40, y - 2, 515, 18).fill('#f8fafc');
      doc.fillColor('#0f172a');

      const actionText = log.action === 'in' ? 'ENTRY (Inside)' : 'EXIT (Outside)';
      const timestampText = new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const values = [(index + 1).toString(), log.student_name, log.roll_number || '-', log.hostel || '-', actionText, timestampText];

      let cx = 40;
      values.forEach((v, i) => {
        doc.text(v, cx + 4, y, { width: colWidths[i], align: i === 0 || i === 4 ? 'center' : 'left' });
        cx += colWidths[i];
      });

      doc.moveDown(0.7);
    });

    doc.end();
    const pdfBuffer = await pdfPromise;

    return new Response(pdfBuffer, {
      status: 200,
      headers: { 
        'Content-Type': 'application/pdf', 
        'Content-Disposition': 'attachment; filename="campus_status_report.pdf"' 
      },
    });
  } catch (err) {
    console.error('PDF Status report critical failure:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate report.' }), { status: 500 });
  }
}
