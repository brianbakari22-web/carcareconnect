// test-sms.js - Test SMS configuration
require('dotenv').config();
const { sendSMS } = require('./src/services/smsService');

const testPhone = process.env.TEST_PHONE_NUMBER || '+1YOUR_ACTUAL_PHONE'; // Replace with your phone

async function testSMS() {
  console.log('Testing SMS...');
  const result = await sendSMS(testPhone, '🧪 Car Care Connect: This is a test message. Your SMS system is working!');
  if (result.success) {
    console.log('✅ SMS sent successfully!');
  } else {
    console.log('❌ SMS failed:', result.error);
  }
}

testSMS();
