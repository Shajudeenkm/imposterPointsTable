const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Server-side auth gate (Door 4).
 * Attaches req.user and req.userId. Password is never selected.
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided. Access denied.' });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({ message: 'No token provided. Access denied.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired. Please login again.' });
      }
      return res.status(401).json({ message: 'Invalid token.' });
    }

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ message: 'Invalid token payload.' });
    }

    // password has select:false — will not be loaded
    const user = await User.findById(decoded.userId).select('-__v');
    if (!user) {
      return res.status(401).json({ message: 'User not found. Token invalid.' });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(500).json({ message: 'Server error during authentication.' });
  }
};

module.exports = auth;