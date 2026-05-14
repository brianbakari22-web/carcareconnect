const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');

// Get driver dashboard data
router.get('/dashboard', protect, async (req, res) => {
  try {
    const User = require('../models/User');
    const Booking = require('../models/Booking');
    const driverId = req.user.id;
    
    // Available deliveries (pending concierge bookings with NO driver assigned)
    const available = await Booking.find({ 
      status: "pending", 
      isConcierge: true,
      driverId: { $exists: false }
    })
      .populate('customerId', 'firstName lastName phone address')
      .populate('providerId', 'businessName firstName lastName address')
      .populate('serviceId', 'name duration price')
      .sort({ createdAt: 1 });
    
    console.log(`📦 Found ${available.length} available deliveries for driver ${driverId}`);
    
    // Active jobs (driver assigned but not completed)
    const active = await Booking.find({ 
      driverId: driverId,
      status: { $in: ["driver-assigned", "confirmed", "in-progress"] }
    })
      .populate('customerId', 'firstName lastName phone address')
      .populate('providerId', 'businessName firstName lastName address')
      .populate('serviceId', 'name duration price')
      .sort({ createdAt: -1 });
    
    // History (completed deliveries)
    const history = await Booking.find({ 
      driverId: driverId,
      status: "completed" 
    })
      .populate('customerId', 'firstName lastName')
      .populate('serviceId', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Calculate earnings
    const completedDeliveries = await Booking.find({ 
      driverId: driverId, 
      status: "completed" 
    });
    
    const totalEarnings = completedDeliveries.length * 20;
    const weeklyEarnings = completedDeliveries.filter(b => 
      b.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length * 20;
    const todayEarnings = completedDeliveries.filter(b => 
      b.createdAt > new Date(new Date().setHours(0, 0, 0, 0))
    ).length * 20;
    
    const driver = await User.findById(driverId);
    
    res.json({
      success: true,
      data: {
        deliveries: { available, active, history },
        earnings: {
          total: totalEarnings,
          weekly: weeklyEarnings,
          today: todayEarnings,
          perDelivery: 20,
          totalDeliveries: completedDeliveries.length,
          pendingPayout: totalEarnings
        },
        stats: {
          rating: driver.averageRating || 4.8,
          acceptanceRate: 98,
          onTimeRate: 96
        },
        isOnline: driver.isOnline || false,
        currentLocation: driver.currentLocation,
        profile: {
          firstName: driver.firstName,
          lastName: driver.lastName,
          email: driver.email,
          phone: driver.phone,
          driversLicense: driver.driversLicense,
          address: driver.address
        }
      }
    });
  } catch (error) {
    console.error('Get driver dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

// Get available deliveries (separate endpoint)
router.get('/available', protect, async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const deliveries = await Booking.find({ 
      status: "pending", 
      isConcierge: true,
      driverId: { $exists: false }
    })
      .populate('customerId', 'firstName lastName phone address')
      .populate('providerId', 'businessName firstName lastName address')
      .populate('serviceId', 'name duration price')
      .sort({ createdAt: 1 });
    
    console.log(`📦 GET /api/driver/available - Found ${deliveries.length} deliveries`);
    
    res.json({ success: true, deliveries });
  } catch (error) {
    console.error('Get available deliveries error:', error);
    res.status(500).json({ error: 'Failed to get deliveries' });
  }
});

// Update driver online status
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

// Update driver location
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

// Accept delivery
router.post('/accept/:id', protect, async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const { id } = req.params;
    
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    if (booking.status !== "pending") {
      return res.status(400).json({ error: 'Delivery already accepted or completed' });
    }
    
    booking.driverId = req.user.id;
    booking.status = "driver-assigned";
    await booking.save();
    
    console.log(`✅ Driver ${req.user.id} accepted delivery ${id}`);
    
    res.json({ success: true, booking });
  } catch (error) {
    console.error('Accept delivery error:', error);
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
    if (!booking) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    if (booking.driverId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    booking.status = status;
    if (status === 'completed') booking.completedAt = new Date();
    await booking.save();
    
    console.log(`📅 Delivery ${id} status updated to ${status}`);
    
    res.json({ success: true, booking });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Get driver earnings
router.get('/earnings', protect, async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const completedDeliveries = await Booking.find({ 
      driverId: req.user.id, 
      status: "completed" 
    });
    
    const totalEarnings = completedDeliveries.length * 20;
    const weeklyEarnings = completedDeliveries.filter(b => 
      b.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length * 20;
    const todayEarnings = completedDeliveries.filter(b => 
      b.createdAt > new Date(new Date().setHours(0, 0, 0, 0))
    ).length * 20;
    
    res.json({ 
      success: true, 
      earnings: {
        total: totalEarnings,
        weekly: weeklyEarnings,
        today: todayEarnings,
        perDelivery: 20,
        totalDeliveries: completedDeliveries.length,
        pendingPayout: totalEarnings
      }
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ error: 'Failed to get earnings' });
  }
});

// Get driver history
router.get('/history', protect, async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const history = await Booking.find({ 
      driverId: req.user.id, 
      status: "completed" 
    })
      .populate('customerId', 'firstName lastName')
      .populate('serviceId', 'name')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, history });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

module.exports = router;
