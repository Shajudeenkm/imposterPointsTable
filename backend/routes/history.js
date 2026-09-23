const express = require('express');
const Game = require('../models/Game');
const auth = require('../middleware/auth');

const router = express.Router();

// Safe field list for history list views (inclusion only — never mix with -__v)
const HISTORY_LIST_FIELDS = 'gameName teams numberOfPlayers currentRound createdAt completedAt status';
const HISTORY_STATS_FIELDS = 'currentRound numberOfPlayers';
const SUMMARY_FIELDS = 'createdAt currentRound';

// GET /api/v1/history - Get game history with filtering
router.get('/', auth, async (req, res) => {
  try {
    const { period, year, month, day, page = 1, limit = 20 } = req.query;

    // Door 5: strict user isolation
    const filter = { userId: req.userId, status: 'completed' };

    // Date filtering
    if (year) {
      const parsedYear = parseInt(year, 10);
      if (Number.isNaN(parsedYear) || parsedYear < 1970 || parsedYear > 2100) {
        return res.status(400).json({ message: 'Invalid year.' });
      }

      const parsedMonth = month !== undefined ? parseInt(month, 10) - 1 : 0;
      const parsedDay = day !== undefined ? parseInt(day, 10) : 1;

      if (month !== undefined && (Number.isNaN(parsedMonth) || parsedMonth < 0 || parsedMonth > 11)) {
        return res.status(400).json({ message: 'Invalid month.' });
      }
      if (day !== undefined && (Number.isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31)) {
        return res.status(400).json({ message: 'Invalid day.' });
      }

      const startDate = new Date(parsedYear, month !== undefined ? parsedMonth : 0, day !== undefined ? parsedDay : 1);
      let endDate;

      if (day !== undefined) {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
      } else if (month !== undefined) {
        endDate = new Date(parsedYear, parsedMonth + 1, 1);
      } else {
        endDate = new Date(parsedYear + 1, 0, 1);
      }

      filter.createdAt = { $gte: startDate, $lt: endDate };
    } else if (period) {
      const now = new Date();
      let startDate;

      switch (String(period).toLowerCase()) {
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
        case 'all':
        case 'alltime':
        case 'all-time':
          startDate = null;
          break;
        default:
          startDate = new Date(0);
      }

      if (startDate) {
        filter.createdAt = { $gte: startDate, $lte: now };
      }
    }

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (safePage - 1) * safeLimit;

    const totalCount = await Game.countDocuments(filter);

    // Inclusion-only select — Game.toJSON already strips __v
    const games = await Game.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .select(HISTORY_LIST_FIELDS)
      .lean();

    // Stats across ALL completed games for this user (not just current page/filter)
    const allGames = await Game.find({ userId: req.userId, status: 'completed' })
      .select(HISTORY_STATS_FIELDS)
      .lean();

    const totalRounds = allGames.reduce((sum, g) => sum + (g.currentRound || 0), 0);
    const totalPlayers = allGames.reduce((sum, g) => sum + (g.numberOfPlayers || 0), 0);

    const stats = {
      totalGames: allGames.length,
      totalRounds,
      averageRoundsPerGame: allGames.length > 0
        ? Number((totalRounds / allGames.length).toFixed(1))
        : 0,
      averagePlayersPerGame: allGames.length > 0
        ? Number((totalPlayers / allGames.length).toFixed(1))
        : 0
    };

    res.json({
      games,
      stats,
      pagination: {
        currentPage: safePage,
        totalPages: Math.ceil(totalCount / safeLimit) || 0,
        totalCount,
        hasMore: skip + games.length < totalCount
      }
    });
  } catch (error) {
    console.error('History retrieval error:', error.message);
    res.status(500).json({ message: 'Error retrieving history.' });
  }
});

// GET /api/v1/history/summary - Get monthly summary
router.get('/summary', auth, async (req, res) => {
  try {
    const games = await Game.find({ userId: req.userId, status: 'completed' })
      .select(SUMMARY_FIELDS)
      .lean();

    const monthlySummary = {};
    games.forEach((game) => {
      if (!game.createdAt) return;
      const date = new Date(game.createdAt);
      if (Number.isNaN(date.getTime())) return;

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
      monthlySummary[key].totalRounds += game.currentRound || 0;
    });

    const summary = Object.values(monthlySummary).sort((a, b) => b.month.localeCompare(a.month));

    res.json({ summary });
  } catch (error) {
    console.error('Summary error:', error.message);
    res.status(500).json({ message: 'Error generating summary.' });
  }
});

// GET /api/v1/history/daily/:date - Get games for a specific date (YYYY-MM-DD)
router.get('/daily/:date', auth, async (req, res) => {
  try {
    const dateStr = String(req.params.date || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const parts = dateStr.split('-').map((n) => parseInt(n, 10));
    const [y, m, d] = parts;
    const date = new Date(y, m - 1, d);

    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== y ||
      date.getMonth() !== m - 1 ||
      date.getDate() !== d
    ) {
      return res.status(400).json({ message: 'Invalid date. Use a real YYYY-MM-DD calendar date.' });
    }

    const startOfDay = new Date(y, m - 1, d);
    const endOfDay = new Date(y, m - 1, d + 1);

    // Inclusion-only — omit rounds payload is large; list view uses lean list fields
    const games = await Game.find({
      userId: req.userId,
      status: 'completed',
      createdAt: { $gte: startOfDay, $lt: endOfDay }
    })
      .sort({ createdAt: -1 })
      .select(HISTORY_LIST_FIELDS)
      .lean();

    res.json({ date: dateStr, games, count: games.length });
  } catch (error) {
    console.error('Daily history error:', error.message);
    res.status(500).json({ message: 'Error retrieving daily history.' });
  }
});

module.exports = router;