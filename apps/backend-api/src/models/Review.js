const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  providerRating: { type: Number, min: 1, max: 5, required: true },
  providerReview: { type: String, maxlength: 500 },
  driverRating: { type: Number, min: 1, max: 5 },
  driverReview: { type: String, maxlength: 500 },
  providerResponse: { type: String, maxlength: 500 },
  providerResponseAt: Date,
  isVerifiedPurchase: { type: Boolean, default: true },
  isHidden: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
