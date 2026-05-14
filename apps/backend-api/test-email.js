// test-email.js - Test email configuration
require('dotenv').config();
const { sendCustomerReceipt, sendProviderPaymentNotification } = require('./src/services/emailService');

const testBooking = {
  customerName: 'Test Customer',
  customerEmail: 'test@example.com', // Replace with your email for testing
  providerName: 'Test Provider',
  providerEmail: 'test@example.com', // Replace with your email for testing
  serviceName: 'Oil Change',
  bookingDate: new Date(),
  bookingTime: '10:00 AM'
};

const testPayment = {
  _id: 'test123',
  paidAt: new Date(),
  amount: 100,
  paymentMethod: 'card',
  platformCommission: 15,
  providerEarnings: 70
};

async function test() {
  console.log('Testing email receipts...');
  await sendCustomerReceipt(testBooking, testPayment);
  await sendProviderPaymentNotification(testBooking, testPayment);
  console.log('Test complete. Check your email.');
}

test();
