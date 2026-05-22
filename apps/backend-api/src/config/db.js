const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use environment variable MONGODB_URI or fallback to localhost
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/carcareconnect';
    
    console.log('Attempting to connect to MongoDB...');
    console.log('Using URI:', mongoURI.replace(/\/\/.*@/, '//<credentials>@')); // Hide password in logs
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
    });
    
    console.log('✅ MongoDB connected successfully to Car Care Connect database');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('Please check:');
    console.error('  1. MONGODB_URI environment variable is set correctly');
    console.error('  2. MongoDB Atlas IP whitelist includes 0.0.0.0/0');
    console.error('  3. Database user credentials are correct');
    process.exit(1);
  }
};

module.exports = connectDB;
