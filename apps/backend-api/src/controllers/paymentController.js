const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { sendCustomerReceipt, sendProviderPaymentNotification } = require('../services/emailService');

// Create Stripe Payment Intent
const createPaymentIntent = async (req, res) => {
  try {
    const { bookingId, amount } = req.body;
    
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const platformCommission = amount * 0.15;
    const providerEarnings = amount * 0.70;
    const driverEarnings = amount * 0.15;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      metadata: { bookingId, customerId: req.user.id }
    });
    
    const payment = await Payment.create({
      bookingId,
      customerId: req.user.id,
      providerId: booking.providerId,
      amount,
      currency: 'USD',
      paymentMethod: 'card',
      paymentStatus: 'pending',
      paymentIntentId: paymentIntent.id,
      platformCommission,
      providerEarnings,
      driverEarnings
    });
    
    res.json({ success: true, clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Confirm Payment - WITH EMAIL INTEGRATION
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, bookingId } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      const payment = await Payment.findOneAndUpdate(
        { paymentIntentId },
        { paymentStatus: 'completed', paidAt: new Date() },
        { new: true }
      );
      
      await Booking.findByIdAndUpdate(bookingId, { 
        paymentStatus: 'paid',
        status: 'confirmed'
      });
      
      // === SEND EMAIL RECEIPTS ===
      try {
        // Get booking details with user info
        const booking = await Booking.findById(bookingId)
          .populate('customerId', 'email firstName lastName')
          .populate('providerId', 'email businessName firstName lastName');
        
        if (booking && payment) {
          // Prepare email data
          const emailData = {
            _id: payment._id,
            paidAt: payment.paidAt || new Date(),
            amount: payment.amount,
            paymentMethod: 'card',
            platformCommission: payment.platformCommission || payment.amount * 0.15,
            providerEarnings: payment.providerEarnings || payment.amount * 0.70,
            transactionId: paymentIntent.id
          };
          
          const bookingData = {
            customerName: `${booking.customerId?.firstName || ''} ${booking.customerId?.lastName || ''}`.trim(),
            customerEmail: booking.customerId?.email,
            providerName: booking.providerId?.businessName || `${booking.providerId?.firstName || ''} ${booking.providerId?.lastName || ''}`.trim(),
            providerEmail: booking.providerId?.email,
            serviceName: booking.serviceName,
            bookingDate: booking.bookingDate,
            bookingTime: booking.bookingTime
          };
          
          // Send emails (don't wait for response)
          if (bookingData.customerEmail) {
            sendCustomerReceipt(bookingData, emailData).catch(err => console.error('Customer email failed:', err));
          }
          if (bookingData.providerEmail) {
            sendProviderPaymentNotification(bookingData, emailData).catch(err => console.error('Provider email failed:', err));
          }
          
          console.log('📧 Email receipts sent to:', bookingData.customerEmail, bookingData.providerEmail);
        }
      } catch (emailError) {
        console.error('Email sending error (non-critical):', emailError);
        // Don't fail the payment if email fails
      }
      
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Payment not successful' });
    }
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Cash Payment - WITH EMAIL INTEGRATION
const processCashPayment = async (req, res) => {
  try {
    const { bookingId, amount } = req.body;
    
    const booking = await Booking.findById(bookingId)
      .populate('customerId', 'email firstName lastName')
      .populate('providerId', 'email businessName firstName lastName');
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const platformCommission = amount * 0.15;
    const providerEarnings = amount * 0.70;
    const driverEarnings = amount * 0.15;
    
    const payment = await Payment.create({
      bookingId,
      customerId: req.user.id,
      providerId: booking.providerId,
      amount,
      currency: 'USD',
      paymentMethod: 'cash',
      paymentStatus: 'pending',
      platformCommission,
      providerEarnings,
      driverEarnings
    });
    
    await Booking.findByIdAndUpdate(bookingId, { 
      paymentStatus: 'pending',
      status: 'confirmed'
    });
    
    // === SEND EMAIL CONFIRMATION FOR CASH PAYMENT ===
    try {
      const emailData = {
        _id: payment._id,
        paidAt: null,
        amount: payment.amount,
        paymentMethod: 'cash',
        platformCommission: platformCommission,
        providerEarnings: providerEarnings
      };
      
      const bookingData = {
        customerName: `${booking.customerId?.firstName || ''} ${booking.customerId?.lastName || ''}`.trim(),
        customerEmail: booking.customerId?.email,
        providerName: booking.providerId?.businessName || `${booking.providerId?.firstName || ''} ${booking.providerId?.lastName || ''}`.trim(),
        providerEmail: booking.providerId?.email,
        serviceName: booking.serviceName,
        bookingDate: booking.bookingDate,
        bookingTime: booking.bookingTime
      };
      
      if (bookingData.customerEmail) {
        sendCustomerReceipt(bookingData, emailData).catch(err => console.error('Customer email failed:', err));
      }
      if (bookingData.providerEmail) {
        sendProviderPaymentNotification(bookingData, emailData).catch(err => console.error('Provider email failed:', err));
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }
    
    res.json({ success: true, payment });
  } catch (error) {
    console.error('Cash payment error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get Payment History
const getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ customerId: req.user.id })
      .populate('bookingId', 'serviceName bookingDate')
      .sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get payment history' });
  }
};

