const express = require('express');
const Game = require('../models/Game');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/history - Get game history with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { period, year, month, day, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.userId, status: 'completed' };

    // Date filtering
    if (year) {
      const startDate = new Date(year, month ? month - 1 : 0, day || 1);
      const endDate = new Date(year, month ? month : 12, day ? Number(day) + 1 : 0);
      
      if (day) {
        endDate.setDate(startDate.getDate() + 1);
      }

      filter.createdAt = { $gte: startDate, $lt: endDate };
    } else if (period) {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }

      filter.createdAt = { $gte: startDate, $lte: now };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = await Game.countDocuments(filter);
    const games = await Game.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('gameName teams numberOfPlayers currentRound createdAt completedAt status');

    // Summary statistics
    const allGames = await Game.find({ userId: req.userId, status: 'completed' });
    const stats = {
      totalGames: allGames.length,
      totalRounds: allGames.reduce((sum, g) => sum + g.currentRound, 0),
      averageRoundsPerGame: allGames.length > 0 
        ? (allGames.reduce((sum, g) => sum + g.currentRound, 0) / allGames.length).toFixed(1)
        : 0,
      averagePlayersPerGame: allGames.length > 0
        ? (allGames.reduce((sum, g) => sum + g.numberOfPlayers, 0) / allGames.length).toFixed(1)
        : 0
    };

    res.json({
      games,
      stats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasMore: skip + parseInt(limit) < totalCount
      }
    });
  } catch (error) {
    console.error('History retrieval error:', error);
    res.status(500).json({ message: 'Error retrieving history.' });
  }
});

// GET /api/history/summary - Get monthly summary
router.get('/summary', auth, async (req, res) => {
  try {
    const games = await Game.find({ userId: req.userId, status: 'completed' });

    // Group by month
    const monthlySummary = {};
    games.forEach(game => {
      const date = new Date(game.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlySummary[key]) {
        monthlySummary[key] = {
          month: key,
          label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
          gamesPlayed: 0,
          totalRounds: 0
        };
      }
      
      monthlySummary[key].gamesPlayed += 1;
      monthlySummary[key].totalRounds += game.currentRound;
    });

    const summary = Object.values(monthlySummary).sort((a, b) => b.month.localeCompare(a.month));

    res.json({ summary });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ message: 'Error generating summary.' });
  }
});

// GET /api/history/daily/:date - Get games for a specific date
router.get('/daily/:date', auth, async (req, res) => {
  try {
    const date = new Date(req.params.date);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const games = await Game.find({
      userId: req.userId,
      createdAt: { $gte: startOfDay, $lt: endOfDay }
    }).sort({ createdAt: -1 });

    res.json({ date: req.params.date, games, count: games.length });
  } catch (error) {
    console.error('Daily history error:', error);
    res.status(500).json({ message: 'Error retrieving daily history.' });
  }
});

module.exports = router;