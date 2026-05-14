const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { 
  createStripeAccount, 
  getOnboardingLink, 
  getAccountStatus, 
  disconnectStripe 
} = require('../controllers/stripeConnectController');

// Create Stripe Connect account
router.post('/create-account', protect, createStripeAccount);

// Get onboarding link for Stripe Connect
router.get('/onboarding-link', protect, getOnboardingLink);

// Get account status
router.get('/account-status', protect, getAccountStatus);

// Disconnect Stripe account
router.post('/disconnect', protect, disconnectStripe);

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Stripe Connect routes are working!' });
});

module.exports = router;
