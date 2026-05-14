const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Generate Invoice PDF
const generateInvoice = (booking, payment, customer, provider) => {
  return new Promise((resolve, reject) => {
    try {
      // Create invoice directory if it doesn't exist
      const invoiceDir = path.join(__dirname, '../../invoices');
      if (!fs.existsSync(invoiceDir)) {
        fs.mkdirSync(invoiceDir, { recursive: true });
      }
      
      const filename = `invoice_${payment._id}.pdf`;
      const filepath = path.join(invoiceDir, filename);
      
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);
      
      // Header
      doc.fontSize(20)
        .fillColor('#1f2937')
        .text('Car Care Connect', { align: 'center' })
        .fontSize(10)
        .fillColor('#6b7280')
        .text('Professional Auto Service Platform', { align: 'center' })
        .moveDown();
      
      // Invoice Title
      doc.fontSize(16)
        .fillColor('#2563eb')
        .text('INVOICE', { align: 'center' })
        .moveDown();
      
      // Invoice Details
      doc.fontSize(10)
        .fillColor('#374151');
      
      // Left column - Invoice Info
      doc.text(`Invoice Number: INV-${payment._id.toString().slice(-8)}`, 50, 150);
      doc.text(`Invoice Date: ${new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}`, 50, 165);
      doc.text(`Payment Status: ${payment.paymentStatus.toUpperCase()}`, 50, 180);
      
      // Right column - Payment Method
      doc.text(`Payment Method: ${payment.paymentMethod === 'card' ? '💳 Credit Card' : '💵 Cash'}`, 350, 150);
      doc.text(`Transaction ID: ${payment.transactionId || payment.paymentIntentId?.slice(-8) || 'N/A'}`, 350, 165);
      
      doc.moveDown(2);
      
      // Horizontal Line
      doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, 210).lineTo(550, 210).stroke();
      
      // Bill To Section
      doc.fontSize(12).fillColor('#1f2937').text('Bill To:', 50, 230);
      doc.fontSize(10).fillColor('#374151');
      doc.text(customer.name || 'Customer', 50, 250);
      doc.text(customer.email || '', 50, 265);
      doc.text(customer.phone || '', 50, 280);
      
      // Service Provider
      doc.fontSize(12).fillColor('#1f2937').text('Service Provider:', 350, 230);
      doc.fontSize(10).fillColor('#374151');
      doc.text(provider.name || provider.businessName || 'Service Provider', 350, 250);
      doc.text(provider.email || '', 350, 265);
      
      doc.moveDown(2);
      
      // Table Header
      const tableTop = 340;
      doc.fontSize(10).fillColor('#1f2937');
      doc.text('Service', 50, tableTop);
      doc.text('Date', 250, tableTop);
      doc.text('Amount', 400, tableTop);
      doc.text('Total', 480, tableTop);
      
      // Table Line
      doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      
      // Table Row
      doc.fontSize(10).fillColor('#374151');
      doc.text(booking.serviceName || 'Service', 50, tableTop + 25);
      doc.text(new Date(booking.bookingDate).toLocaleDateString(), 250, tableTop + 25);
      doc.text(`$${booking.servicePrice || payment.amount}`, 400, tableTop + 25);
      doc.text(`$${payment.amount}`, 480, tableTop + 25);
      
      // Table Line
      doc.moveTo(50, tableTop + 45).lineTo(550, tableTop + 45).stroke();
      
      // Totals Section
      const totalsY = tableTop + 70;
      doc.text('Subtotal:', 400, totalsY);
      doc.text(`$${payment.amount}`, 480, totalsY);
      
      doc.text('Platform Fee (15%):', 400, totalsY + 15);
      doc.text(`-$${(payment.platformCommission || payment.amount * 0.15).toFixed(2)}`, 480, totalsY + 15);
      
      doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(400, totalsY + 25).lineTo(550, totalsY + 25).stroke();
      
      doc.fontSize(12).fillColor('#2563eb');
      doc.text('Total Paid:', 400, totalsY + 35);
      doc.text(`$${payment.amount}`, 480, totalsY + 35);
      
      // Footer
      const footerY = 750;
      doc.fontSize(8).fillColor('#9ca3af');
      doc.text('Thank you for choosing Car Care Connect!', 50, footerY, { align: 'center', width: 500 });
      doc.text('This is a system generated invoice.', 50, footerY + 15, { align: 'center', width: 500 });
      doc.text(`© ${new Date().getFullYear()} Car Care Connect. All rights reserved.`, 50, footerY + 30, { align: 'center', width: 500 });
      
      doc.end();
      
      stream.on('finish', () => {
        resolve({ success: true, filepath, filename });
      });
      
      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Generate Invoice HTML (for email attachment)
const generateInvoiceHTML = (booking, payment, customer, provider) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice - Car Care Connect</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #e5e7eb; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #1f2937; }
        .title { font-size: 20px; color: #2563eb; margin-top: 10px; }
        .info { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .bill-to, .provider { width: 45%; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background-color: #f9fafb; }
        .total { text-align: right; margin-top: 20px; }
        .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <div class="header">
          <div class="logo">🚗💨 Car Care Connect</div>
          <div class="title">INVOICE</div>
        </div>
        
        <div class="info">
          <div class="bill-to">
            <strong>Bill To:</strong><br/>
            ${customer.name}<br/>
            ${customer.email}<br/>
            ${customer.phone || ''}
          </div>
          <div class="provider">
            <strong>Service Provider:</strong><br/>
            ${provider.name}<br/>
            ${provider.email || ''}
          </div>
        </div>
        
        <div>
          <strong>Invoice Number:</strong> INV-${payment._id.toString().slice(-8)}<br/>
          <strong>Invoice Date:</strong> ${new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}<br/>
          <strong>Payment Method:</strong> ${payment.paymentMethod === 'card' ? '💳 Credit Card' : '💵 Cash'}<br/>
          <strong>Transaction ID:</strong> ${payment.transactionId || payment.paymentIntentId?.slice(-8) || 'N/A'}
        </div>
        
        <table>
          <thead>
            <tr><th>Service</th><th>Date</th><th>Amount</th><th>Total</th></tr>
          </thead>
          <tbody>
            <tr><td>${booking.serviceName}</td><td>${new Date(booking.bookingDate).toLocaleDateString()}</td><td>$${booking.servicePrice || payment.amount}</td><td>$${payment.amount}</td></tr>
          </tbody>
        </table>
        
        <div class="total">
          <p>Subtotal: $${payment.amount}</p>
          <p>Platform Fee (15%): -$${(payment.platformCommission || payment.amount * 0.15).toFixed(2)}</p>
          <h3>Total Paid: $${payment.amount}</h3>
        </div>
        
        <div class="footer">
          <p>Thank you for choosing Car Care Connect!</p>
          <p>© ${new Date().getFullYear()} Car Care Connect. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { generateInvoice, generateInvoiceHTML };
