const express = require('express');
const router = express.Router();
const { register, login, getMe, checkEmail, checkPhone } = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

// Public routes - Anyone can access
router.post('/register', register);
router.post('/login', login);
router.get('/check-email', checkEmail);
router.get('/check-phone', checkPhone);

// Protected routes - Require authentication
router.get('/me', protect, getMe);

module.exports = router;
