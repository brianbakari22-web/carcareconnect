const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');

// Get all providers with their services and ratings
const getAllProviders = async (req, res) => {
  try {
    const providers = await User.find({ 
      role: 'provider', 
      isActive: true,
      isVerified: true 
    }).select('firstName lastName businessName businessAddress businessLogo rating totalReviews isVerified createdAt');
    
    const providersWithStats = await Promise.all(providers.map(async (provider) => {
      const services = await Service.find({ providerId: provider._id, isActive: true });
      const completedBookings = await Booking.countDocuments({ 
        providerId: provider._id, 
        status: 'completed' 
      });
      
      return {
        id: provider._id,
        name: provider.businessName || `${provider.firstName} ${provider.lastName}`,
        ownerName: `${provider.firstName} ${provider.lastName}`,
        businessAddress: provider.businessAddress || 'Address not specified',
        logo: provider.businessLogo || `https://ui-avatars.com/api/?background=10b981&color=fff&name=${(provider.businessName || provider.firstName)?.charAt(0) || 'P'}`,
        rating: provider.rating || 4.5,
        totalReviews: provider.totalReviews || 0,
        totalServices: services.length,
        totalBookings: completedBookings,
        isVerified: provider.isVerified || false,
        joinedDate: provider.createdAt
      };
    }));
    
    providersWithStats.sort((a, b) => b.rating - a.rating);
    
    res.json({ 
      success: true, 
      providers: providersWithStats,
      total: providersWithStats.length
    });
  } catch (error) {
    console.error('Get all providers error:', error);
    res.status(500).json({ error: 'Failed to get providers', providers: [], total: 0 });
  }
};

// Get provider details by ID
const getProviderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const provider = await User.findOne({ 
      _id: id, 
      role: 'provider',
      isActive: true 
    }).select('firstName lastName businessName businessAddress businessLogo businessDescription rating totalReviews isVerified createdAt phone email');
    
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    const services = await Service.find({ providerId: id, isActive: true })
      .select('name description category price discountedPrice duration rating totalBookings images');
    
    const recentBookings = await Booking.find({ 
      providerId: id, 
      status: 'completed',
      customerRatingProvider: { $exists: true, $ne: null }
    })
      .populate('customerId', 'firstName lastName')
      .select('customerRatingProvider customerReviewProvider createdAt')
      .limit(10)
      .sort({ createdAt: -1 });
    
    const reviews = recentBookings.map(booking => ({
      customerName: booking.customerId ? `${booking.customerId.firstName} ${booking.customerId.lastName}` : 'Anonymous',
      rating: booking.customerRatingProvider || 5,
      review: booking.customerReviewProvider || 'Great service!',
      date: booking.createdAt
    }));
    
    res.json({
      success: true,
      provider: {
        id: provider._id,
        name: provider.businessName || `${provider.firstName} ${provider.lastName}`,
        ownerName: `${provider.firstName} ${provider.lastName}`,
        email: provider.email,
        phone: provider.phone,
        address: provider.businessAddress || 'Address not specified',
        description: provider.businessDescription || 'Professional auto service provider',
        logo: provider.businessLogo || `https://ui-avatars.com/api/?background=10b981&color=fff&name=${(provider.businessName || provider.firstName)?.charAt(0) || 'P'}`,
        rating: provider.rating || 4.5,
        totalReviews: provider.totalReviews || 0,
        isVerified: provider.isVerified || false,
        memberSince: provider.createdAt,
        totalServices: services.length
      },
      services: services.map(s => ({
        _id: s._id,
        name: s.name,
        description: s.description,
        category: s.category,
        price: s.price,
        discountedPrice: s.discountedPrice,
        duration: s.duration,
        rating: s.rating || 4.5,
        totalBookings: s.totalBookings || 0
      })),
      reviews,
      totalServices: services.length,
      totalReviews: reviews.length
    });
  } catch (error) {
    console.error('Get provider details error:', error);
    res.status(500).json({ error: 'Failed to get provider details' });
  }
};

// Get all drivers
const getAllDrivers = async (req, res) => {
  try {
    const drivers = await User.find({ 
      role: 'driver', 
      isActive: true 
    }).select('firstName lastName profilePicture rating totalDeliveries vehicleModel vehicleColor isOnline currentLocation');
    
    const driversWithStats = drivers.map(driver => ({
      id: driver._id,
      name: `${driver.firstName} ${driver.lastName}`,
      avatar: driver.profilePicture || `https://ui-avatars.com/api/?background=f59e0b&color=fff&name=${driver.firstName?.charAt(0) || 'D'}`,
      rating: driver.rating || 4.8,
      totalDeliveries: driver.totalDeliveries || 0,
      vehicle: `${driver.vehicleColor || ''} ${driver.vehicleModel || 'Vehicle'}`.trim() || 'Vehicle not specified',
      isOnline: driver.isOnline || false,
      currentLocation: driver.currentLocation
    }));
    
    driversWithStats.sort((a, b) => b.rating - a.rating);
    
    const onlineDrivers = driversWithStats.filter(d => d.isOnline);
    const offlineDrivers = driversWithStats.filter(d => !d.isOnline);
    
    res.json({ 
      success: true, 
      onlineDrivers,
      offlineDrivers,
      total: driversWithStats.length,
      onlineCount: onlineDrivers.length
    });
  } catch (error) {
    console.error('Get all drivers error:', error);
    res.status(500).json({ error: 'Failed to get drivers', onlineDrivers: [], offlineDrivers: [], total: 0, onlineCount: 0 });
  }
};