// Get Provider Earnings
const getProviderEarnings = async (req, res) => {
  try {
    const earnings = await Payment.aggregate([
      { $match: { providerId: req.user.id, paymentStatus: 'completed' } },
      { $group: { _id: null, totalEarnings: { $sum: '$providerEarnings' }, totalBookings: { $sum: 1 } } }
    ]);
    
    const pendingPayout = await Payment.aggregate([
      { $match: { providerId: req.user.id, paymentStatus: 'completed', providerPayoutStatus: 'pending' } },
      { $group: { _id: null, total: { $sum: '$providerEarnings' } } }
    ]);
    
    const recentPayments = await Payment.find({ 
      providerId: req.user.id, 
      paymentStatus: 'completed' 
    })
      .populate('bookingId', 'serviceName')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({
      success: true,
      earnings: earnings[0] || { totalEarnings: 0, totalBookings: 0 },
      pendingPayout: pendingPayout[0]?.total || 0,
      recentPayments
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get earnings' });
  }
};

// Request Provider Payout
const requestProviderPayout = async (req, res) => {
  try {
    await Payment.updateMany(
      { providerId: req.user.id, paymentStatus: 'completed', providerPayoutStatus: 'pending' },
      { providerPayoutStatus: 'processing', providerPayoutDate: new Date() }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request payout' });
  }
};

// Get Provider Payout History
const getProviderPayoutHistory = async (req, res) => {
  try {
    const payouts = await Payment.aggregate([
      { $match: { providerId: req.user.id, providerPayoutStatus: 'completed' } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$providerPayoutDate' } },
        amount: { $sum: '$providerEarnings' },
        count: { $sum: 1 },
        date: { $first: '$providerPayoutDate' }
      }},
      { $sort: { _id: -1 } }
    ]);
    
    const pendingPayouts = await Payment.aggregate([
      { $match: { providerId: req.user.id, paymentStatus: 'completed', providerPayoutStatus: 'pending' } },
      { $group: { _id: null, total: { $sum: '$providerEarnings' }, count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      payoutHistory: payouts,
      pendingAmount: pendingPayouts[0]?.total || 0,
      pendingCount: pendingPayouts[0]?.count || 0
    });
  } catch (error) {
    console.error('Get provider payout history error:', error);
    res.status(500).json({ error: 'Failed to get payout history' });
  }
};

// Get Driver Earnings
const getDriverEarnings = async (req, res) => {
  try {
    const earnings = await Payment.aggregate([
      { $match: { driverId: req.user.id, paymentStatus: 'completed' } },
      { $group: { _id: null, totalEarnings: { $sum: '$driverEarnings' }, totalDeliveries: { $sum: 1 } } }
    ]);
    res.json({ success: true, earnings: earnings[0] || { totalEarnings: 0, totalDeliveries: 0 } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get earnings' });
  }
};

// Request Driver Payout
const requestDriverPayout = async (req, res) => {
  try {
    await Payment.updateMany(
      { driverId: req.user.id, paymentStatus: 'completed', driverPayoutStatus: 'pending' },
      { driverPayoutStatus: 'processing', driverPayoutDate: new Date() }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request payout' });
  }
};

// Get Platform Revenue (Admin)
const getPlatformRevenue = async (req, res) => {
  try {
    const stats = await Payment.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, commission: { $sum: '$platformCommission' } } }
    ]);
    res.json({ success: true, revenue: stats[0] || { total: 0, commission: 0 } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get revenue' });
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  processCashPayment,
  getPaymentHistory,
  getProviderEarnings,
  requestProviderPayout,
  getProviderPayoutHistory,
  getDriverEarnings,
  requestDriverPayout,
  getPlatformRevenue
};
