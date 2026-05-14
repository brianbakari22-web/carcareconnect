const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  requestRefund,
  getMyRefunds,
  getAllRefunds,
  approveRefund,
  rejectRefund
} = require('../controllers/refundController');

// Customer routes
router.post('/request', protect, requestRefund);
router.get('/my-refunds', protect, getMyRefunds);

// Admin routes
router.get('/all', protect, getAllRefunds);
router.post('/:id/approve', protect, approveRefund);
router.post('/:id/reject', protect, rejectRefund);

module.exports = router;
