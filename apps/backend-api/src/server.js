const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

// Import routes that exist
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');
const customerRoutes = require('./routes/customerRoutes');
const discoveryRoutes = require('./routes/discoveryRoutes');
const driverRoutes = require('./routes/driverRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const loyaltyRoutes = require('./routes/loyaltyRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const promoRoutes = require('./routes/promoRoutes');
const providerRoutes = require('./routes/providerRoutes');
const refundRoutes = require('./routes/refundRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const stripeConnectRoutes = require('./routes/stripeConnectRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/promo', promoRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/stripe-connect', stripeConnectRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Car Care Connect API', timestamp: new Date().toISOString() });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Car Care Connect API', version: '1.0.0', status: 'running' });
});

// MongoDB Connection - FIXED for newer mongoose version
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/carcareconnect';

console.log('MongoDB URI:', MONGODB_URI ? '✓ Set (hidden for security)' : '✗ Missing');

// Updated connection options for mongoose 7+
mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('✅ MongoDB connected successfully to Car Care Connect database');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.error('Please check:');
  console.error('  1. MONGODB_URI environment variable is set correctly');
  console.error('  2. MongoDB Atlas IP whitelist includes 0.0.0.0/0');
  console.error('  3. Database user credentials are correct');
  process.exit(1);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('CAR CARE CONNECT BACKEND RUNNING');
  console.log('========================================');
  console.log('Server: http://localhost:' + PORT);
  console.log('WebSocket: ws://localhost:' + PORT);
  console.log('Health: http://localhost:' + PORT + '/api/health');
  console.log('Auth: http://localhost:' + PORT + '/api/auth');
  console.log('========================================');
  console.log('');
});

module.exports = { app, server, io };
