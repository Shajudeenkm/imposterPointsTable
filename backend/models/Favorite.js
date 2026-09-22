const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  category: {
    type: String,
    required: true,
    trim: true,
    default: 'General',
    maxlength: 50
  },
  notes: {
    type: String,
    default: '',
    maxlength: 500
  },
  savedAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent duplicate favorites
favoriteSchema.index({ userId: 1, gameId: 1 }, { unique: true });
favoriteSchema.index({ userId: 1, category: 1 });

module.exports = mongoose.model('Favorite', favoriteSchema);