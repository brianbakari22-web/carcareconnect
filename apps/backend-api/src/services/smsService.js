const twilio = require('twilio');

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

let client = null;

if (accountSid && authToken && accountSid !== 'your_account_sid') {
  client = twilio(accountSid, authToken);
  console.log('✅ Twilio SMS client initialized');
} else {
  console.log('⚠️ Twilio not configured. SMS features disabled.');
}

// Send SMS function
const sendSMS = async (to, message) => {
  if (!client) {
    console.log('SMS disabled - Twilio not configured');
    return { success: false, error: 'Twilio not configured' };
  }
  
  // Format phone number (ensure it has country code)
  let formattedNumber = to;
  if (!to.startsWith('+')) {
    formattedNumber = '+1' + to; // Default to US/Canada
  }
  
  try {
    const result = await client.messages.create({
      body: message,
      from: twilioPhone,
      to: formattedNumber
    });
    console.log(`📱 SMS sent to ${to}: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('SMS send error:', error);
    return { success: false, error: error.message };
  }
};

// Booking Confirmation SMS for Customer
const sendBookingConfirmationSMS = async (customerPhone, customerName, serviceName, bookingDate, bookingTime) => {
  const message = `🚗 Car Care Connect: Hi ${customerName}, your ${serviceName} booking has been confirmed for ${new Date(bookingDate).toLocaleDateString()} at ${bookingTime}. Track status in your app.`;
  return await sendSMS(customerPhone, message);
};

// Payment Received SMS for Customer
const sendPaymentReceivedSMS = async (customerPhone, customerName, serviceName, amount) => {
  const message = `💰 Car Care Connect: Hi ${customerName}, payment of $${amount} for ${serviceName} has been received. Receipt sent to your email. Thank you!`;
  return await sendSMS(customerPhone, message);
};

// Driver Assigned SMS for Customer (Concierge)
const sendDriverAssignedSMS = async (customerPhone, customerName, driverName, vehicleInfo, eta) => {
  const message = `🚗 Car Care Connect: Hi ${customerName}, driver ${driverName} (${vehicleInfo}) has been assigned to pick up your vehicle. ETA: ${eta}. Track live in your app.`;
  return await sendSMS(customerPhone, message);
};

// Service Started SMS for Customer
const sendServiceStartedSMS = async (customerPhone, customerName, serviceName, providerName) => {
  const message = `🔧 Car Care Connect: Hi ${customerName}, ${providerName} has started working on your ${serviceName}. We'll notify you when complete.`;
  return await sendSMS(customerPhone, message);
};

// Service Completed SMS for Customer
const sendServiceCompletedSMS = async (customerPhone, customerName, serviceName, providerName) => {
  const message = `✅ Car Care Connect: Hi ${customerName}, your ${serviceName} at ${providerName} is complete! Your vehicle is ready for pickup.`;
  return await sendSMS(customerPhone, message);
};

// New Booking SMS for Provider
const sendNewBookingSMS = async (providerPhone, providerName, serviceName, customerName, bookingDate, bookingTime) => {
  const message = `📅 Car Care Connect: Hi ${providerName}, you have a new booking for ${serviceName} from ${customerName} on ${new Date(bookingDate).toLocaleDateString()} at ${bookingTime}. Log in to confirm.`;
  return await sendSMS(providerPhone, message);
};

// Payment Received SMS for Provider
const sendProviderPaymentSMS = async (providerPhone, providerName, serviceName, amount, earnings) => {
  const message = `💰 Car Care Connect: Hi ${providerName}, payment of $${amount} received for ${serviceName}. Your earnings: $${earnings}. Log in to view details.`;
  return await sendSMS(providerPhone, message);
};

// New Delivery SMS for Driver
const sendNewDeliverySMS = async (driverPhone, driverName, pickupAddress, serviceName, customerName, distance) => {
  const message = `📦 Car Care Connect: Hi ${driverName}, new delivery available! Pickup: ${pickupAddress}, Service: ${serviceName}, Customer: ${customerName}. Distance: ${distance}. Accept in app.`;
  return await sendSMS(driverPhone, message);
};

module.exports = {
  sendSMS,
  sendBookingConfirmationSMS,
  sendPaymentReceivedSMS,
  sendDriverAssignedSMS,
  sendServiceStartedSMS,
  sendServiceCompletedSMS,
  sendNewBookingSMS,
  sendProviderPaymentSMS,
  sendNewDeliverySMS
};
