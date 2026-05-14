const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'booking_confirmed', 'booking_cancelled', 'booking_completed',
      'driver_assigned', 'delivery_status', 'service_started',
      'payment_received', 'promotion', 'reminder', 'review_request',
      'new_delivery', 'earning'
    ],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  icon: { type: String, default: '🔔' },
  data: { type: mongoose.Schema.Types.Mixed },
  read: { type: Boolean, default: false },
  readAt: Date,
  createdAt: { type: Date, default: Date.now }
});

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
