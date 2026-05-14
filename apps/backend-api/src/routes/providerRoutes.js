const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  getProviderDashboard,
  updateBusinessProfile,
  updateProviderStatus,
  getEarnings,
  requestPayout,
  uploadDocument,
  getProviderSettings,
  updateProviderSettings,
  getBankAccount,
  updateBankAccount
} = require('../controllers/providerController');

// All provider routes require authentication and provider role
router.use(protect);

// Dashboard
router.get('/dashboard', getProviderDashboard);

// Status
router.patch('/status', updateProviderStatus);

// Business Profile
router.put('/business-profile', updateBusinessProfile);

// Earnings
router.get('/earnings', getEarnings);
router.post('/payout', requestPayout);

// Documents
router.post('/documents', uploadDocument);

// Settings
router.get('/settings', getProviderSettings);
router.put('/settings', updateProviderSettings);

// Banking
router.get('/bank-account', getBankAccount);
router.put('/bank-account', updateBankAccount);

module.exports = router;
