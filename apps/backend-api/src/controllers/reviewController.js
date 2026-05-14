const Review = require('../models/Review');
const Booking = require('../models/Booking');
const User = require('../models/User');

const submitReview = async (req, res) => {
  try {
    const { bookingId, providerRating, providerReview, driverRating, driverReview } = req.body;
    
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.customerId.toString() !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    if (booking.status !== 'completed') return res.status(400).json({ error: 'Can only review completed services' });
    
    const existingReview = await Review.findOne({ bookingId });
    if (existingReview) return res.status(400).json({ error: 'Already reviewed this booking' });
    
    const review = await Review.create({
      bookingId, customerId: req.user.id, providerId: booking.providerId, driverId: booking.driverId,
      providerRating, providerReview, driverRating, driverReview, isVerifiedPurchase: true
    });
    
    // Update provider average rating
    const providerReviews = await Review.find({ providerId: booking.providerId, isHidden: false });
    const providerAvgRating = providerReviews.reduce((sum, r) => sum + r.providerRating, 0) / providerReviews.length;
    await User.findByIdAndUpdate(booking.providerId, { averageRating: providerAvgRating.toFixed(1), totalReviews: providerReviews.length });
    
    // Update driver average rating if driver exists and was rated
    if (booking.driverId && driverRating) {
      const driverReviews = await Review.find({ driverId: booking.driverId, isHidden: false });
      const driverAvgRating = driverReviews.reduce((sum, r) => sum + (r.driverRating || 0), 0) / driverReviews.length;
      await User.findByIdAndUpdate(booking.driverId, { averageRating: driverAvgRating.toFixed(1), totalReviews: driverReviews.length });
    }
    
    res.json({ success: true, review });
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ error: error.message });
  }
};

const getProviderReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ providerId: req.user.id, isHidden: false })
      .populate('customerId', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    const totalRating = reviews.reduce((sum, r) => sum + r.providerRating, 0);
    const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;
    
    res.json({ success: true, reviews, averageRating, totalReviews: reviews.length });
  } catch (error) {
    console.error('Get provider reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
};

const getDriverRatings = async (req, res) => {
  try {
    const driverId = req.user.id;
    
    const reviews = await Review.find({ driverId, isHidden: false })
      .populate('customerId', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    const totalRating = reviews.reduce((sum, r) => sum + (r.driverRating || 0), 0);
    const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;
    
    res.json({ 
      success: true, 
      reviews,
      averageRating: parseFloat(averageRating),
      totalReviews: reviews.length
    });
  } catch (error) {
    console.error('Get driver ratings error:', error);
    res.status(500).json({ error: 'Failed to get driver ratings' });
  }
};

const replyToReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { response } = req.body;
    
    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.providerId.toString() !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
    
    review.providerResponse = response;
    review.providerResponseAt = new Date();
    await review.save();
    
    res.json({ success: true, review });
  } catch (error) {
    console.error('Reply to review error:', error);
    res.status(500).json({ error: 'Failed to reply' });
  }
};

const hideReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    await Review.findByIdAndUpdate(reviewId, { isHidden: true });
    res.json({ success: true });
  } catch (error) {
    console.error('Hide review error:', error);
    res.status(500).json({ error: 'Failed to hide review' });
  }
};

const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find({})
      .populate('customerId', 'firstName lastName')
      .populate('providerId', 'firstName lastName businessName')
      .sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (error) {
    console.error('Get all reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
};

module.exports = { submitReview, getProviderReviews, getDriverRatings, replyToReview, hideReview, getAllReviews };
