const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (userId, role, email) => {
  return jwt.sign(
    { id: userId, role: role, email: email },
    process.env.JWT_SECRET || 'carcareconnect_secret_key_2024',
    { expiresIn: '30d' }
  );
};

// Register ANY user - No restrictions
const register = async (req, res) => {
  try {
    const {
      email,
      password,
      confirmPassword,
      firstName,
      lastName,
      phone,
      role,
      businessName,
      driversLicense,
      vehicleModel,
      vehicleColor,
      vehiclePlate,
      address
    } = req.body;

    console.log('Registration attempt:', { email, role, firstName, lastName });

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !phone || !role) {
      return res.status(400).json({ 
        error: 'All required fields must be filled',
        required: ['email', 'password', 'firstName', 'lastName', 'phone', 'role']
      });
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Password strength check
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Phone format validation
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Please enter a valid phone number' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Build user data
    const userData = {
      email: email.toLowerCase(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone,
      role: role,
      isActive: true,
      isVerified: false,
      memberSince: new Date()
    };

    // Add role-specific data if provided
    if (role === 'provider' && businessName) {
      userData.businessName = businessName.trim();
    }
    
    if (role === 'driver' && driversLicense) {
      userData.driversLicense = driversLicense;
      userData.vehicleModel = vehicleModel || '';
      userData.vehicleColor = vehicleColor || '';
      userData.vehiclePlate = vehiclePlate || '';
    }
    
    if (role === 'customer' && address) {
      userData.address = address;
    }

    // Create user
    const user = await User.create(userData);
    console.log('User created successfully:', { id: user._id, email: user.email, role: user.role });

    // Generate token
    const token = generateToken(user._id, user.role, user.email);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
        businessName: user.businessName
      },
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully!`
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

// Login ANY user - No restrictions
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    console.log('Login attempt:', { email, role });

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('User found:', { id: user._id, role: user.role });

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is suspended. Please contact support.' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('Invalid password for:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('Login successful for:', email);

    // Update last active
    user.lastActive = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id, user.role, user.email);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
        businessName: user.businessName,
        isOnline: user.isOnline
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

// Get current user
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
};

// Check if email exists
const checkEmail = async (req, res) => {
  try {
    const { email } = req.query;
    const user = await User.findOne({ email: email.toLowerCase() });
    res.json({ exists: !!user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check email' });
  }
};

// Check if phone exists
const checkPhone = async (req, res) => {
  try {
    const { phone } = req.query;
    const user = await User.findOne({ phone });
    res.json({ exists: !!user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check phone' });
  }
};

module.exports = { register, login, getMe, checkEmail, checkPhone };
