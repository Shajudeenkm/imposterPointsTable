const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Door 12: never returned unless explicitly +password
  },
  profilePrivacy: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  totalGamesPlayed: {
    type: Number,
    default: 0
  },
  totalWins: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password — caller must have selected +password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Door 12: API returns only safe fields the UI needs
userSchema.methods.toJSON = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    profilePrivacy: this.profilePrivacy,
    totalGamesPlayed: this.totalGamesPlayed,
    totalWins: this.totalWins,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);