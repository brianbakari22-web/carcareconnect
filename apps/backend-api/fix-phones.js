const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect('mongodb://localhost:27017/carcareconnect').then(async () => {
  const User = require('./src/models/User');
  
  // Add phone numbers to test accounts
  await User.updateOne(
    { email: 'customer@carcareconnect.com' },
    { $set: { phone: '+254712345678' } }
  );
  
  await User.updateOne(
    { email: 'provider@carcareconnect.com' },
    { $set: { phone: '+254798765432' } }
  );
  
  await User.updateOne(
    { email: 'driver@carcareconnect.com' },
    { $set: { phone: '+254711223344' } }
  );
  
  await User.updateOne(
    { email: 'admin@carcareconnect.com' },
    { $set: { phone: '+254700000000' } }
  );
  
  console.log('✅ Phone numbers added to test accounts!');
  
  // Verify
  const users = await User.find({ 
    email: { $in: ['customer@carcareconnect.com', 'provider@carcareconnect.com', 'driver@carcareconnect.com'] 
  } }).select('email phone');
  
  users.forEach(u => {
    console.log(`${u.email} -> ${u.phone || 'MISSING'}`);
  });
  
  process.exit();
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
