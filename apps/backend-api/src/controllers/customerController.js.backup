const Service = require('../models/Service');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Get customer dashboard data
const getCustomerDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user profile
    const user = await User.findById(userId);
    
    // Get bookings
    const bookings = await Booking.find({ customerId: userId })
      .populate('serviceId', 'name')
      .populate('providerId', 'firstName lastName businessName')
      .populate('driverId', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    // Calculate statistics
    const totalSpent = bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    
    const upcomingBookings = bookings.filter(b => 
      b.status !== 'completed' && b.status !== 'cancelled'
    );
    
    const completedBookings = bookings.filter(b => b.status === 'completed');
    
    // Get notifications
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);
    
    // Get favorite providers (mock data for now)
    const favoriteProviders = [];
    
    res.json({
      success: true,
      data: {
        profile: {
          fullName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          avatar: user.profilePicture || `https://ui-avatars.com/api/?background=2563eb&color=fff&name=${user.firstName}`,
          preferredLocation: user.preferredLocation || user.address,
          loyaltyPoints: user.loyaltyPoints,
          loyaltyTier: user.loyaltyTier,
          memberSince: user.memberSince
        },
        stats: {
          totalSpent,
          totalBookings: bookings.length,
          completedBookings: completedBookings.length,
          upcomingBookings: upcomingBookings.length,
          loyaltyPoints: user.loyaltyPoints
        },
        bookings,
        notifications,
        favoriteProviders
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { fullName, email, phone, preferredLocation, profilePicture } = req.body;
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        firstName,
        lastName,
        email,
        phone,
        preferredLocation,
        profilePicture
      },
      { new: true }
    );
    
    res.json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        preferredLocation: user.preferredLocation,
        profilePicture: user.profilePicture,
        loyaltyPoints: user.loyaltyPoints
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Update user settings
const updateSettings = async (req, res) => {
  try {
    const { emailNotifications, pushNotifications, smsNotifications, language, darkMode, hideProfile, offlineMode } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        settings: {
          emailNotifications,
          pushNotifications,
          smsNotifications,
          language,
          darkMode,
          hideProfile,
          offlineMode
        }
      },
      { new: true }
    );
    
    res.json({ success: true, settings: user.settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

// Mark notification as read
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { read: true, readAt: new Date() });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification' });
  }
};

// Mark all notifications as read
const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notifications' });
  }
};

// Create notification (internal use)
const createNotification = async (userId, type, title, message, icon = '🔔', data = {}) => {
  try {
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      icon,
      data
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Get loyalty points and history
const getLoyaltyInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const completedBookings = await Booking.find({
      customerId: req.user.id,
      status: 'completed'
    });
    
    const pointsHistory = completedBookings.map(booking => ({
      date: booking.completedAt || booking.createdAt,
      points: Math.floor(booking.totalAmount / 10),
      description: `${booking.serviceName} - Earned ${Math.floor(booking.totalAmount / 10)} points`
    }));
    
    res.json({
      success: true,
      loyalty: {
        points: user.loyaltyPoints,
        tier: user.loyaltyTier,
        nextTier: user.loyaltyTier === 'bronze' ? 'silver (500 points)' :
                  user.loyaltyTier === 'silver' ? 'gold (2000 points)' :
                  user.loyaltyTier === 'gold' ? 'platinum (5000 points)' : 'max',
        pointsToNext: user.loyaltyTier === 'bronze' ? 500 - user.loyaltyPoints :
                      user.loyaltyTier === 'silver' ? 2000 - user.loyaltyPoints :
                      user.loyaltyTier === 'gold' ? 5000 - user.loyaltyPoints : 0,
        history: pointsHistory.slice(0, 10)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get loyalty info' });
  }
};

// Get vehicle health reminders
const getVehicleReminders = async (req, res) => {
  try {
    const Vehicle = require('../models/Vehicle');
    const vehicles = await Vehicle.find({ customerId: req.user.id });
    
    const reminders = vehicles.map(vehicle => ({
      vehicleId: vehicle._id,
      vehicleName: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      type: 'oil-change',
      message: 'Oil change due in 500 miles',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }));
    
    res.json({ success: true, reminders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get reminders' });
  }
};

// Get favorite providers
const getFavoriteProviders = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('favoriteProviders', 'firstName lastName businessName rating profilePicture');
    res.json({ success: true, providers: user.favoriteProviders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get favorites' });
  }
};

// Add favorite provider
const addFavoriteProvider = async (req, res) => {
  try {
    const { providerId } = req.body;
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { favoriteProviders: providerId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add favorite' });
  }
};

// Remove favorite provider
const removeFavoriteProvider = async (req, res) => {
  try {
    const { providerId } = req.params;
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { favoriteProviders: providerId }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
};

module.exports = {
  getCustomerDashboard,
  updateProfile,
  updateSettings,
  markNotificationRead,
  markAllNotificationsRead,
  createNotification,
  getLoyaltyInfo,
  getVehicleReminders,
  getFavoriteProviders,
  addFavoriteProvider,
  removeFavoriteProvider
};
