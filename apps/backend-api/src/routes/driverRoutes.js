const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { getDriverDashboard, updateDriverProfile } = require('../controllers/driverController');

// Get driver dashboard
router.get('/dashboard', protect, getDriverDashboard);

// Update driver profile
router.put('/profile', protect, updateDriverProfile);

// Update online status
router.patch('/status', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    const { isOnline } = req.body;
    await User.findByIdAndUpdate(req.user.id, { isOnline });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Update location
router.patch('/location', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    const { lat, lng, address } = req.body;
    await User.findByIdAndUpdate(req.user.id, {
      currentLocation: { lat, lng, address, lastUpdate: new Date() }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Get available deliveries
router.get('/available', protect, async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const deliveries = await Booking.find({ 
      status: 'pending', 
      isConcierge: true,
      driverId: { $exists: false }
    })
      .populate('customerId', 'firstName lastName phone address')
      .populate('providerId', 'businessName firstName lastName address')
      .populate('serviceId', 'name duration price');
    res.json({ success: true, deliveries });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get deliveries' });
  }
});

// Accept delivery
router.post('/accept/:id', protect, async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Delivery not found' });
    if (booking.status !== 'pending') return res.status(400).json({ error: 'Already accepted' });
    booking.driverId = req.user.id;
    booking.status = 'driver-assigned';
    await booking.save();
    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept delivery' });
  }
});

// Update delivery status
router.put('/delivery/:id/status', protect, async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const { id } = req.params;
    const { status } = req.body;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Not found' });
    if (booking.driverId.toString() !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    booking.status = status;
    if (status === 'completed') booking.completedAt = new Date();
    await booking.save();
    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Get driver earnings
router.get('/earnings', protect, async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const completed = await Booking.find({ driverId: req.user.id, status: 'completed' });
    const totalEarnings = completed.length * 20;
    res.json({ success: true, earnings: { total: totalEarnings, perDelivery: 20, totalDeliveries: completed.length, pendingPayout: totalEarnings } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get earnings' });
  }
});

// Get bank account
router.get('/bank-account', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    res.json({ success: true, bankAccount: user.bankAccount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bank account' });
  }
});

// Save bank account
router.post('/bank-account', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    const { accountName, accountNumber, bankName, routingNumber } = req.body;
    await User.findByIdAndUpdate(req.user.id, {
      bankAccount: { accountName, accountNumber, bankName, routingNumber, lastUpdated: new Date() }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save bank account' });
  }
});

// Delete bank account
router.delete('/bank-account', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user.id, { bankAccount: null });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bank account' });
  }
});

module.exports = router;

// Get online drivers
router.get('/online', async (req, res) => {
  try {
    const User = require('../models/User');
    const onlineDrivers = await User.find({ 
      role: 'driver', 
      isOnline: true 
    }).select('firstName lastName isOnline currentLocation');
    
    res.json({ success: true, drivers: onlineDrivers });
  } catch (error) {
    console.error('Error fetching online drivers:', error);
    res.status(500).json({ error: 'Failed to get online drivers' });
  }
});
