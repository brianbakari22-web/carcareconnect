const mongoose = require('mongoose');

const loyaltySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  points: { type: Number, default: 0 },
  lifetimePoints: { type: Number, default: 0 },
  tier: { type: String, enum: ['Bronze', 'Silver', 'Gold', 'Platinum'], default: 'Bronze' },
  transactions: [{
    type: { type: String, enum: ['earn', 'redeem'], required: true },
    points: { type: Number, required: true },
    description: { type: String },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Update tier based on lifetime points
loyaltySchema.methods.updateTier = function() {
  if (this.lifetimePoints >= 10000) this.tier = 'Platinum';
  else if (this.lifetimePoints >= 5000) this.tier = 'Gold';
  else if (this.lifetimePoints >= 1000) this.tier = 'Silver';
  else this.tier = 'Bronze';
  return this.tier;
};

module.exports = mongoose.model('Loyalty', loyaltySchema);
