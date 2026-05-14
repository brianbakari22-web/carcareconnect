const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['oil-change', 'brake-repair', 'tire-service', 'engine-repair', 'ac-repair', 'transmission', 'detailing', 'maintenance', 'electrical', 'body-repair'],
    required: true
  },
  price: { type: Number, required: true },
  discountedPrice: Number,
  duration: { type: Number, required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerName: String,
  providerBusinessName: String,
  providerRating: Number,
  images: [String],
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  totalBookings: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  tags: [String],
  warranty: String,
  requirements: [String],
  inclusions: [String]
}, { timestamps: true });

// Index for search
serviceSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Service', serviceSchema);
