const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  read: { type: Boolean, default: false },
  readAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
