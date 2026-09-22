const express = require('express');
const { body, validationResult } = require('express-validator');
const Favorite = require('../models/Favorite');
const Game = require('../models/Game');
const auth = require('../middleware/auth');

const router = express.Router();

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

    const { gameId, category = 'General', notes } = req.body;

    // Verify game exists and belongs to user
    const game = await Game.findOne({ _id: gameId, userId: req.userId });
    if (!game) {
      return res.status(404).json({ message: 'Game not found.' });
    }

    // Check for duplicate
    const existing = await Favorite.findOne({ userId: req.userId, gameId });
    if (existing) {
      return res.status(400).json({ message: 'Game is already in favorites.' });
    }

    const favorite = new Favorite({
      userId: req.userId,
      gameId,
      category,
      notes
    });

    await favorite.save();

    res.status(201).json({ message: 'Added to favorites!', favorite });
  } catch (error) {
    console.error('Favorite creation error:', error);
    res.status(500).json({ message: 'Error adding to favorites.' });
  }
});

// GET /api/favorites - Get all favorites grouped by category
router.get('/', auth, async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { userId: req.userId };
    if (category) filter.category = category;

    const favorites = await Favorite.find(filter)
      .populate('gameId', 'gameName teams numberOfPlayers currentRound createdAt status')
      .sort({ savedAt: -1 });

    // Group by category
    const grouped = {};
    favorites.forEach(fav => {
      if (!grouped[fav.category]) {
        grouped[fav.category] = [];
      }
      grouped[fav.category].push(fav);
    });

    res.json({ favorites, grouped, totalCount: favorites.length });
  } catch (error) {
    console.error('Favorites retrieval error:', error);
    res.status(500).json({ message: 'Error retrieving favorites.' });
  }
});

// GET /api/favorites/categories - Get all unique categories
router.get('/categories', auth, async (req, res) => {
  try {
    const categories = await Favorite.distinct('category', { userId: req.userId });
    
    // Count per category
    const categoryCounts = await Promise.all(
      categories.map(async (cat) => ({
        name: cat,
        count: await Favorite.countDocuments({ userId: req.userId, category: cat })
      }))
    );

    res.json({ categories: categoryCounts });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ message: 'Error retrieving categories.' });
  }
});

// PUT /api/favorites/:favoriteId - Update a favorite
router.put('/:favoriteId', auth, async (req, res) => {
  try {
    const { category, notes } = req.body;
    const favorite = await Favorite.findOne({ _id: req.params.favoriteId, userId: req.userId });

    if (!favorite) {
      return res.status(404).json({ message: 'Favorite not found.' });
    }

    if (category) favorite.category = category;
    if (notes !== undefined) favorite.notes = notes;

    await favorite.save();
    res.json({ message: 'Favorite updated.', favorite });
  } catch (error) {
    console.error('Favorite update error:', error);
    res.status(500).json({ message: 'Error updating favorite.' });
  }
});

// DELETE /api/favorites/:favoriteId - Remove from favorites
router.delete('/:favoriteId', auth, async (req, res) => {
  try {
    const favorite = await Favorite.findOneAndDelete({ 
      _id: req.params.favoriteId, 
      userId: req.userId 
    });

    if (!favorite) {
      return res.status(404).json({ message: 'Favorite not found.' });
    }

    res.json({ message: 'Removed from favorites.' });
  } catch (error) {
    console.error('Favorite deletion error:', error);
    res.status(500).json({ message: 'Error removing favorite.' });
  }
});

module.exports = router;