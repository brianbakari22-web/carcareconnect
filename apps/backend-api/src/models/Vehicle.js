const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  make: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  licensePlate: {
    type: String,
    required: true,
    unique: true
  },
  color: String,
  isPrimary: {
    type: Boolean,
    default: false
  },
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
