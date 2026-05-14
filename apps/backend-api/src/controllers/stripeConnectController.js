const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');

// Create Stripe Connect account
const createStripeAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.stripeAccountId) {
      return res.json({ 
        success: true, 
        hasAccount: true, 
        accountId: user.stripeAccountId,
        status: user.stripeAccountStatus || 'pending'
      });
    }
    
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: user.role === 'provider' ? 'company' : 'individual',
    });
    
    user.stripeAccountId = account.id;
    user.stripeAccountStatus = 'pending';
    await user.save();
    
    res.json({ 
      success: true, 
      hasAccount: true, 
      accountId: account.id,
      status: 'pending'
    });
  } catch (error) {
    console.error('Create Stripe account error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get onboarding link
const getOnboardingLink = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    let accountId = user.stripeAccountId;
    
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      user.stripeAccountId = accountId;
      user.stripeAccountStatus = 'pending';
      await user.save();
    }
    
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`,
      type: 'account_onboarding',
    });
    
    res.json({ success: true, url: accountLink.url });
  } catch (error) {
    console.error('Get onboarding link error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Check account status
const getAccountStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || !user.stripeAccountId) {
      return res.json({ 
        success: true, 
        hasAccount: false, 
        status: null,
        onboardingComplete: false 
      });
    }
    
    try {
      const account = await stripe.accounts.retrieve(user.stripeAccountId);
      
      let status = 'pending';
      let onboardingComplete = false;
      
      if (account.charges_enabled && account.payouts_enabled) {
        status = 'active';
        onboardingComplete = true;
      } else if (account.requirements?.currently_due?.length > 0) {
        status = 'pending';  // Changed from 'action_needed' to 'pending'
      }
      
      if (user.stripeAccountStatus !== status) {
        user.stripeAccountStatus = status;
        await user.save();
      }
      
      res.json({ 
        success: true, 
        hasAccount: true, 
        accountId: user.stripeAccountId,
        status: status,
        onboardingComplete: onboardingComplete
      });
    } catch (stripeError) {
      console.error('Stripe retrieve error:', stripeError);
      res.json({ 
        success: true, 
        hasAccount: true, 
        status: 'error',
        onboardingComplete: false 
      });
    }
  } catch (error) {
    console.error('Get account status error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Disconnect Stripe account
const disconnectStripe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user && user.stripeAccountId) {
      try {
        await stripe.accounts.del(user.stripeAccountId);
      } catch (stripeError) {
        console.error('Stripe delete error:', stripeError);
      }
      
      user.stripeAccountId = null;
      user.stripeAccountStatus = null;
      await user.save();
    }
    
    res.json({ success: true, message: 'Stripe account disconnected' });
  } catch (error) {
    console.error('Disconnect Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createStripeAccount,
  getOnboardingLink,
  getAccountStatus,
  disconnectStripe
};
