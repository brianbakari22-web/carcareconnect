// Add to serviceController.js - add these new functions
// Update existing serviceController.js with these additional exports

const getProviderServices = async (req, res) => {
  try {
    const services = await Service.find({ providerId: req.user.id });
    res.json({ success: true, services });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get services' });
  }
};

const getProviderBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ providerId: req.user.id })
      .populate('customerId', 'firstName lastName email phone')
      .populate('serviceId', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get bookings' });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const booking = await Booking.findById(id);
    
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
};

module.exports = {
  getServices,
  getService,
  createService,
  getVehicles,
  addVehicle,
  createBooking,
  getBookings,
  cancelBooking,
  getProviderServices,
  getProviderBookings,
  updateBookingStatus
};
