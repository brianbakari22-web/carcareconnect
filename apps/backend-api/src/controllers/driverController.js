const User = require('../models/User');
const Booking = require('../models/Booking');

// Get driver dashboard
const getDriverDashboard = async (req, res) => {
  try {
    const driverId = req.user.id;
    
    const user = await User.findById(driverId);
    const deliveries = await Booking.find({ driverId })
      .populate('customerId', 'firstName lastName email phone address')
      .populate('providerId', 'businessName firstName lastName address')
      .populate('serviceId', 'name')
      .sort({ createdAt: -1 });
    
    const completedDeliveries = deliveries.filter(d => d.status === 'completed');
    const totalEarnings = completedDeliveries.length * 20;
    
    res.json({
      success: true,
      data: {
        profile: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          address: user.address,
          driversLicense: user.driversLicense,
          rating: user.averageRating
        },
        stats: {
          totalDeliveries: deliveries.length,
          completedDeliveries: completedDeliveries.length,
          totalEarnings,
          rating: user.averageRating || 4.8
        },
        deliveries
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
};

// Update driver profile - FIXED to save phone
const updateDriverProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, address, driversLicense, vehicleModel, vehiclePlate } = req.body;
    
    console.log('Updating driver profile:', { firstName, lastName, email, phone });
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        firstName,
        lastName,
        email,
        phone,
        address,
        driversLicense,
        vehicleModel,
        vehiclePlate
      },
      { new: true }
    ).select('-password');
    
    console.log('Driver profile updated - Phone:', user.phone);
    
    res.json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        driversLicense: user.driversLicense,
        vehicleModel: user.vehicleModel,
        vehiclePlate: user.vehiclePlate,
        rating: user.averageRating
      }
    });
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

module.exports = {
  getDriverDashboard,
  updateDriverProfile
};
