const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { getMyPoints, redeemPoints, getLeaderboard } = require('../controllers/loyaltyController');

router.get('/my-points', protect, getMyPoints);
router.post('/redeem', protect, redeemPoints);
router.get('/leaderboard', getLeaderboard);

module.exports = router;
