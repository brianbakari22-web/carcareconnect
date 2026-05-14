const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  
  serviceName: String,
  servicePrice: Number,
  bookingDate: { type: Date, required: true },
  bookingTime: { type: String, required: true },
  
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 
           'driver-assigned', 'pickup', 'en-route', 'delivered'],
    default: 'pending'
  },
  
  paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded'], default: 'pending' },
  totalAmount: Number,
  depositPaid: { type: Number, default: 0 },
  
  // Concierge specific
  isConcierge: { type: Boolean, default: false },
  pickupAddress: String,
  dropoffAddress: String,
  pickupTime: Date,
  enRouteTime: Date,
  dropoffTime: Date,
  
  // Real-time tracking
  driverLocation: { lat: Number, lng: Number, lastUpdate: Date },
  
  // Timestamps
  confirmedAt: Date,
  startedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancelledBy: String,
  cancellationReason: String,
  
  // Ratings
  customerRatingProvider: { type: Number, min: 1, max: 5 },
  customerReviewProvider: String,
  customerRatingDriver: { type: Number, min: 1, max: 5 },
  customerReviewDriver: String,
  providerRatingCustomer: { type: Number, min: 1, max: 5 },
  providerReviewCustomer: String,
  driverRatingCustomer: { type: Number, min: 1, max: 5 },
  driverReviewCustomer: String,
  
  // Notes
  customerNotes: String,
  providerNotes: String,
  driverNotes: String
}, { timestamps: true });

// Indexes
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ providerId: 1, createdAt: -1 });
bookingSchema.index({ driverId: 1, status: 1 });
bookingSchema.index({ status: 1, bookingDate: 1 });

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;

