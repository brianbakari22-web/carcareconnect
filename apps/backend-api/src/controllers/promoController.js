const PromoCode = require('../models/PromoCode');
const Booking = require('../models/Booking');

// Create a promo code (Admin only)
const createPromoCode = async (req, res) => {
  try {
    const { code, description, discountType, discountValue, minPurchase, maxDiscount, usageLimit, validUntil, applicableRoles } = req.body;
    
    const existingCode = await PromoCode.findOne({ code: code.toUpperCase() });
    if (existingCode) {
      return res.status(400).json({ error: 'Promo code already exists' });
    }
    
    const promoCode = await PromoCode.create({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minPurchase: minPurchase || 0,
      maxDiscount,
      usageLimit: usageLimit || 1,
      validUntil,
      applicableRoles: applicableRoles || ['customer'],
      createdBy: req.user.id
    });
    
    res.json({ success: true, promoCode });
  } catch (error) {
    console.error('Create promo code error:', error);
    res.status(500).json({ error: 'Failed to create promo code' });
  }
};

// Validate and apply promo code
const validatePromoCode = async (req, res) => {
  try {
    const { code, amount, role } = req.body;
    
    const promoCode = await PromoCode.findOne({ 
      code: code.toUpperCase(), 
      isActive: true 
    });
    
    if (!promoCode) {
      return res.status(404).json({ error: 'Invalid promo code' });
    }
    
    // Check validity dates
    const now = new Date();
    if (promoCode.validFrom && now < promoCode.validFrom) {
      return res.status(400).json({ error: 'Promo code not yet valid' });
    }
    if (promoCode.validUntil && now > promoCode.validUntil) {
      return res.status(400).json({ error: 'Promo code has expired' });
    }
    
    // Check usage limit
    if (promoCode.usageLimit && promoCode.usedCount >= promoCode.usageLimit) {
      return res.status(400).json({ error: 'Promo code usage limit reached' });
    }
    
    // Check minimum purchase
    if (amount < promoCode.minPurchase) {
      return res.status(400).json({ error: `Minimum purchase of $${promoCode.minPurchase} required` });
    }
    
    // Calculate discount
    let discountAmount = 0;
    if (promoCode.discountType === 'percentage') {
      discountAmount = (amount * promoCode.discountValue) / 100;
      if (promoCode.maxDiscount && discountAmount > promoCode.maxDiscount) {
        discountAmount = promoCode.maxDiscount;
      }
    } else {
      discountAmount = promoCode.discountValue;
    }
    
    const finalAmount = amount - discountAmount;
    
    res.json({
      success: true,
      promoCode: {
        code: promoCode.code,
        description: promoCode.description,
        discountAmount: discountAmount.toFixed(2),
        finalAmount: finalAmount.toFixed(2),
        originalAmount: amount
      }
    });
  } catch (error) {
    console.error('Validate promo code error:', error);
    res.status(500).json({ error: 'Failed to validate promo code' });
  }
};

// Apply promo code to booking
const applyPromoCode = async (req, res) => {
  try {
    const { bookingId, code } = req.body;
    
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    const promoCode = await PromoCode.findOne({ code: code.toUpperCase(), isActive: true });
    if (!promoCode) {
      return res.status(404).json({ error: 'Invalid promo code' });
    }
    
    // Calculate discount
    let discountAmount = 0;
    if (promoCode.discountType === 'percentage') {
      discountAmount = (booking.totalAmount * promoCode.discountValue) / 100;
      if (promoCode.maxDiscount && discountAmount > promoCode.maxDiscount) {
        discountAmount = promoCode.maxDiscount;
      }
    } else {
      discountAmount = promoCode.discountValue;
    }
    
    // Update booking with discount
    booking.discountAmount = discountAmount;
    booking.discountedTotal = booking.totalAmount - discountAmount;
    booking.appliedPromoCode = promoCode.code;
    await booking.save();
    
    // Increment usage count
    promoCode.usedCount += 1;
    await promoCode.save();
    
    res.json({ 
      success: true, 
      discountAmount: discountAmount.toFixed(2),
      discountedTotal: booking.discountedTotal.toFixed(2)
    });
  } catch (error) {
    console.error('Apply promo code error:', error);
    res.status(500).json({ error: 'Failed to apply promo code' });
  }
};

// Get all promo codes (Admin only)
const getAllPromoCodes = async (req, res) => {
  try {
    const promoCodes = await PromoCode.find().sort({ createdAt: -1 });
    res.json({ success: true, promoCodes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get promo codes' });
  }
};

// Delete promo code (Admin only)
const deletePromoCode = async (req, res) => {
  try {
    const { id } = req.params;
    await PromoCode.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete promo code' });
  }
};

module.exports = {
  createPromoCode,
  validatePromoCode,
  applyPromoCode,
  getAllPromoCodes,
  deletePromoCode
};
