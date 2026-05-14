const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Vehicle = require('../models/Vehicle');

// Get customer's vehicles
router.get('/customer/vehicles', protect, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ customerId: req.user.id });
    res.json({ success: true, vehicles });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get vehicles' });
  }
});

// Add customer vehicle
router.post('/customer/vehicles', protect, async (req, res) => {
  try {
    const vehicle = await Vehicle.create({ ...req.body, customerId: req.user.id });
    res.status(201).json({ success: true, vehicle });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add vehicle' });
  }
});

// Create booking
router.post('/customer/bookings', protect, async (req, res) => {
  try {
    const { serviceId, vehicleId, bookingDate, bookingTime, isConcierge, pickupAddress, notes } = req.body;
    
    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    
    const booking = await Booking.create({
      serviceId,
      customerId: req.user.id,
      providerId: service.providerId,
      vehicleId,
      serviceName: service.name,
      servicePrice: service.price,
      bookingDate,
      bookingTime,
      totalAmount: service.price,
      isConcierge: isConcierge || false,
      pickupAddress,
      notes,
      status: 'pending',
      paymentStatus: 'pending'
    });
    
    res.status(201).json({ success: true, booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Get customer's bookings
router.get('/customer/bookings', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ customerId: req.user.id })
      .populate('serviceId', 'name')
      .populate('providerId', 'firstName lastName businessName')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

// Cancel booking
router.put('/customer/bookings/:id/cancel', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.customerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    booking.status = 'cancelled';
    await booking.save();
    
    res.json({ success: true, message: 'Booking cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// Get provider's bookings
router.get('/provider/bookings', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ providerId: req.user.id })
      .populate('customerId', 'firstName lastName email phone')
      .populate('serviceId', 'name')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

// Update booking status (provider)
router.put('/provider/bookings/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.providerId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    booking.status = status;
    await booking.save();
    
    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// Get provider's services
router.get('/provider/my-services', protect, async (req, res) => {
  try {
    const services = await Service.find({ providerId: req.user.id });
    res.json({ success: true, services });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get services' });
  }
});

// Get all services (public)
router.get('/', async (req, res) => {
  try {
    const services = await Service.find({ isActive: true })
      .populate('providerId', 'firstName lastName businessName');
    res.json({ success: true, services });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get services' });
  }
});

// Get single service
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('providerId', 'firstName lastName businessName');
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get service' });
  }
});

// Create service (provider)
router.post('/', protect, async (req, res) => {
  try {
    const service = await Service.create({
      ...req.body,
      providerId: req.user.id
    });
    res.status(201).json({ success: true, service });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Update service
router.put('/:id', protect, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.providerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const updated = await Service.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, service: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// Delete service
router.delete('/:id', protect, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.providerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await Service.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Service deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// Toggle service status
router.patch('/:id/toggle-status', protect, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.providerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    service.isActive = !service.isActive;
    await service.save();
    res.json({ success: true, service });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle status' });
  }
});

// Get categories
router.get('/public/categories', async (req, res) => {
  try {
    const categories = await Service.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

module.exports = router;
