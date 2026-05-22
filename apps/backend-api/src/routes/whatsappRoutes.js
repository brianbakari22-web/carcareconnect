const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');

// Update user's WhatsApp number
router.put('/update-number', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    const { whatsappNumber, whatsappOptIn } = req.body;
    
    await User.findByIdAndUpdate(req.user.id, {
      whatsappNumber,
      whatsappOptIn: whatsappOptIn !== undefined ? whatsappOptIn : true
    });
    
    res.json({ success: true, message: 'WhatsApp number updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update WhatsApp number' });
  }
});

// Get user's WhatsApp info
router.get('/my-info', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id).select('whatsappNumber whatsappOptIn phone');
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get WhatsApp info' });
  }
});

module.exports = router;
