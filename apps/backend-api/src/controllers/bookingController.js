const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');

// Create booking (Customer)
const createBooking = async (req, res) => {
  try {
    const { serviceId, vehicleId, bookingDate, bookingTime, isConcierge, pickupAddress, notes } = req.body;
    
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    
    // Calculate total amount
    let totalAmount = service.price;
    if (isConcierge) {
      totalAmount += 20; // Concierge fee
    }
    
    // Status logic: 
    // - Concierge bookings start as "pending" so drivers can see them
    // - Regular bookings start as "pending" until provider confirms
    const status = "pending";
    
    const booking = await Booking.create({
      serviceId,
      customerId: req.user.id,
      providerId: service.providerId,
      vehicleId,
      serviceName: service.name,
      servicePrice: service.price,
      bookingDate: new Date(bookingDate),
      bookingTime,
      totalAmount,
      status,
      paymentStatus: "pending",
      isConcierge: isConcierge || false,
      pickupAddress: isConcierge ? pickupAddress : null,
      notes: notes || null
    });
    
    // Populate customer info
    await booking.populate('customerId', 'firstName lastName email phone');
    await booking.populate('providerId', 'firstName lastName businessName');
    
    res.status(201).json({ success: true, booking });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get available deliveries for driver
const getAvailableDeliveries = async (req, res) => {
  try {
    // Find pending concierge bookings with no driver assigned
    const deliveries = await Booking.find({ 
      status: "pending", 
      isConcierge: true,
      driverId: { $exists: false }
    })
      .populate('customerId', 'firstName lastName email phone address')
      .populate('providerId', 'businessName firstName lastName address')
      .populate('serviceId', 'name duration')
      .sort({ createdAt: 1 });
    
    console.log(`Found ${deliveries.length} available deliveries`);
    
    res.json({ success: true, deliveries });
  } catch (error) {
    console.error('Get available deliveries error:', error);
    res.status(500).json({ error: 'Failed to get deliveries' });
  }
};

// Accept delivery (Driver)
const acceptDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    
    if (booking.status !== "pending") {
      return res.status(400).json({ error: 'Delivery already accepted or completed' });
    }
    
    if (!booking.isConcierge) {
      return res.status(400).json({ error: 'Not a concierge delivery' });
    }
    
    booking.driverId = req.user.id;
    booking.status = "driver-assigned";
    await booking.save();
    
    // Update driver's total deliveries count
    await User.findByIdAndUpdate(req.user.id, { $inc: { totalDeliveries: 1 } });
    
    // Populate for response
    await booking.populate('customerId', 'firstName lastName email phone address');
    await booking.populate('providerId', 'businessName address');
    
    // Send notification to customer via WebSocket (handled in socket)
    
    res.json({ success: true, booking });
  } catch (error) {
    console.error('Accept delivery error:', error);
    res.status(500).json({ error: 'Failed to accept delivery' });
  }
};

module.exports = {
  createBooking,
  getAvailableDeliveries,
  acceptDelivery
};
