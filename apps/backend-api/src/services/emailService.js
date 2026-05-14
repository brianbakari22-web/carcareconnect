const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Customer receipt template - FIXED
const getCustomerReceiptTemplate = (booking, payment) => {
  // Convert ObjectId to string safely
  const receiptId = payment._id ? payment._id.toString().slice(-8) : Math.random().toString(36).substring(2, 10);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payment Receipt - Car Care Connect</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .receipt-box { background-color: white; padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid #e5e7eb; }
        .amount { font-size: 32px; font-weight: bold; color: #10b981; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 8px 0; }
        .label { font-weight: bold; }
        hr { margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚗💨 Car Care Connect</h1>
          <p>Payment Receipt</p>
        </div>
        <div class="content">
          <h2>Thank you for your payment!</h2>
          <p>Dear ${booking.customerName || 'Customer'},</p>
          <p>Your payment has been successfully processed. Here are your receipt details:</p>
          
          <div class="receipt-box">
            <h3>Receipt #${receiptId}</h3>
            <table>
              <tr><td class="label">Date:</td><td>${new Date(payment.paidAt || Date.now()).toLocaleString()}</td></tr>
              <tr><td class="label">Service:</td><td>${booking.serviceName || 'Service'}</td></tr>
              <tr><td class="label">Provider:</td><td>${booking.providerName || 'Provider'}</td></tr>
              <tr><td class="label">Booking Date:</td><td>${new Date(booking.bookingDate).toLocaleDateString()} at ${booking.bookingTime}</td></tr>
              <tr><td class="label">Payment Method:</td><td>${payment.paymentMethod === 'card' ? '💳 Credit Card' : '💵 Cash'}</td></tr>
              <tr><td class="label">Transaction ID:</td><td>${payment.transactionId || payment._id?.toString().slice(-8) || 'N/A'}</td></tr>
              <tr><td colspan="2"><hr></td></tr>
              <tr><td class="label">Amount Paid:</td><td class="amount">$${payment.amount}</td></tr>
            </table>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px;">
            <h4>💰 Payment Breakdown</h4>
            <table>
              <tr><td>Service Cost:</td><td align="right">$${payment.amount}</td></tr>
              <tr><td>Platform Fee (15%):</td><td align="right">$${(payment.platformCommission || payment.amount * 0.15).toFixed(2)}</td></tr>
              <tr><td><strong>Total Charged:</strong></td><td align="right"><strong>$${payment.amount}</strong></td></tr>
            </table>
          </div>
          
          <p style="margin-top: 20px;">Your booking has been confirmed. You can track its status in your dashboard.</p>
          <p>Need help? Contact our support team at support@carcareconnect.com</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Car Care Connect. All rights reserved.</p>
          <p>This is an automated receipt, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Provider payment template - FIXED
const getProviderPaymentTemplate = (booking, payment) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payment Received - Car Care Connect</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .amount { font-size: 36px; font-weight: bold; color: #10b981; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 8px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Payment Received!</h1>
        </div>
        <div class="content">
          <h2>Great news, ${booking.providerName}!</h2>
          <p>A customer has paid for your service.</p>
          
          <div class="receipt-box" style="background-color: white; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3>Payment Details</h3>
            <table>
              <tr><td><strong>Customer:</strong></td><td>${booking.customerName}</td></tr>
              <tr><td><strong>Service:</strong></td><td>${booking.serviceName}</td></tr>
              <tr><td><strong>Date:</strong></td><td>${new Date(booking.bookingDate).toLocaleDateString()} at ${booking.bookingTime}</td></tr>
              <tr><td><strong>Payment Method:</strong></td><td>${payment.paymentMethod === 'card' ? '💳 Credit Card' : '💵 Cash'}</td></tr>
              <tr><td colspan="2"><hr></td></tr>
              <tr><td><strong>Amount Paid:</strong></td><td><strong class="amount">$${payment.amount}</strong></td></tr>
              <tr><td><strong>Your Earnings (70%):</strong></td><td><strong>$${(payment.providerEarnings || payment.amount * 0.70).toFixed(2)}</strong></td></tr>
            </table>
          </div>
          
          <div style="background-color: #d1fae5; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p>💡 <strong>Your earnings will be available for payout in your dashboard.</strong></p>
            <p>You can request a payout once you have sufficient balance.</p>
          </div>
          
          <p style="margin-top: 20px;">Log in to your dashboard to view all earnings and manage payouts.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Car Care Connect</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send email function
const sendEmail = async (to, subject, html) => {
  if (!to || to === 'undefined' || to === 'null' || to === '') {
    console.error('❌ Invalid recipient email address');
    return { success: false, error: 'Invalid recipient email' };
  }
  
  try {
    const mailOptions = {
      from: `"Car Care Connect" <${process.env.SMTP_FROM || 'noreply@carcareconnect.com'}>`,
      to,
      subject,
      html
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

// Send customer receipt
const sendCustomerReceipt = async (booking, payment) => {
  console.log(`📧 Sending customer receipt to: ${booking.customerEmail}`);
  const subject = `Your Payment Receipt - ${booking.serviceName}`;
  const html = getCustomerReceiptTemplate(booking, payment);
  return await sendEmail(booking.customerEmail, subject, html);
};

// Send provider payment notification
const sendProviderPaymentNotification = async (booking, payment) => {
  console.log(`📧 Sending provider notification to: ${booking.providerEmail}`);
  const subject = `Payment Received - ${booking.serviceName}`;
  const html = getProviderPaymentTemplate(booking, payment);
  return await sendEmail(booking.providerEmail, subject, html);
};

module.exports = {
  sendCustomerReceipt,
  sendProviderPaymentNotification,
  sendEmail
};
