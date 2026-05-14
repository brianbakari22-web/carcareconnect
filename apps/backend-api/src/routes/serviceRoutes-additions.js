// Add to serviceRoutes.js
// Add these routes after existing ones:

// Provider routes
router.get('/provider/my-services', protect, getProviderServices);
router.get('/provider/bookings', protect, getProviderBookings);
router.put('/provider/bookings/:id/status', protect, updateBookingStatus);
