const Service = require('../models/Service');
const Booking = require('../models/Booking');
const User = require('../models/User');

// Get all services (with filters for customer)
const getServices = async (req, res) => {
  try {
    const { category, search, featured, minPrice, maxPrice } = req.query;
    let query = { isActive: true };
    
    if (category && category !== 'all') query.category = category;
    if (featured === 'true') query.isFeatured = true;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    const services = await Service.find(query)
      .populate('providerId', 'firstName lastName businessName businessLogo businessAddress rating isVerified')
      .sort({ isFeatured: -1, totalBookings: -1, createdAt: -1 });
    
    // Get online drivers count for each service area
    const onlineDrivers = await User.countDocuments({ role: 'driver', isOnline: true, isActive: true });
    
    res.json({ success: true, services, onlineDrivers, total: services.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get services' });
  }
};

// Get single service
const getService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('providerId', 'firstName lastName businessName businessLogo businessAddress businessHours phone email rating isVerified');
    
    if (!service) return res.status(404).json({ error: 'Service not found' });
    
    // Get similar services
    const similar = await Service.find({
      category: service.category,
      _id: { $ne: service._id },
      isActive: true
    }).limit(4);
    
    res.json({ success: true, service, similar });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get service' });
  }
};

// Create service (Provider)
const createService = async (req, res) => {
  try {
    const provider = await User.findById(req.user.id);
    if (!provider) return res.status(404).json({ error: 'Provider not found' });
    
    const service = await Service.create({
      ...req.body,
      providerId: req.user.id,
      providerName: provider.firstName + ' ' + provider.lastName,
      providerBusinessName: provider.businessName,
      providerRating: provider.rating
    });
    
    res.status(201).json({ success: true, service, message: 'Service created successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create service' });
  }
};

// Update service (Provider/Admin)
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.providerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this service' });
    }
    
    const updatedService = await Service.findByIdAndUpdate(id, req.body, { new: true });
    res.json({ success: true, service: updatedService, message: 'Service updated successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update service' });
  }
};

// Delete service (Provider/Admin)
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.providerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this service' });
    }
    
    await Service.findByIdAndDelete(id);
    res.json({ success: true, message: 'Service deleted successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
};

// Get provider's services
const getProviderServices = async (req, res) => {
  try {
    const services = await Service.find({ providerId: req.user.id })
      .sort({ createdAt: -1 });
    
    // Get booking counts for each service
    const servicesWithStats = await Promise.all(services.map(async (service) => {
      const bookings = await Booking.countDocuments({ serviceId: service._id, status: 'completed' });
      return { ...service.toObject(), totalBookings: bookings };
    }));
    
    res.json({ success: true, services: servicesWithStats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get services' });
  }
};

// Toggle service status (Active/Inactive)
const toggleServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);
    
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.providerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    service.isActive = !service.isActive;
    await service.save();
    
    res.json({ success: true, service, message: `Service ${service.isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle service status' });
  }
};

// Get all categories with counts
const getCategories = async (req, res) => {
  try {
    const categories = await Service.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get categories' });
  }
};

module.exports = {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
  getProviderServices,
  toggleServiceStatus,
  getCategories
};
