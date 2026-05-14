const Refund = require('../models/Refund');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const User = require('../models/User');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { sendEmail } = require('../services/emailService');

// Customer requests refund
const requestRefund = async (req, res) => {
  try {
    const { bookingId, reason } = req.body;
    
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Check if booking belongs to customer
    if (booking.customerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Check if already refunded
    const existingRefund = await Refund.findOne({ bookingId, status: { $in: ['pending', 'approved', 'completed'] } });
    if (existingRefund) {
      return res.status(400).json({ error: 'Refund already requested or processed' });
    }
    
    // Check if booking is eligible for refund (within 30 days, not cancelled)
    const daysSinceBooking = (Date.now() - new Date(booking.createdAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceBooking > 30) {
      return res.status(400).json({ error: 'Booking is older than 30 days. Cannot request refund.' });
    }
    
    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking already cancelled' });
    }
    
    // Get payment details
    const payment = await Payment.findOne({ bookingId, paymentStatus: 'completed' });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found for this booking' });
    }
    
    const refund = await Refund.create({
      bookingId,
      customerId: req.user.id,
      providerId: booking.providerId,
      amount: payment.amount,
      reason,
      status: 'pending'
    });
    
    // Notify admin (you can add email here)
    console.log(`💰 Refund requested for booking ${bookingId} by ${req.user.id}`);
    
    res.json({ success: true, refund, message: 'Refund request submitted. Admin will review.' });
  } catch (error) {
    console.error('Request refund error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get customer's refund requests
const getMyRefunds = async (req, res) => {
  try {
    const refunds = await Refund.find({ customerId: req.user.id })
      .populate('bookingId', 'serviceName bookingDate status')
      .sort({ requestedAt: -1 });
    
    res.json({ success: true, refunds });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin gets all refund requests
const getAllRefunds = async (req, res) => {
  try {
    const refunds = await Refund.find()
      .populate('bookingId', 'serviceName bookingDate status totalAmount')
      .populate('customerId', 'firstName lastName email')
      .populate('providerId', 'businessName firstName lastName')
      .sort({ requestedAt: -1 });
    
    res.json({ success: true, refunds });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin approves refund
const approveRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    
    const refund = await Refund.findById(id);
    if (!refund) {
      return res.status(404).json({ error: 'Refund not found' });
    }
    
    if (refund.status !== 'pending') {
      return res.status(400).json({ error: `Refund already ${refund.status}` });
    }
    
    // Get payment details
    const payment = await Payment.findOne({ bookingId: refund.bookingId });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    // Process refund with Stripe
    let stripeRefund;
    try {
      stripeRefund = await stripe.refunds.create({
        payment_intent: payment.paymentIntentId,
        amount: Math.round(refund.amount * 100)
      });
    } catch (stripeError) {
      console.error('Stripe refund error:', stripeError);
      return res.status(400).json({ error: 'Stripe refund failed: ' + stripeError.message });
    }
    
    // Update refund status
    refund.status = 'approved';
    refund.adminNotes = adminNotes;
    refund.stripeRefundId = stripeRefund.id;
    refund.processedAt = new Date();
    refund.processedBy = req.user.id;
    await refund.save();
    
    // Update payment status
    payment.paymentStatus = 'refunded';
    payment.refundAmount = refund.amount;
    payment.refundedAt = new Date();
    await payment.save();
    
    // Update booking status
    await Booking.findByIdAndUpdate(refund.bookingId, { 
      status: 'cancelled',
      paymentStatus: 'refunded'
    });
    
    // Send email notifications
    const booking = await Booking.findById(refund.bookingId)
      .populate('customerId', 'email firstName lastName')
      .populate('providerId', 'email businessName');
    
    // Email to customer
    const customerEmailHtml = `
      <h2>Refund Approved ✅</h2>
      <p>Dear ${booking.customerId.firstName},</p>
      <p>Your refund request for <strong>${booking.serviceName}</strong> has been approved.</p>
      <p><strong>Amount Refunded:</strong> $${refund.amount}</p>
      <p>The refund will appear on your statement within 5-10 business days.</p>
    `;
    
    await sendEmail(booking.customerId.email, 'Refund Approved - Car Care Connect', customerEmailHtml);
    
    // Email to provider
    const providerEmailHtml = `
      <h2>Booking Cancelled - Refund Issued</h2>
      <p>Dear ${booking.providerId.businessName || booking.providerId.firstName},</p>
      <p>A refund has been issued for the following booking:</p>
      <p><strong>Service:</strong> ${booking.serviceName}</p>
      <p><strong>Amount Refunded:</strong> $${refund.amount}</p>
      <p>The funds have been deducted from your pending earnings.</p>
    `;
    
    await sendEmail(booking.providerId.email, 'Refund Processed - Car Care Connect', providerEmailHtml);
    
    res.json({ success: true, refund });
  } catch (error) {
    console.error('Approve refund error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Admin rejects refund
const rejectRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const refund = await Refund.findById(id);
    if (!refund) {
      return res.status(404).json({ error: 'Refund not found' });
    }
    
    if (refund.status !== 'pending') {
      return res.status(400).json({ error: `Refund already ${refund.status}` });
    }
    
    refund.status = 'rejected';
    refund.rejectionReason = rejectionReason;
    refund.processedAt = new Date();
    refund.processedBy = req.user.id;
    await refund.save();
    
    // Email to customer
    const booking = await Booking.findById(refund.bookingId)
      .populate('customerId', 'email firstName lastName');
    
    const emailHtml = `
      <h2>Refund Request Update</h2>
      <p>Dear ${booking.customerId.firstName},</p>
      <p>Your refund request for <strong>${booking.serviceName}</strong> has been reviewed.</p>
      <p><strong>Status:</strong> ❌ Rejected</p>
      <p><strong>Reason:</strong> ${rejectionReason}</p>
      <p>If you have questions, please contact support.</p>
    `;
    
    await sendEmail(booking.customerId.email, 'Refund Request Update - Car Care Connect', emailHtml);
    
    res.json({ success: true, refund });
  } catch (error) {
    console.error('Reject refund error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  requestRefund,
  getMyRefunds,
  getAllRefunds,
  approveRefund,
  rejectRefund
};
