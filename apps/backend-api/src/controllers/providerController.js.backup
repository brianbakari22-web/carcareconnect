const Service = require('../models/Service');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Get provider dashboard data
const getProviderDashboard = async (req, res) => {
  try {
    const providerId = req.user.id;
    
    // Get provider profile
    const provider = await User.findById(providerId);
    
    // Get services
    const services = await Service.find({ providerId });
    
    // Get bookings
    const bookings = await Booking.find({ providerId })
      .populate('customerId', 'firstName lastName phone email')
      .populate('serviceId', 'name price duration')
      .populate('vehicleId', 'make model year licensePlate')
      .sort({ createdAt: -1 });
    
    // Calculate statistics
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'completed');
    const pendingBookings = bookings.filter(b => b.status === 'pending');
    const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const platformCommission = totalRevenue * 0.15;
    const providerEarnings = totalRevenue - platformCommission;
    
    // Calculate growth rate
    const lastMonthBookings = bookings.filter(b => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return new Date(b.createdAt) >= thirtyDaysAgo;
    }).length;
    
    const previousMonthBookings = bookings.filter(b => {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return new Date(b.createdAt) >= sixtyDaysAgo && new Date(b.createdAt) < thirtyDaysAgo;
    }).length;
    
    const growthRate = previousMonthBookings > 0 
      ? ((lastMonthBookings - previousMonthBookings) / previousMonthBookings * 100).toFixed(0)
      : 0;
    
    // Get notifications
    const notifications = await Notification.find({ userId: providerId })
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Get peak hours analytics (last 30 days)
    const peakHoursData = {};
    bookings.forEach(booking => {
      const hour = parseInt(booking.bookingTime.split(':')[0]);
      peakHoursData[hour] = (peakHoursData[hour] || 0) + 1;
    });
    
    const peakHours = Object.entries(peakHoursData).map(([hour, count]) => ({
      hour: `${hour}:00`,
      bookings: count
    })).sort((a, b) => b.bookings - a.bookings);
    
    // Get service performance metrics
    const serviceMetrics = await Promise.all(services.map(async (service) => {
      const serviceBookings = await Booking.find({ serviceId: service._id });
      const completedServiceBookings = serviceBookings.filter(b => b.status === 'completed');
      const revenue = completedServiceBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      return {
        id: service._id,
        name: service.name,
        totalBookings: serviceBookings.length,
        completedBookings: completedServiceBookings.length,
        revenue: revenue,
        rating: service.rating || 0
      };
    }));
    
    // Get daily breakdown for last 7 days
    const dailyBreakdown = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayBookings = await Booking.find({
        providerId,
        createdAt: { $gte: date, $lt: nextDate },
        status: 'completed'
      });
      
      const dayRevenue = dayBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      
      dailyBreakdown.push({
        day: days[date.getDay()],
        revenue: dayRevenue,
        bookings: dayBookings.length
      });
    }
    
    res.json({
      success: true,
      data: {
        profile: {
          businessName: provider.businessName,
          ownerName: `${provider.firstName} ${provider.lastName}`,
          email: provider.email,
          phone: provider.phone,
          address: provider.businessAddress || '',
          taxId: provider.businessLicense || '',
          serviceRadius: 20,
          operatingHours: { open: '08:00', close: '18:00' },
          logo: provider.profilePicture || `https://ui-avatars.com/api/?background=10b981&color=fff&name=${provider.businessName?.charAt(0) || 'P'}`,
          rating: provider.rating || 4.8,
          isVerified: provider.isVerified || false
        },
        stats: {
          activeServices: services.filter(s => s.isActive).length,
          pendingBookings: pendingBookings.length,
          totalRevenue: totalRevenue,
          rating: provider.rating || 4.8,
          completedBookings: completedBookings.length,
          growthRate: parseInt(growthRate)
        },
        earnings: {
          totalRevenue,
          platformCommission,
          providerEarnings,
          completedJobs: completedBookings.length,
          dailyBreakdown
        },
        bookings: bookings,
        services: services,
        notifications: notifications,
        analytics: {
          peakHours: peakHours.slice(0, 6),
          topServices: serviceMetrics.sort((a, b) => b.revenue - a.revenue).slice(0, 5),
          serviceMetrics
        },
        pendingCount: pendingBookings.length
      }
    });
  } catch (error) {
    console.error('Provider dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
};

// Update business profile
const updateBusinessProfile = async (req, res) => {
  try {
    const {
      businessName,
      address,
      taxId,
      serviceRadius,
      operatingHours,
      website,
      socialLinks
    } = req.body;
    
    const provider = await User.findByIdAndUpdate(
      req.user.id,
      {
        businessName,
        businessAddress: address,
        businessLicense: taxId,
        serviceRadius,
        operatingHours,
        website,
        socialLinks
      },
      { new: true }
    );
    
    res.json({
      success: true,
      message: 'Business profile updated',
      profile: {
        businessName: provider.businessName,
        address: provider.businessAddress,
        taxId: provider.businessLicense,
        serviceRadius: provider.serviceRadius,
        operatingHours: provider.operatingHours
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update business profile' });
  }
};

// Update provider status (online/offline)
const updateProviderStatus = async (req, res) => {
  try {
    const { isOnline } = req.body;
    await User.findByIdAndUpdate(req.user.id, { isOnline });
    res.json({ success: true, isOnline });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
};

// Get earnings summary
const getEarnings = async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const providerId = req.user.id;
    
    let startDate = new Date();
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }
    
    const bookings = await Booking.find({
      providerId,
      status: 'completed',
      createdAt: { $gte: startDate }
    });
    
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const platformCommission = totalRevenue * 0.15;
    
    res.json({
      success: true,
      earnings: {
        totalRevenue,
        platformCommission,
        providerEarnings: totalRevenue - platformCommission,
        bookingCount: bookings.length,
        period
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get earnings' });
  }
};

// Request payout
const requestPayout = async (req, res) => {
  try {
    const { amount, bankAccountId } = req.body;
    // In production, integrate with payment gateway (Stripe Connect, PayPal, etc.)
    res.json({
      success: true,
      message: `Payout request of $${amount} submitted successfully`,
      estimatedDays: '3-5 business days'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request payout' });
  }
};

// Upload document
const uploadDocument = async (req, res) => {
  try {
    const { documentType, documentUrl } = req.body;
    // In production, store document in cloud storage (AWS S3, etc.)
    const provider = await User.findByIdAndUpdate(
      req.user.id,
      {
        $push: {
          documents: {
            type: documentType,
            url: documentUrl,
            uploadedAt: new Date(),
            status: 'pending'
          }
        }
      },
      { new: true }
    );
    
    res.json({ success: true, message: 'Document uploaded for verification' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload document' });
  }
};

// Get provider settings
const getProviderSettings = async (req, res) => {
  try {
    const provider = await User.findById(req.user.id);
    res.json({
      success: true,
      settings: {
        autoConfirm: provider.settings?.autoConfirm || false,
        priceAlerts: provider.settings?.priceAlerts || true,
        emailNotifications: provider.settings?.emailNotifications || true,
        pushNotifications: provider.settings?.pushNotifications || true,
        smsNotifications: provider.settings?.smsNotifications || false,
        calendarSync: provider.settings?.calendarSync || false,
        invoiceTemplate: provider.settings?.invoiceTemplate || 'default'
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get settings' });
  }
};

// Update provider settings
const updateProviderSettings = async (req, res) => {
  try {
    const { autoConfirm, priceAlerts, emailNotifications, pushNotifications, smsNotifications, calendarSync, invoiceTemplate } = req.body;
    
    await User.findByIdAndUpdate(req.user.id, {
      settings: {
        autoConfirm,
        priceAlerts,
        emailNotifications,
        pushNotifications,
        smsNotifications,
        calendarSync,
        invoiceTemplate
      }
    });
    
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

// Get bank account details
const getBankAccount = async (req, res) => {
  try {
    const provider = await User.findById(req.user.id);
    res.json({
      success: true,
      bankAccount: provider.bankAccount || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bank account' });
  }
};

// Update bank account
const updateBankAccount = async (req, res) => {
  try {
    const { accountName, accountNumber, bankName, routingNumber } = req.body;
    
    await User.findByIdAndUpdate(req.user.id, {
      bankAccount: { accountName, accountNumber, bankName, routingNumber, lastUpdated: new Date() }
    });
    
    res.json({ success: true, message: 'Bank account updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update bank account' });
  }
};

module.exports = {
  getProviderDashboard,
  updateBusinessProfile,
  updateProviderStatus,
  getEarnings,
  requestPayout,
  uploadDocument,
  getProviderSettings,
  updateProviderSettings,
  getBankAccount,
  updateBankAccount
};
