const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  getCustomerDashboard,
  updateProfile,
  updateSettings,
  markNotificationRead,
  markAllNotificationsRead,
  getLoyaltyInfo,
  getVehicleReminders,
  getFavoriteProviders,
  addFavoriteProvider,
  removeFavoriteProvider
} = require('../controllers/customerController');

// All customer routes require authentication
router.use(protect);

// Dashboard
router.get('/dashboard', getCustomerDashboard);

// Profile
router.put('/profile', updateProfile);

// Settings
router.put('/settings', updateSettings);

// Notifications
router.put('/notifications/:id/read', markNotificationRead);
router.put('/notifications/read-all', markAllNotificationsRead);

// Loyalty
router.get('/loyalty', getLoyaltyInfo);

// Vehicles
router.get('/vehicles/reminders', getVehicleReminders);

// Favorite providers
router.get('/favorites', getFavoriteProviders);
router.post('/favorites', addFavoriteProvider);
router.delete('/favorites/:providerId', removeFavoriteProvider);

module.exports = router;
