const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  createPromoCode,
  validatePromoCode,
  applyPromoCode,
  getAllPromoCodes,
  deletePromoCode
} = require('../controllers/promoController');

// Public - validate promo code
router.post('/validate', validatePromoCode);

// Protected - apply to booking
router.post('/apply', protect, applyPromoCode);

// Admin only
router.post('/create', protect, createPromoCode);
router.get('/all', protect, getAllPromoCodes);
router.delete('/:id', protect, deletePromoCode);

module.exports = router;