// Get driver details
const getDriverDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const driver = await User.findOne({ 
      _id: id, 
      role: 'driver',
      isActive: true 
    }).select('firstName lastName profilePicture phone email rating totalDeliveries vehicleModel vehicleColor vehiclePlate driversLicense isOnline currentLocation createdAt');
    
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    const completedDeliveries = await Booking.countDocuments({ 
      driverId: id, 
      status: 'completed' 
    });
    
    const recentDeliveries = await Booking.find({ 
      driverId: id, 
      status: 'completed' 
    })
      .populate('customerId', 'firstName lastName')
      .populate('serviceId', 'name')
      .select('bookingDate totalAmount completedAt')
      .limit(10)
      .sort({ completedAt: -1 });
    
    res.json({
      success: true,
      driver: {
        id: driver._id,
        name: `${driver.firstName} ${driver.lastName}`,
        email: driver.email,
        phone: driver.phone,
        avatar: driver.profilePicture || `https://ui-avatars.com/api/?background=f59e0b&color=fff&name=${driver.firstName?.charAt(0) || 'D'}`,
        rating: driver.rating || 4.8,
        totalDeliveries: driver.totalDeliveries || 0,
        vehicleModel: driver.vehicleModel || 'Not specified',
        vehicleColor: driver.vehicleColor || '',
        vehiclePlate: driver.vehiclePlate || 'N/A',
        driversLicense: driver.driversLicense || 'N/A',
        isOnline: driver.isOnline || false,
        memberSince: driver.createdAt,
        recentDeliveries: recentDeliveries.map(d => ({
          serviceName: d.serviceId?.name || 'Unknown service',
          customerName: d.customerId ? `${d.customerId.firstName} ${d.customerId.lastName}` : 'Anonymous',
          date: d.completedAt || d.createdAt,
          amount: d.totalAmount
        })),
        completedDeliveries
      }
    });
  } catch (error) {
    console.error('Get driver details error:', error);
    res.status(500).json({ error: 'Failed to get driver details' });
  }
};

// Get all services with provider info
const getAllServicesWithProviders = async (req, res) => {
  try {
    const { category, minPrice, maxPrice, search } = req.query;
    let query = { isActive: true };
    
    if (category && category !== 'all') query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    const services = await Service.find(query)
      .populate('providerId', 'firstName lastName businessName businessLogo rating isVerified');
    
    const formattedServices = services.map(service => {
      const provider = service.providerId;
      return {
        id: service._id,
        name: service.name,
        description: service.description || 'No description available',
        category: service.category,
        price: service.price,
        discountedPrice: service.discountedPrice,
        duration: service.duration,
        rating: service.rating || 4.5,
        totalBookings: service.totalBookings || 0,
        provider: {
          id: provider?._id || null,
          name: provider?.businessName || provider?.firstName ? `${provider.firstName} ${provider.lastName}` : 'Unknown Provider',
          logo: provider?.businessLogo || `https://ui-avatars.com/api/?background=10b981&color=fff&name=${(provider?.businessName || provider?.firstName)?.charAt(0) || 'P'}`,
          rating: provider?.rating || 4.5,
          isVerified: provider?.isVerified || false
        }
      };
    });
    
    res.json({ 
      success: true, 
      services: formattedServices,
      total: formattedServices.length
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Failed to get services', services: [], total: 0 });
  }
};

// Get discovery stats
const getDiscoveryStats = async (req, res) => {
  try {
    const totalProviders = await User.countDocuments({ role: 'provider', isActive: true, isVerified: true });
    const totalDrivers = await User.countDocuments({ role: 'driver', isActive: true });
    const totalServices = await Service.countDocuments({ isActive: true });
    const totalBookings = await Booking.countDocuments({ status: 'completed' });
    
    const topProviders = await User.find({ role: 'provider', isActive: true, isVerified: true })
      .select('firstName lastName businessName rating totalReviews')
      .sort({ rating: -1 })
      .limit(5);
    
    res.json({
      success: true,
      stats: {
        totalProviders,
        totalDrivers,
        totalServices,
        totalBookings,
        averageRating: 4.8
      },
      topProviders: topProviders.map(p => ({
        name: p.businessName || `${p.firstName} ${p.lastName}`,
        rating: p.rating || 4.5,
        reviews: p.totalReviews || 0
      }))
    });
  } catch (error) {
    console.error('Get discovery stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
};

module.exports = {
  getAllProviders,
  getProviderDetails,
  getAllDrivers,
  getDriverDetails,
  getAllServicesWithProviders,
  getDiscoveryStats
};
