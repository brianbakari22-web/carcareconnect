const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { submitReview, getProviderReviews, getDriverRatings, replyToReview, hideReview, getAllReviews } = require('../controllers/reviewController');

router.post('/submit', protect, submitReview);
router.get('/my-reviews', protect, getProviderReviews);
router.get('/driver/my-ratings', protect, getDriverRatings);
router.get('/all', protect, getAllReviews);
router.put('/reply/:reviewId', protect, replyToReview);
router.put('/hide/:reviewId', protect, hideReview);

module.exports = router;
