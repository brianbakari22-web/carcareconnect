const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  getStats,
  getAllUsers,
  updateUser,
  deleteUser,
  getAllBookings,
  getAllServices,
  toggleServiceStatus,
  getPaymentAnalytics,
  getPendingPayouts,
  processPayout
} = require('../controllers/adminController');

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.use(protect);
router.use(isAdmin);

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/bookings', getAllBookings);
router.get('/services', getAllServices);
router.patch('/services/:id/status', toggleServiceStatus);
router.get('/payment-analytics', getPaymentAnalytics);
router.get('/pending-payouts', getPendingPayouts);
router.post('/process-payout', processPayout);

module.exports = router;
