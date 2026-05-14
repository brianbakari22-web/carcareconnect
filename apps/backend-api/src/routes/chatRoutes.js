const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');

// Simple test endpoint to verify route is working
router.get('/test', protect, (req, res) => {
  res.json({ success: true, message: 'Chat route is working!', userId: req.user.id });
});

// Get unread message count
router.get('/unread/count', protect, async (req, res) => {
  try {
    const Chat = require('../models/Chat');
    const count = await Chat.countDocuments({ to: req.user.id, read: false });
    res.json({ success: true, count });
  } catch (error) {
    console.error('Unread count error:', error);
    res.json({ success: true, count: 0 });
  }
});

// Get INBOX
router.get('/inbox', protect, async (req, res) => {
  try {
    const Chat = require('../models/Chat');
    const User = require('../models/User');
    
    const conversations = await Chat.aggregate([
      { $match: { to: req.user.id } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$from',
          lastMessage: { $first: '$message' },
          lastMessageTime: { $first: '$createdAt' },
          unreadCount: { $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] } }
        }
      },
      { $sort: { lastMessageTime: -1 } }
    ]);
    
    const inbox = [];
    for (const conv of conversations) {
      const sender = await User.findById(conv._id).select('firstName lastName role businessName');
      inbox.push({
        userId: conv._id,
        name: sender?.businessName || `${sender?.firstName || ''} ${sender?.lastName || ''}`,
        role: sender?.role,
        lastMessage: conv.lastMessage,
        lastMessageTime: conv.lastMessageTime,
        unreadCount: conv.unreadCount
      });
    }
    
    res.json({ success: true, inbox });
  } catch (error) {
    console.error('Inbox error:', error);
    res.json({ success: true, inbox: [] });
  }
});

// Get SENT messages
router.get('/sent', protect, async (req, res) => {
  try {
    const Chat = require('../models/Chat');
    const messages = await Chat.find({ from: req.user.id })
      .populate('to', 'firstName lastName role businessName')
      .sort({ createdAt: -1 })
      .limit(100);
    
    const sent = messages.map(msg => ({
      id: msg._id,
      to: {
        id: msg.to._id,
        name: msg.to?.businessName || `${msg.to?.firstName || ''} ${msg.to?.lastName || ''}`,
        role: msg.to?.role
      },
      message: msg.message,
      sentAt: msg.createdAt,
      read: msg.read
    }));
    
    res.json({ success: true, sent });
  } catch (error) {
    console.error('Sent messages error:', error);
    res.json({ success: true, sent: [] });
  }
});

// Send message
router.post('/send', protect, async (req, res) => {
  try {
    const Chat = require('../models/Chat');
    const { toUserId, message, bookingId } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    
    const chatMessage = await Chat.create({
      from: req.user.id,
      to: toUserId,
      message: message.trim(),
      bookingId: bookingId || null,
      read: false
    });
    
    res.json({ success: true, message: chatMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
