const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');

// Get platform statistics with payment data
const getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalCustomers,
      totalProviders,
      totalDrivers,
      totalServices,
      totalBookings,
      completedBookings,
      pendingBookings,
      cancelledBookings
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'provider' }),
      User.countDocuments({ role: 'driver' }),
      Service.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'cancelled' })
    ]);
    
    // Get payment statistics
    const paymentStats = await Payment.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalCommission: { $sum: '$platformCommission' },
        totalProviderPayouts: { $sum: '$providerEarnings' },
        totalDriverPayouts: { $sum: '$driverEarnings' },
        totalTransactions: { $sum: 1 }
      }}
    ]);
    
    // Get pending payouts
    const pendingProviderPayouts = await Payment.aggregate([
      { $match: { providerPayoutStatus: 'pending', paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$providerEarnings' }, count: { $sum: 1 } } }
    ]);
    
    const pendingDriverPayouts = await Payment.aggregate([
      { $match: { driverPayoutStatus: 'pending', paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$driverEarnings' }, count: { $sum: 1 } } }
    ]);
    
    // Calculate monthly growth
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const lastMonth = new Date(currentMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const currentMonthRevenue = await Payment.aggregate([
      { $match: { paidAt: { $gte: currentMonth }, paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const lastMonthRevenue = await Payment.aggregate([
      { $match: { paidAt: { $gte: lastMonth, $lt: currentMonth }, paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const currentTotal = currentMonthRevenue[0]?.total || 0;
    const lastTotal = lastMonthRevenue[0]?.total || 0;
    const monthlyGrowth = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal * 100).toFixed(1) : 0;
    
    // Get average rating
    const ratedBookings = await Booking.find({ 
      status: 'completed',
      customerRatingProvider: { $exists: true, $ne: null }
    });
    const averageRating = ratedBookings.length > 0 
      ? (ratedBookings.reduce((sum, b) => sum + (b.customerRatingProvider || 0), 0) / ratedBookings.length).toFixed(1)
      : 0;
    
    res.json({
      success: true,
      stats: {
        users: { total: totalUsers, customers: totalCustomers, providers: totalProviders, drivers: totalDrivers },
        services: { total: totalServices },
        bookings: { total: totalBookings, completed: completedBookings, pending: pendingBookings, cancelled: cancelledBookings },
        payments: {
          totalRevenue: paymentStats[0]?.totalRevenue || 0,
          totalCommission: paymentStats[0]?.totalCommission || 0,
          totalProviderPayouts: paymentStats[0]?.totalProviderPayouts || 0,
          totalDriverPayouts: paymentStats[0]?.totalDriverPayouts || 0,
          totalTransactions: paymentStats[0]?.totalTransactions || 0,
          monthlyGrowth: parseFloat(monthlyGrowth),
          pendingProviderPayouts: pendingProviderPayouts[0]?.total || 0,
          pendingDriverPayouts: pendingDriverPayouts[0]?.total || 0,
          pendingProviderCount: pendingProviderPayouts[0]?.count || 0,
          pendingDriverCount: pendingDriverPayouts[0]?.count || 0
        },
        platform: { rating: averageRating || 0, totalReviews: ratedBookings.length }
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    let query = {};
    
    if (role && role !== 'all') query.role = role;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get users' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, role, isVerified, businessName } = req.body;
    
    const updateData = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (role !== undefined) updateData.role = role;
    if (isVerified !== undefined) updateData.isVerified = isVerified;
    if (businessName !== undefined) updateData.businessName = businessName;
    
    const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Get all bookings
const getAllBookings = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let query = {};
    if (status && status !== 'all') query.status = status;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const bookings = await Booking.find(query)
      .populate('customerId', 'firstName lastName email')
      .populate('providerId', 'firstName lastName businessName')
      .populate('serviceId', 'name price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Booking.countDocuments(query);
    
    res.json({
      success: true,
      bookings,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bookings' });
  }
};

// Get all services
const getAllServices = async (req, res) => {
  try {
    const services = await Service.find()
      .populate('providerId', 'firstName lastName businessName')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, services });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get services' });
  }
};

// Toggle service status
const toggleServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const service = await Service.findByIdAndUpdate(id, { isActive }, { new: true });
    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update service' });
  }
};

// Get payment analytics
const getPaymentAnalytics = async (req, res) => {
  try {
    // Monthly revenue for last 6 months
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const revenue = await Payment.aggregate([
        { $match: { paidAt: { $gte: monthStart, $lte: monthEnd }, paymentStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, commission: { $sum: '$platformCommission' } } }
      ]);
      
      monthlyRevenue.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: revenue[0]?.total || 0,
        commission: revenue[0]?.commission || 0
      });
    }
    
    // Payment methods distribution
    const paymentMethods = await Payment.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$amount' } } }
    ]);
    
    // Top providers by revenue
    const topProviders = await Payment.aggregate([
      { $match: { paymentStatus: 'completed', providerId: { $exists: true, $ne: null } } },
      { $group: { _id: '$providerId', totalRevenue: { $sum: '$amount' }, totalEarnings: { $sum: '$providerEarnings' }, count: { $sum: 1 } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'provider' } }
    ]);
    
    // Recent transactions
    const recentTransactions = await Payment.find({ paymentStatus: 'completed' })
      .populate('customerId', 'firstName lastName')
      .populate('providerId', 'businessName')
      .populate('bookingId', 'serviceName')
      .sort({ paidAt: -1 })
      .limit(10);
    
    res.json({
      success: true,
      analytics: {
        monthlyRevenue,
        paymentMethods,
        topProviders: topProviders.map(p => ({
          name: p.provider[0]?.businessName || p.provider[0]?.firstName,
          revenue: p.totalRevenue,
          earnings: p.totalEarnings,
          bookings: p.count
        })),
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Payment analytics error:', error);
    res.status(500).json({ error: 'Failed to get payment analytics' });
  }
};

// Get pending payouts
const getPendingPayouts = async (req, res) => {
  try {
    const pendingProviderPayouts = await Payment.aggregate([
      { $match: { providerPayoutStatus: 'pending', paymentStatus: 'completed' } },
      { $group: { _id: '$providerId', total: { $sum: '$providerEarnings' }, count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'provider' } }
    ]);
    
    const pendingDriverPayouts = await Payment.aggregate([
      { $match: { driverPayoutStatus: 'pending', paymentStatus: 'completed', driverId: { $exists: true, $ne: null } } },
      { $group: { _id: '$driverId', total: { $sum: '$driverEarnings' }, count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'driver' } }
    ]);
    
    res.json({
      success: true,
      providerPayouts: pendingProviderPayouts.map(p => ({
        id: p._id,
        name: p.provider[0]?.businessName || `${p.provider[0]?.firstName} ${p.provider[0]?.lastName}`,
        amount: p.total,
        count: p.count
      })),
      driverPayouts: pendingDriverPayouts.map(d => ({
        id: d._id,
        name: `${d.driver[0]?.firstName} ${d.driver[0]?.lastName}`,
        amount: d.total,
        count: d.count
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get pending payouts' });
  }
};

// Process payout
const processPayout = async (req, res) => {
  try {
    const { userId, type } = req.body;
    const statusField = type === 'provider' ? 'providerPayoutStatus' : 'driverPayoutStatus';
    const idField = type === 'provider' ? 'providerId' : 'driverId';
    
    await Payment.updateMany(
      { [idField]: userId, [statusField]: 'pending', paymentStatus: 'completed' },
      { [statusField]: 'completed', providerPayoutDate: new Date() }
    );
    
    res.json({ success: true, message: 'Payout processed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process payout' });
  }
};

module.exports = {
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
};
