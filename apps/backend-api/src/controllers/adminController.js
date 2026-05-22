const Payment = require('../models/Payment');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Service = require('../models/Service');

// Get admin statistics
const getStats = async (req, res) => {
  try {
    // Get all payments
    const payments = await Payment.find({ paymentStatus: 'completed' });
    
    // Calculate revenue
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalCommission = payments.reduce((sum, p) => sum + (p.platformCommission || 0), 0);
    const totalProviderPayouts = payments.reduce((sum, p) => sum + (p.providerEarnings || 0), 0);
    const totalDriverPayouts = payments.reduce((sum, p) => sum + (p.driverEarnings || 0), 0);
    
    // Get users count
    const users = await User.find({});
    const totalUsers = users.length;
    const customers = users.filter(u => u.role === 'customer').length;
    const providers = users.filter(u => u.role === 'provider').length;
    const drivers = users.filter(u => u.role === 'driver').length;
    
    // Get bookings count
    const bookings = await Booking.find({});
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const totalBookings = bookings.length;
    
    res.json({
      success: true,
      stats: {
        users: { total: totalUsers, customers, providers, drivers },
        bookings: { total: totalBookings, completed: completedBookings, pending: pendingBookings },
        payments: { totalRevenue, totalCommission, totalProviderPayouts, totalDriverPayouts }
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

// Get all users
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get users' });
  }
};

// Get all bookings
const getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate('customerId', 'firstName lastName email')
      .populate('providerId', 'businessName firstName lastName');
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bookings' });
  }
};

// Get all services
const getServices = async (req, res) => {
  try {
    const services = await Service.find({}).populate('providerId', 'businessName');
    res.json({ success: true, services });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get services' });
  }
};

// Update user status
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, isVerified } = req.body;
    await User.findByIdAndUpdate(id, { isActive, isVerified });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await User.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Toggle service status
const toggleServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    await Service.findByIdAndUpdate(id, { isActive });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update service' });
  }
};


// Get payment analytics for charts and recent transactions
const getPaymentAnalytics = async (req, res) => {
  try {
    // Get all completed payments
    const payments = await Payment.find({ paymentStatus: 'completed' })
      .populate('bookingId', 'serviceName')
      .populate('customerId', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    // Calculate monthly revenue (last 6 months)
    const monthlyRevenue = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = month.toLocaleString('default', { month: 'short' });
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthPayments = payments.filter(p => {
        const paymentDate = new Date(p.createdAt);
        return paymentDate >= month && paymentDate < nextMonth;
      });
      
      const revenue = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const commission = monthPayments.reduce((sum, p) => sum + (p.platformCommission || 0), 0);
      
      monthlyRevenue.push({ month: monthName, revenue, commission });
    }
    
    // Get recent transactions (last 10)
    const recentTransactions = payments.slice(0, 10).map(p => ({
      _id: p._id,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      paidAt: p.paidAt || p.createdAt,
      customerId: p.customerId,
      bookingId: p.bookingId
    }));
    
    // Payment methods breakdown
    const cardPayments = payments.filter(p => p.paymentMethod === 'card').length;
    const cashPayments = payments.filter(p => p.paymentMethod === 'cash').length;
    
    res.json({
      success: true,
      analytics: {
        monthlyRevenue,
        recentTransactions,
        paymentMethods: [
          { method: 'Card', count: cardPayments, amount: payments.filter(p => p.paymentMethod === 'card').reduce((s, p) => s + (p.amount || 0), 0) },
          { method: 'Cash', count: cashPayments, amount: payments.filter(p => p.paymentMethod === 'cash').reduce((s, p) => s + (p.amount || 0), 0) }
        ]
      }
    });
  } catch (error) {
    console.error('Payment analytics error:', error);
    res.status(500).json({ error: 'Failed to get payment analytics' });
  }
};

module.exports = {
  getStats, getPaymentAnalytics,
  getUsers,
  getBookings,
  getServices,
  updateUserStatus,
  deleteUser,
  toggleServiceStatus
};
