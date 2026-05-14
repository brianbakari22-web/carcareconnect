const Loyalty = require('../models/Loyalty');
const Booking = require('../models/Booking');

// Get user's loyalty points
const getMyPoints = async (req, res) => {
  try {
    let loyalty = await Loyalty.findOne({ userId: req.user.id });
    
    if (!loyalty) {
      loyalty = await Loyalty.create({
        userId: req.user.id,
        points: 0,
        lifetimePoints: 0,
        tier: 'Bronze',
        transactions: []
      });
    }
    
    res.json({ success: true, loyalty });
  } catch (error) {
    console.error('Get points error:', error);
    res.status(500).json({ error: 'Failed to get loyalty points' });
  }
};

// Earn points from booking
const earnPoints = async (userId, bookingId, amount) => {
  try {
    const pointsEarned = Math.floor(amount * 10); // 10 points per dollar
    
    let loyalty = await Loyalty.findOne({ userId });
    if (!loyalty) {
      loyalty = new Loyalty({ userId, points: 0, lifetimePoints: 0, transactions: [] });
    }
    
    loyalty.points += pointsEarned;
    loyalty.lifetimePoints += pointsEarned;
    loyalty.transactions.push({
      type: 'earn',
      points: pointsEarned,
      description: `Earned from booking #${bookingId}`,
      bookingId
    });
    
    // Update tier
    if (loyalty.lifetimePoints >= 10000) loyalty.tier = 'Platinum';
    else if (loyalty.lifetimePoints >= 5000) loyalty.tier = 'Gold';
    else if (loyalty.lifetimePoints >= 1000) loyalty.tier = 'Silver';
    else loyalty.tier = 'Bronze';
    
    await loyalty.save();
    
    return { success: true, pointsEarned };
  } catch (error) {
    console.error('Earn points error:', error);
    return { success: false };
  }
};

// Redeem points
const redeemPoints = async (req, res) => {
  try {
    const { points } = req.body;
    
    let loyalty = await Loyalty.findOne({ userId: req.user.id });
    if (!loyalty) {
      return res.status(404).json({ error: 'No loyalty account found' });
    }
    
    if (loyalty.points < points) {
      return res.status(400).json({ error: 'Insufficient points' });
    }
    
    if (points < 100) {
      return res.status(400).json({ error: 'Minimum 100 points to redeem' });
    }
    
    const discount = points / 100;
    
    loyalty.points -= points;
    loyalty.transactions.push({
      type: 'redeem',
      points: points,
      description: `Redeemed ${points} points for $${discount} discount`
    });
    
    await loyalty.save();
    
    res.json({ success: true, discount, remainingPoints: loyalty.points });
  } catch (error) {
    console.error('Redeem points error:', error);
    res.status(500).json({ error: 'Failed to redeem points' });
  }
};

// Get loyalty leaderboard
const getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await Loyalty.find()
      .populate('userId', 'firstName lastName')
      .sort({ lifetimePoints: -1 })
      .limit(10);
    
    res.json({ success: true, leaderboard });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
};

module.exports = { getMyPoints, earnPoints, redeemPoints, getLeaderboard };
