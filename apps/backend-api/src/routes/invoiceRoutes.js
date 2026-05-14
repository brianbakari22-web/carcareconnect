const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const User = require('../models/User');
const PDFDocument = require('pdfkit');

// Helper function to generate invoice HTML
const generateInvoiceHTML = (booking, payment, customer, provider) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${payment._id}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .invoice-container { max-width: 800px; margin: 0 auto; background: white; }
        .header { text-align: center; padding: 20px; border-bottom: 2px solid #8b5cf6; }
        .logo { font-size: 28px; font-weight: bold; color: #8b5cf6; }
        .title { font-size: 20px; color: #333; margin-top: 10px; }
        .invoice-details { display: flex; justify-content: space-between; margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px; }
        .section { margin: 20px 0; }
        .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #374151; border-left: 3px solid #8b5cf6; padding-left: 10px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .total-row { font-size: 18px; font-weight: bold; margin-top: 15px; padding-top: 15px; border-top: 2px solid #8b5cf6; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        .status-paid { background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 20px; display: inline-block; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="logo">🚗💨 CAR CARE CONNECT</div>
          <div class="title">Official Invoice</div>
        </div>
        
        <div class="invoice-details">
          <div>
            <strong>Invoice Number:</strong> INV-${payment._id.toString().slice(-8)}<br>
            <strong>Date:</strong> ${new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}<br>
            <strong>Status:</strong> <span class="status-paid">PAID</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">BILL TO</div>
          <div>${customer.name}</div>
          <div>${customer.email}</div>
          <div>${customer.phone || 'N/A'}</div>
        </div>
        
        <div class="section">
          <div class="section-title">SERVICE PROVIDER</div>
          <div>${provider.name}</div>
          <div>${provider.email}</div>
        </div>
        
        <div class="section">
          <div class="section-title">SERVICE DETAILS</div>
          <div class="row"><span>${booking.serviceName || 'Auto Service'}</span><span>$${payment.amount?.toFixed(2)}</span></div>
          ${booking.bookingDate ? `<div class="row"><span>Booking Date</span><span>${new Date(booking.bookingDate).toLocaleDateString()} ${booking.bookingTime || ''}</span></div>` : ''}
        </div>
        
        <div class="section">
          <div class="section-title">AMOUNT BREAKDOWN</div>
          <div class="row"><span>Subtotal</span><span>$${payment.amount?.toFixed(2)}</span></div>
          <div class="row"><span>Platform Fee (15%)</span><span>-$${(payment.platformCommission || payment.amount * 0.15).toFixed(2)}</span></div>
          <div class="row"><span>Provider Earnings (70%)</span><span>$${(payment.providerEarnings || payment.amount * 0.70).toFixed(2)}</span></div>
          <div class="row total-row"><span>TOTAL PAID</span><span>$${payment.amount?.toFixed(2)}</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">PAYMENT METHOD</div>
          <div>${payment.paymentMethod === 'card' ? '💳 Credit/Debit Card' : payment.paymentMethod === 'cash' ? '💵 Cash' : '💰 Online Payment'}</div>
          ${payment.transactionId ? `<div>Transaction ID: ${payment.transactionId}</div>` : ''}
        </div>
        
        <div class="footer">
          <p>Thank you for choosing Car Care Connect!</p>
          <p>For questions, contact: support@carcareconnect.com</p>
          <p>This is a computer-generated invoice and does not require a signature.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Get invoice as HTML (for email or browser preview)
router.get('/html/:paymentId', protect, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    const booking = await Booking.findById(payment.bookingId);
    const customer = await User.findById(payment.customerId);
    const provider = await User.findById(payment.providerId);
    
    const invoiceHTML = generateInvoiceHTML(booking, payment, {
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone
    }, {
      name: provider.businessName || `${provider.firstName} ${provider.lastName}`,
      email: provider.email
    });
    
    res.send(invoiceHTML);
  } catch (error) {
    console.error('HTML invoice error:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

// Generate and download PDF invoice
router.get('/download/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find payment first
    let payment = await Payment.findById(id)
      .populate('customerId', 'firstName lastName email phone')
      .populate('providerId', 'firstName lastName businessName email')
      .populate('bookingId', 'serviceName bookingDate bookingTime totalAmount');
    
    // If not found as payment, try as booking
    if (!payment) {
      const booking = await Booking.findById(id)
        .populate('customerId', 'firstName lastName email phone')
        .populate('providerId', 'firstName lastName businessName email');
      
      if (!booking) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // Create payment-like object from booking
      payment = {
        _id: booking._id,
        amount: booking.totalAmount,
        paymentMethod: booking.paymentMethod || 'unknown',
        paymentStatus: booking.paymentStatus || 'paid',
        paidAt: booking.createdAt,
        customerId: booking.customerId,
        providerId: booking.providerId,
        bookingId: booking,
        platformCommission: booking.totalAmount * 0.15,
        providerEarnings: booking.totalAmount * 0.70,
        transactionId: booking.transactionId
      };
    }
    
    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${payment._id}.pdf`);
    
    doc.pipe(res);
    
    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('CAR CARE CONNECT', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text('Official Invoice', { align: 'center' });
    doc.moveDown();
    
    // Invoice Details
    doc.fontSize(10).text(`Invoice Number: INV-${payment._id.toString().slice(-8)}`, { align: 'right' });
    doc.text(`Date: ${new Date(payment.paidAt || payment.createdAt).toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();
    
    // Divider
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    
    // From - Customer
    doc.font('Helvetica-Bold').fontSize(12).text('BILL TO:', { continued: true });
    doc.font('Helvetica').text('', { align: 'right' });
    doc.fontSize(10).font('Helvetica').text(`${payment.customerId?.firstName} ${payment.customerId?.lastName}`);
    doc.text(payment.customerId?.email || 'N/A');
    doc.text(payment.customerId?.phone || 'N/A');
    doc.moveDown();
    
    // To - Provider
    doc.font('Helvetica-Bold').text('SERVICE PROVIDER:');
    doc.font('Helvetica').text(payment.providerId?.businessName || `${payment.providerId?.firstName} ${payment.providerId?.lastName}`);
    doc.text(payment.providerId?.email || 'N/A');
    doc.moveDown();
    
    // Service Details
    doc.font('Helvetica-Bold').text('SERVICE DETAILS:');
    doc.moveDown(0.5);
    
    // Table header
    const tableTop = doc.y;
    doc.font('Helvetica-Bold').text('Description', 50, tableTop);
    doc.text('Amount', 400, tableTop, { align: 'right' });
    doc.moveDown();
    
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    
    // Table row
    doc.font('Helvetica').text(payment.bookingId?.serviceName || 'Auto Service', 50);
    doc.text(`$${payment.amount?.toFixed(2) || '0.00'}`, 400, doc.y - 12, { align: 'right' });
    doc.moveDown();
    
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    
    // Booking Date & Time
    if (payment.bookingId?.bookingDate) {
      doc.text(`Booking Date: ${new Date(payment.bookingId.bookingDate).toLocaleDateString()} at ${payment.bookingId.bookingTime || 'N/A'}`, 50);
      doc.moveDown();
    }
    
    // Payment Method
    doc.text(`Payment Method: ${payment.paymentMethod === 'card' ? 'Credit/Debit Card' : payment.paymentMethod === 'cash' ? 'Cash' : 'Online Payment'}`, 50);
    doc.moveDown();
    
    // Amount Breakdown
    doc.font('Helvetica-Bold').text('AMOUNT BREAKDOWN:');
    doc.moveDown(0.5);
    doc.font('Helvetica').text(`Total Amount:`, 50);
    doc.text(`$${payment.amount?.toFixed(2) || '0.00'}`, 400, doc.y - 12, { align: 'right' });
    doc.moveDown(0.5);
    doc.text(`Platform Fee (15%):`, 50);
    doc.text(`-$${(payment.platformCommission || payment.amount * 0.15)?.toFixed(2) || '0.00'}`, 400, doc.y - 12, { align: 'right' });
    doc.moveDown(0.5);
    doc.text(`Provider Earnings (70%):`, 50);
    doc.text(`$${(payment.providerEarnings || payment.amount * 0.70)?.toFixed(2) || '0.00'}`, 400, doc.y - 12, { align: 'right' });
    doc.moveDown();
    
    // Divider
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    
    // Total
    doc.font('Helvetica-Bold').fontSize(12).text('TOTAL PAID:', 50);
    doc.text(`$${payment.amount?.toFixed(2) || '0.00'}`, 400, doc.y - 12, { align: 'right' });
    doc.moveDown();
    
    // Thank you message
    doc.font('Helvetica').fontSize(10).text('Thank you for choosing Car Care Connect!', { align: 'center' });
    doc.text('For any questions, please contact support@carcareconnect.com', { align: 'center' });
    
    // Footer
    const pageHeight = doc.page.height;
    doc.fontSize(8).text(
      'This is a computer-generated invoice and does not require a signature.',
      50,
      pageHeight - 50,
      { align: 'center' }
    );
    
    doc.end();
    
  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

// Get invoice as JSON (for preview)
router.get('/preview/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    let payment = await Payment.findById(id)
      .populate('customerId', 'firstName lastName email phone')
      .populate('providerId', 'firstName lastName businessName email')
      .populate('bookingId', 'serviceName bookingDate bookingTime totalAmount');
    
    if (!payment) {
      const booking = await Booking.findById(id)
        .populate('customerId', 'firstName lastName email phone')
        .populate('providerId', 'firstName lastName businessName email');
      
      if (!booking) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      payment = {
        _id: booking._id,
        amount: booking.totalAmount,
        paymentMethod: 'unknown',
        paymentStatus: booking.paymentStatus,
        paidAt: booking.createdAt,
        customerId: booking.customerId,
        providerId: booking.providerId,
        bookingId: booking,
        platformCommission: booking.totalAmount * 0.15,
        providerEarnings: booking.totalAmount * 0.70
      };
    }
    
    res.json({ success: true, invoice: payment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get invoice' });
  }
});

module.exports = router;
