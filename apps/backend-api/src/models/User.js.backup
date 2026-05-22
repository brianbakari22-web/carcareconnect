const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['customer', 'provider', 'driver', 'admin'], default: 'customer' },
  
  // Provider fields
  businessName: String,
  businessLicense: String,
  businessAddress: String,
  isVerified: { type: Boolean, default: false },
  rating: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  
  // Driver fields
  driversLicense: String,
  vehicleModel: String,
  vehicleColor: String,
  vehiclePlate: String,
  isOnline: { type: Boolean, default: false },
  currentLocation: { lat: Number, lng: Number, address: String, lastUpdate: Date },
  totalDeliveries: { type: Number, default: 0 },
  
  // Stripe Connect fields
  stripeAccountId: { type: String, default: null },
  stripeAccountStatus: { type: String, enum: ['pending', 'active', 'error', null], default: null },
  
  // Bank Account
  bankAccount: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    routingNumber: String,
    lastUpdated: Date
  },
  
  // Settings
  settings: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    darkMode: { type: Boolean, default: false }
  },
  
  isActive: { type: Boolean, default: true },
  lastActive: Date
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
