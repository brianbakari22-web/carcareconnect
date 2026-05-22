const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { adminOnly } = require('../middlewares/adminOnly');
const {
  getStats,
  getUsers,
  getBookings,
  getServices,
  updateUserStatus,
  deleteUser,
  toggleServiceStatus
} = require('../controllers/adminController');

// Apply admin protection to all routes
router.use(protect);
router.use(adminOnly);

// Admin routes
router.get('/stats', getStats);
// 
router.get('/users', getUsers);
router.get('/bookings', getBookings);
router.get('/services', getServices);
router.put('/users/:id', updateUserStatus);
router.delete('/users/:id', deleteUser);
router.patch('/services/:id/status', toggleServiceStatus);

module.exports = router;
