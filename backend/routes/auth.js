const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

// POST /api/auth/register - Register new user
router.post('/register', [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return res.status(400).json({ message: `A user with this ${field} already exists.` });
    }

    const user = new User({ username, email, password });
    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// POST /api/auth/login - Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful!',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// GET /api/auth/me - Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    res.json({ user: req.user.toJSON() });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/auth/profile - Update profile settings
router.put('/profile', auth, [
  body('profilePrivacy')
    .optional()
    .isIn(['public', 'private'])
    .withMessage('Privacy must be public or private')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { profilePrivacy, username } = req.body;
    const updates = {};

    if (profilePrivacy) updates.profilePrivacy = profilePrivacy;
    if (username) {
      const existing = await User.findOne({ username, _id: { $ne: req.userId } });
      if (existing) {
        return res.status(400).json({ message: 'Username is already taken.' });
      }
      updates.username = username;
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true });
    res.json({ message: 'Profile updated successfully.', user: user.toJSON() });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile.' });
  }
});

// GET /api/auth/public/:userId - Get public profile
router.get('/public/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.profilePrivacy === 'private') {
      return res.status(403).json({ message: 'This profile is private.' });
    }

    res.json({
      username: user.username,
      totalGamesPlayed: user.totalGamesPlayed,
      totalWins: user.totalWins,
      memberSince: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;