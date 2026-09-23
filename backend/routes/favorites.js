const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Favorite = require('../models/Favorite');
const Game = require('../models/Game');
const auth = require('../middleware/auth');

const router = express.Router();

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// POST /api/favorites - Save a game to favorites
router.post('/', auth, [
  body('gameId').notEmpty().withMessage('Game ID is required'),
  body('category').optional().trim().isLength({ min: 1, max: 50 }),
  body('notes').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Door 6: allowlist
    const { gameId, category, notes } = req.body;
    if (!isValidId(gameId)) return res.status(400).json({ message: 'Invalid Game ID.' });

    // Door 5: IDOR verification
    const game = await Game.findOne({ _id: gameId, userId: req.userId });
    if (!game) {
      return res.status(404).json({ message: 'Game not found.' });
    }

    const existing = await Favorite.findOne({ userId: req.userId, gameId });
    if (existing) {
      return res.status(400).json({ message: 'Game is already in favorites.' });
    }

    const favorite = new Favorite({
      userId: req.userId,
      gameId,
      category: category || 'General',
      notes: notes || ''
    });

    await favorite.save();
    
    // Remove __v before sending back
    const safeFav = favorite.toObject();
    delete safeFav.__v;

    res.status(201).json({ message: 'Added to favorites!', favorite: safeFav });
  } catch (error) {
    console.error('Favorite creation error:', error.message);
    res.status(500).json({ message: 'Error adding to favorites.' });
  }
});

// GET /api/favorites - Get all favorites grouped by category
router.get('/', auth, async (req, res) => {
  try {
    const { category } = req.query;
    
    // Door 5: lock to user
    const filter = { userId: req.userId };
    if (category) filter.category = String(category);

    const favorites = await Favorite.find(filter)
      .populate('gameId', 'gameName teams numberOfPlayers currentRound createdAt status')
      .sort({ savedAt: -1 })
      .select('-__v');

    const grouped = {};
    favorites.forEach(fav => {
      const cat = fav.category || 'General';
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(fav);
    });

    res.json({ favorites, grouped, totalCount: favorites.length });
  } catch (error) {
    console.error('Favorites retrieval error:', error.message);
    res.status(500).json({ message: 'Error retrieving favorites.' });
  }
});

// GET /api/favorites/categories - Get all unique categories
router.get('/categories', auth, async (req, res) => {
  try {
    const categories = await Favorite.distinct('category', { userId: req.userId });
    
    const categoryCounts = await Promise.all(
      categories.map(async (cat) => ({
        name: cat,
        count: await Favorite.countDocuments({ userId: req.userId, category: cat })
      }))
    );

    res.json({ categories: categoryCounts });
  } catch (error) {
    console.error('Categories error:', error.message);
    res.status(500).json({ message: 'Error retrieving categories.' });
  }
});

// PUT /api/favorites/:favoriteId - Update a favorite
router.put('/:favoriteId', auth, async (req, res) => {
  try {
    if (!isValidId(req.params.favoriteId)) return res.status(400).json({ message: 'Invalid Favorite ID.' });

    // Door 6 allowlist
    const { category, notes } = req.body;
    
    // Door 5: verify owner
    const favorite = await Favorite.findOne({ _id: req.params.favoriteId, userId: req.userId }).select('-__v');

    if (!favorite) {
      return res.status(404).json({ message: 'Favorite not found.' });
    }

    if (category !== undefined) favorite.category = String(category).substring(0, 50);
    if (notes !== undefined) favorite.notes = String(notes).substring(0, 500);

    await favorite.save();
    res.json({ message: 'Favorite updated.', favorite });
  } catch (error) {
    console.error('Favorite update error:', error.message);
    res.status(500).json({ message: 'Error updating favorite.' });
  }
});

// DELETE /api/favorites/:favoriteId - Remove from favorites
router.delete('/:favoriteId', auth, async (req, res) => {
  try {
    if (!isValidId(req.params.favoriteId)) return res.status(400).json({ message: 'Invalid Favorite ID.' });

    const favorite = await Favorite.findOneAndDelete({ 
      _id: req.params.favoriteId, 
      userId: req.userId 
    });

    if (!favorite) {
      return res.status(404).json({ message: 'Favorite not found.' });
    }

    res.json({ message: 'Removed from favorites.' });
  } catch (error) {
    console.error('Favorite deletion error:', error.message);
    res.status(500).json({ message: 'Error removing favorite.' });
  }
});

module.exports = router;