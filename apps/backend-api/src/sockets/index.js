const User = require('../models/User');
const Booking = require('../models/Booking');
const Chat = require('../models/Chat');
const Notification = require('../models/Notification');

module.exports = (io) => {
  const connectedUsers = new Map();
  
  // Authentication middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'carcareconnect_secret');
      const user = await User.findById(decoded.id).select('role firstName lastName');
      if (!user) {
        return next(new Error('User not found'));
      }
      socket.userId = decoded.id;
      socket.userRole = user.role;
      socket.userName = `${user.firstName} ${user.lastName}`;
      next();
    } catch (err) {
      console.error('Socket auth error:', err.message);
      next(new Error('Invalid token'));
    }
  });
  
  io.on('connection', (socket) => {
    console.log(`🔌 ${socket.userRole} ${socket.userName} (${socket.userId}) connected`);
    connectedUsers.set(socket.userId, { socketId: socket.id, role: socket.userRole, name: socket.userName });
    
    // Update last active
    User.findByIdAndUpdate(socket.userId, { lastActive: new Date() }).catch(() => {});
    
    // ============ CHAT: SEND MESSAGE ============
    socket.on('chat:send', async (data) => {
      const { toUserId, message, bookingId } = data;
      
      if (!message || message.trim() === '') {
        socket.emit('error', { message: 'Message cannot be empty' });
        return;
      }
      
      try {
        // Save to database
        const chatMessage = await Chat.create({
          from: socket.userId,
          to: toUserId,
          message: message.trim(),
          bookingId: bookingId || null,
          read: false
        });
        
        await chatMessage.populate('from', 'firstName lastName role');
        
        console.log(`💬 Chat: ${socket.userName} -> ${toUserId}: ${message.substring(0, 50)}`);
        
        // Send to recipient if online
        const recipient = connectedUsers.get(toUserId);
        if (recipient) {
          io.to(recipient.socketId).emit('chat:receive', {
            id: chatMessage._id,
            from: {
              id: socket.userId,
              name: socket.userName,
              role: socket.userRole
            },
            message: message.trim(),
            timestamp: chatMessage.createdAt,
            bookingId: bookingId
          });
        }
        
        // Send to booking room
        if (bookingId) {
          socket.to(`booking:${bookingId}`).emit('chat:room-message', {
            id: chatMessage._id,
            from: { id: socket.userId, name: socket.userName, role: socket.userRole },
            message: message.trim(),
            timestamp: chatMessage.createdAt
          });
        }
        
        // Confirm to sender
        socket.emit('chat:sent', { id: chatMessage._id, timestamp: chatMessage.createdAt });
        
      } catch (error) {
        console.error('Chat send error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // ============ CHAT: GET HISTORY ============
    socket.on('chat:history', async (data) => {
      const { bookingId } = data;
      
      try {
        const booking = await Booking.findById(bookingId);
        if (!booking) {
          socket.emit('error', { message: 'Booking not found' });
          return;
        }
        
        const hasAccess = (
          booking.customerId.toString() === socket.userId ||
          booking.providerId.toString() === socket.userId ||
          (booking.driverId && booking.driverId.toString() === socket.userId) ||
          socket.userRole === 'admin'
        );
        
        if (!hasAccess) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }
        
        const messages = await Chat.find({ bookingId })
          .populate('from', 'firstName lastName role')
          .sort({ createdAt: 1 });
        
        socket.emit('chat:history-result', { bookingId, messages });
      } catch (error) {
        console.error('Chat history error:', error);
        socket.emit('error', { message: 'Failed to fetch history' });
      }
    });
    
    // ============ CHAT: MARK AS READ ============
    socket.on('chat:mark-read', async (data) => {
      const { fromUserId } = data;
      
      try {
        await Chat.updateMany(
          { from: fromUserId, to: socket.userId, read: false },
          { read: true, readAt: new Date() }
        );
        
        const sender = connectedUsers.get(fromUserId);
        if (sender) {
          io.to(sender.socketId).emit('chat:read-receipt', { userId: socket.userId });
        }
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });
    
    // ============ TYPING INDICATORS ============
    socket.on('typing:start', (data) => {
      const { toUserId, bookingId } = data;
      const recipient = connectedUsers.get(toUserId);
      if (recipient) {
        io.to(recipient.socketId).emit('typing:start', {
          fromUserId: socket.userId,
          fromName: socket.userName,
          bookingId
        });
      }
    });
    
    socket.on('typing:stop', (data) => {
      const { toUserId, bookingId } = data;
      const recipient = connectedUsers.get(toUserId);
      if (recipient) {
        io.to(recipient.socketId).emit('typing:stop', {
          fromUserId: socket.userId,
          bookingId
        });
      }
    });
    
    // ============ JOIN BOOKING ROOM ============
    socket.on('join:booking-room', async (data) => {
      const { bookingId } = data;
      
      try {
        const booking = await Booking.findById(bookingId);
        if (!booking) {
          socket.emit('error', { message: 'Booking not found' });
          return;
        }
        
        const hasAccess = (
          booking.customerId.toString() === socket.userId ||
          booking.providerId.toString() === socket.userId ||
          (booking.driverId && booking.driverId.toString() === socket.userId) ||
          socket.userRole === 'admin'
        );
        
        if (hasAccess) {
          socket.join(`booking:${bookingId}`);
          socket.emit('joined:booking-room', { bookingId });
          console.log(`📌 ${socket.userRole} ${socket.userId} joined room booking:${bookingId}`);
        }
      } catch (error) {
        console.error('Join room error:', error);
      }
    });
    
    // ============ DRIVER LOCATION ============
    socket.on('driver:update-location', async (data) => {
      if (socket.userRole !== 'driver') return;
      
      const { lat, lng } = data;
      await User.findByIdAndUpdate(socket.userId, {
        currentLocation: { lat, lng, lastUpdate: new Date() }
      });
      
      const activeBookings = await Booking.find({
        driverId: socket.userId,
        status: { $in: ['confirmed', 'in-progress', 'driver-assigned'] }
      });
      
      activeBookings.forEach(booking => {
        const customer = connectedUsers.get(booking.customerId.toString());
        if (customer) {
          io.to(customer.socketId).emit('driver:location-update', {
            driverId: socket.userId,
            driverName: socket.userName,
            lat, lng,
            bookingId: booking._id
          });
        }
      });
    });
    
    // ============ DRIVER ONLINE STATUS ============
    socket.on('driver:online', async () => {
      if (socket.userRole !== 'driver') return;
      await User.findByIdAndUpdate(socket.userId, { isOnline: true });
      io.emit('driver:status-change', { driverId: socket.userId, driverName: socket.userName, isOnline: true });
      console.log(`🟢 Driver ${socket.userName} is now ONLINE`);
    });
    
    socket.on('driver:offline', async () => {
      if (socket.userRole !== 'driver') return;
      await User.findByIdAndUpdate(socket.userId, { isOnline: false });
      io.emit('driver:status-change', { driverId: socket.userId, driverName: socket.userName, isOnline: false });
      console.log(`🔴 Driver ${socket.userName} is now OFFLINE`);
    });
    
    // ============ BOOKING STATUS UPDATE ============
    socket.on('booking:update-status', async (data) => {
      const { bookingId, status } = data;
      
      try {
        const booking = await Booking.findById(bookingId);
        if (!booking) return;
        
        const hasAccess = (socket.userRole === 'provider' && booking.providerId.toString() === socket.userId) ||
                          (socket.userRole === 'driver' && booking.driverId?.toString() === socket.userId) ||
                          socket.userRole === 'admin';
        
        if (!hasAccess) return;
        
        booking.status = status;
        await booking.save();
        
        const parties = [booking.customerId.toString(), booking.providerId.toString()];
        if (booking.driverId) parties.push(booking.driverId.toString());
        
        parties.forEach(userId => {
          const user = connectedUsers.get(userId);
          if (user) {
            io.to(user.socketId).emit('booking:status-changed', {
              bookingId, status,
              updatedBy: { id: socket.userId, role: socket.userRole, name: socket.userName },
              timestamp: new Date()
            });
          }
        });
        
        console.log(`📅 Booking ${bookingId} status changed to ${status} by ${socket.userRole}`);
      } catch (error) {
        console.error('Booking status error:', error);
      }
    });
    
    // ============ NOTIFICATION HELPER ============
    socket.on('notification:read', async (data) => {
      const { notificationId } = data;
      try {
        await Notification.findByIdAndUpdate(notificationId, { read: true, readAt: new Date() });
      } catch (error) {
        console.error('Notification read error:', error);
      }
    });
    
    // ============ DISCONNECT ============
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.userId}`);
      connectedUsers.delete(socket.userId);
      
      if (socket.userRole === 'driver') {
        User.findByIdAndUpdate(socket.userId, { isOnline: false }).catch(() => {});
        io.emit('driver:status-change', { driverId: socket.userId, driverName: socket.userName, isOnline: false });
      }
    });
  });
  
  console.log('✅ WebSocket server initialized');
};
