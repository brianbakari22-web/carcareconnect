const User = require('../models/User');
const Booking = require('../models/Booking');

// Get driver dashboard data
const getDriverDashboard = async (req, res) => {
  try {
    const driverId = req.user.id;
    
    // Available deliveries (pending concierge bookings)
    const available = await Booking.find({ 
      status: "pending", 
      isConcierge: true,
      driverId: { $exists: false }
    })
      .populate('customerId', 'firstName lastName phone address')
      .populate('providerId', 'businessName address')
      .populate('serviceId', 'name duration price')
      .sort({ createdAt: 1 });
    
    // Active jobs (driver assigned but not completed)
    const active = await Booking.find({ 
      driverId: driverId,
      status: { $in: ["driver-assigned", "confirmed", "in-progress"] }
    })
      .populate('customerId', 'firstName lastName phone address')
      .populate('providerId', 'businessName address')
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
          pendingPayout: totalEarnings // Simplified
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
};

module.exports = { getDriverDashboard };
