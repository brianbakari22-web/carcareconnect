const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  createPaymentIntent,
  confirmPayment,
  processCashPayment,
  getPaymentHistory,
  getProviderEarnings,
  requestProviderPayout,
  getProviderPayoutHistory,
  getDriverEarnings,
  requestDriverPayout,
  getPlatformRevenue
} = require('../controllers/paymentController');

// Customer routes
router.post('/create-intent', protect, createPaymentIntent);
router.post('/confirm', protect, confirmPayment);
router.post('/cash', protect, processCashPayment);
router.get('/customer/history', protect, getPaymentHistory);

// Provider routes
router.get('/provider/earnings', protect, getProviderEarnings);
router.post('/provider/payout', protect, requestProviderPayout);
router.get('/provider/payout-history', protect, getProviderPayoutHistory);  // NEW

// Driver routes
router.get('/driver/earnings', protect, getDriverEarnings);
router.post('/driver/payout', protect, requestDriverPayout);

// Admin routes
router.get('/admin/revenue', protect, getPlatformRevenue);

module.exports = router;
