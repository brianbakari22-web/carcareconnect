const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'paypal', 'mpesa', 'cash', 'bank_transfer'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: String,
  paymentIntentId: String,
  platformCommission: { type: Number, default: 0 },
  commissionRate: { type: Number, default: 15 },
  providerEarnings: { type: Number, default: 0 },
  driverEarnings: { type: Number, default: 0 },
  providerPayoutStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  driverPayoutStatus: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  providerPayoutDate: Date,
  driverPayoutDate: Date,
  refundAmount: { type: Number, default: 0 },
  refundReason: String,
  refundedAt: Date,
  paidAt: Date,
  createdAt: { type: Date, default: Date.now }
});

// NO pre-save middleware - will calculate commissions in controller instead

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
