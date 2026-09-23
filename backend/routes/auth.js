const express = require('express');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// ── Door 7: rate limit auth only (gameplay stays unlimited) ───────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many accounts created from this IP. Please try again later.' }
});

const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many profile updates. Please try again later.' }
});

// Generate JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Shared safe user shape (Door 12)
const publicUser = (user) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  profilePrivacy: user.profilePrivacy,
  totalGamesPlayed: user.totalGamesPlayed,
  totalWins: user.totalWins,
  createdAt: user.createdAt
});

// POST /api/auth/register
router.post(
  '/register',
  registerLimiter,
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username may only contain letters, numbers, and underscores'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please enter a valid email'),
    body('password')
      .isLength({ min: 6, max: 128 })
      .withMessage('Password must be between 6 and 128 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Door 6: field allowlist — ignore any extra body keys (e.g. role, totalWins)
      const username = req.body.username;
      const email = req.body.email;
      const password = req.body.password;

      const existingUser = await User.findOne({
        $or: [{ email }, { username }]
      }).select('_id email username');

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
        user: publicUser(user)
      });
    } catch (error) {
      console.error('Registration error:', error.message);
      res.status(500).json({ message: 'Server error during registration.' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Door 6: allowlist
      const email = req.body.email;
      const password = req.body.password;

      // password is select:false — must request it explicitly
      const user = await User.findOne({ email }).select('+password');
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
        user: publicUser(user)
      });
    } catch (error) {
      console.error('Login error:', error.message);
      res.status(500).json({ message: 'Server error during login.' });
    }
  }
);

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    res.json({ user: publicUser(req.user) });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/auth/profile
router.put(
  '/profile',
  auth,
  profileLimiter,
  [
    body('profilePrivacy')
      .optional()
      .isIn(['public', 'private'])
      .withMessage('Privacy must be public or private'),
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username may only contain letters, numbers, and underscores')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Door 6: strict allowlist — never accept role, email, password, totals, etc.
      const updates = {};
      if (req.body.profilePrivacy !== undefined) {
        updates.profilePrivacy = req.body.profilePrivacy;
      }
      if (req.body.username !== undefined) {
        const username = req.body.username;
        const existing = await User.findOne({
          username,
          _id: { $ne: req.userId }
        }).select('_id');
        if (existing) {
          return res.status(400).json({ message: 'Username is already taken.' });
        }
        updates.username = username;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No valid fields to update.' });
      }

      const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, { new: true });
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      res.json({
        message: 'Profile updated successfully.',
        user: publicUser(user)
      });
    } catch (error) {
      console.error('Profile update error:', error.message);
      res.status(500).json({ message: 'Server error updating profile.' });
    }
  }
);

// GET /api/auth/public/:userId — public profile (limited fields only)
router.get('/public/:userId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    const user = await User.findById(req.params.userId).select(
      'username profilePrivacy totalGamesPlayed totalWins createdAt'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.profilePrivacy === 'private') {
      return res.status(403).json({ message: 'This profile is private.' });
    }

    // Door 12: only fields the UI needs — no email, no id leakage beyond path
    res.json({
      username: user.username,
      totalGamesPlayed: user.totalGamesPlayed,
      totalWins: user.totalWins,
      memberSince: user.createdAt
    });
  } catch (error) {
    console.error('Public profile error:', error.message);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;