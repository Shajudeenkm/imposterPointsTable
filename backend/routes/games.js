const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Game = require('../models/Game');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper to validate ObjectIds (prevents 500 server crash on malformed IDs)
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// POST /api/games - Create a new game session
router.post('/', auth, [
  body('teams').isArray({ min: 3 }).withMessage('At least 3 teams are required'),
  body('gameName').optional().trim().isLength({ max: 100 }),
  body('floorLimitEnabled').optional().isBoolean(),
  body('floorLimitValue').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Door 6: Strict field allowlist (no passing full req.body)
    const { teams, gameName, floorLimitEnabled, floorLimitValue } = req.body;

    const game = new Game({
      userId: req.userId,
      gameName: gameName || `Game ${new Date().toLocaleDateString()}`,
      teams: teams.map((team, index) => ({
        teamId: team.teamId || `team_${Date.now()}_${index}`,
        name: team.name,
        totalScore: 0
      })),
      numberOfPlayers: teams.length,
      floorLimitEnabled: floorLimitEnabled || false,
      floorLimitValue: floorLimitValue || 0,
      currentRound: 0,
      status: 'active'
    });

    await game.save();

    res.status(201).json({
      message: 'Game created successfully!',
      game
    });
  } catch (error) {
    console.error('Game creation error:', error.message);
    res.status(500).json({ message: 'Error creating game.' });
  }
});

// GET /api/games/:gameId
router.get('/:gameId', auth, async (req, res) => {
  try {
    if (!isValidId(req.params.gameId)) return res.status(400).json({ message: 'Invalid Game ID.' });

    // Door 5: IDOR check - must match req.userId
    // Door 12: Remove internal __v
    const game = await Game.findOne({ _id: req.params.gameId, userId: req.userId }).select('-__v');
    if (!game) return res.status(404).json({ message: 'Game not found.' });
    
    res.json({ game });
  } catch (error) {
    console.error('Get game error:', error.message);
    res.status(500).json({ message: 'Error retrieving game.' });
  }
});

// GET /api/games
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { userId: req.userId };
    if (status && ['active', 'completed', 'paused'].includes(status)) {
      filter.status = status;
    }

    const games = await Game.find(filter).sort({ createdAt: -1 }).select('-__v');
    res.json({ games });
  } catch (error) {
    console.error('Get games error:', error.message);
    res.status(500).json({ message: 'Error retrieving games.' });
  }
});

// POST /api/games/:gameId/rounds - Submit a round (FIXED SCORING)
router.post('/:gameId/rounds', auth, [
  body('imposterIds').isArray({ min: 1 }).withMessage('At least one imposter is required'),
  body('votes').isArray().withMessage('Votes array is required')
], async (req, res) => {
  try {
    if (!isValidId(req.params.gameId)) return res.status(400).json({ message: 'Invalid Game ID.' });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Door 5: IDOR prevention
    const game = await Game.findOne({ _id: req.params.gameId, userId: req.userId });
    if (!game) return res.status(404).json({ message: 'Game not found.' });
    if (game.status !== 'active') return res.status(400).json({ message: 'Game is not active.' });

    const { imposterIds, votes } = req.body;

    if (imposterIds.length >= game.numberOfPlayers - 1) {
      return res.status(400).json({
        message: `You must leave at least 2 players as innocents. Max imposters allowed: ${game.numberOfPlayers - 2}`
      });
    }

    const imposterNames = imposterIds.map(id => {
      const team = game.teams.find(t => t.teamId === id);
      return team ? team.name : 'Unknown';
    });

    const nonImposterVoters = votes.filter(v => !imposterIds.includes(v.voterId));
    const voterResults = {};
    const voterVoteMap = {};
    
    nonImposterVoters.forEach(v => {
      voterResults[v.voterId] = imposterIds.includes(v.votedForId);
      const votedTeam = game.teams.find(t => t.teamId === v.votedForId);
      voterVoteMap[v.voterId] = votedTeam ? votedTeam.name : 'Unknown';
    });

    const correctCount = Object.values(voterResults).filter(r => r === true).length;
    const missCount = Object.values(voterResults).filter(r => r === false).length;

    const identifiedByIds = Object.entries(voterResults).filter(([_, correct]) => correct).map(([id]) => id);
    const identifiedByNames = identifiedByIds.map(id => {
      const t = game.teams.find(tm => tm.teamId === id);
      return t ? t.name : 'Unknown';
    });

    const fooledByIds = Object.entries(voterResults).filter(([_, correct]) => !correct).map(([id]) => id);
    const fooledByNames = fooledByIds.map(id => {
      const t = game.teams.find(tm => tm.teamId === id);
      return t ? t.name : 'Unknown';
    });

    const roundScores = game.teams.map(team => {
      const isImposter = imposterIds.includes(team.teamId);
      let roundScore = 0;

      if (isImposter) {
        roundScore = missCount - correctCount;
      } else {
        roundScore = voterResults[team.teamId] === true ? 1 : -1;
      }

      let newCumulativeScore = team.totalScore + roundScore;

      if (game.floorLimitEnabled && newCumulativeScore < game.floorLimitValue) {
        newCumulativeScore = game.floorLimitValue;
        roundScore = game.floorLimitValue - team.totalScore;
      }

      return {
        teamId: team.teamId,
        teamName: team.name,
        roundScore,
        cumulativeScore: newCumulativeScore,
        wasImposter: isImposter,
        wasIdentified: isImposter && correctCount > 0,
        identifiedImposter: voterResults[team.teamId] === true,
        votedFor: voterVoteMap[team.teamId] || ''
      };
    });

    roundScores.forEach(rs => {
      const team = game.teams.find(t => t.teamId === rs.teamId);
      if (team) team.totalScore = rs.cumulativeScore;
    });

    const newRound = {
      roundNumber: game.currentRound + 1,
      imposterIds,
      imposterNames,
      votes: votes.map(v => ({
        voterId: v.voterId,
        voterName: game.teams.find(t => t.teamId === v.voterId)?.name || 'Unknown',
        votedForId: v.votedForId,
        votedForName: game.teams.find(t => t.teamId === v.votedForId)?.name || 'Unknown'
      })),
      scores: roundScores,
      imposterIdentified: correctCount > 0,
      identifiedByIds,
      identifiedByNames,
      fooledByNames,
      correctCount,
      missCount,
      completedAt: new Date()
    };

    game.rounds.push(newRound);
    game.currentRound += 1;
    await game.save();

    res.json({
      message: `Round ${game.currentRound} completed!`,
      round: newRound,
      updatedTeams: game.teams,
      imposterIdentified: correctCount > 0,
      summary: {
        correctCount,
        missCount,
        imposterNames,
        identifiedByNames,
        fooledByNames
      }
    });
  } catch (error) {
    console.error('Round submission error:', error.message);
    res.status(500).json({ message: 'Error processing round.' });
  }
});

// PUT /api/games/:gameId/teams
router.put('/:gameId/teams', auth, async (req, res) => {
  try {
    if (!isValidId(req.params.gameId)) return res.status(400).json({ message: 'Invalid Game ID.' });

    const { teams } = req.body;
    if (!Array.isArray(teams)) return res.status(400).json({ message: 'Teams must be an array.' });

    const game = await Game.findOne({ _id: req.params.gameId, userId: req.userId });
    if (!game) return res.status(404).json({ message: 'Game not found.' });

    teams.forEach(update => {
      if (update.teamId && update.name) {
        const team = game.teams.find(t => t.teamId === update.teamId);
        if (team) team.name = String(update.name).trim().substring(0, 50);
      }
    });

    await game.save();
    res.json({ message: 'Teams updated successfully.', teams: game.teams });
  } catch (error) {
    console.error('Team update error:', error.message);
    res.status(500).json({ message: 'Error updating teams.' });
  }
});

// PUT /api/games/:gameId/complete
router.put('/:gameId/complete', auth, async (req, res) => {
  try {
    if (!isValidId(req.params.gameId)) return res.status(400).json({ message: 'Invalid Game ID.' });

    const game = await Game.findOne({ _id: req.params.gameId, userId: req.userId });
    if (!game) return res.status(404).json({ message: 'Game not found.' });

    game.status = 'completed';
    game.completedAt = new Date();
    await game.save();

    await User.findByIdAndUpdate(req.userId, { $inc: { totalGamesPlayed: 1 } });

    const maxScore = Math.max(...game.teams.map(t => t.totalScore));
    const winners = game.teams.filter(t => t.totalScore === maxScore);

    res.json({
      message: 'Game completed!',
      game,
      winners: winners.map(w => w.name)
    });
  } catch (error) {
    console.error('Game completion error:', error.message);
    res.status(500).json({ message: 'Error completing game.' });
  }
});

// PUT /api/games/:gameId/settings
router.put('/:gameId/settings', auth, async (req, res) => {
  try {
    if (!isValidId(req.params.gameId)) return res.status(400).json({ message: 'Invalid Game ID.' });

    const { floorLimitEnabled, floorLimitValue } = req.body;
    const game = await Game.findOne({ _id: req.params.gameId, userId: req.userId });
    if (!game) return res.status(404).json({ message: 'Game not found.' });

    if (typeof floorLimitEnabled === 'boolean') game.floorLimitEnabled = floorLimitEnabled;
    if (typeof floorLimitValue === 'number') game.floorLimitValue = floorLimitValue;

    await game.save();
    res.json({ message: 'Game settings updated.', game });
  } catch (error) {
    console.error('Settings update error:', error.message);
    res.status(500).json({ message: 'Error updating settings.' });
  }
});

// POST /api/games/:gameId/reactivate
router.post('/:gameId/reactivate', auth, async (req, res) => {
  try {
    if (!isValidId(req.params.gameId)) return res.status(400).json({ message: 'Invalid Game ID.' });

    const game = await Game.findOne({ _id: req.params.gameId, userId: req.userId });
    if (!game) return res.status(404).json({ message: 'Game not found.' });

    game.status = 'active';
    game.completedAt = null;
    await game.save();

    res.json({ message: 'Game reactivated successfully.', game });
  } catch (err) {
    console.error('Reactivate game error:', err.message);
    res.status(500).json({ message: 'Server error reactivating game.' });
  }
});

// DELETE /api/games/:gameId
router.delete('/:gameId', auth, async (req, res) => {
  try {
    if (!isValidId(req.params.gameId)) return res.status(400).json({ message: 'Invalid Game ID.' });

    const game = await Game.findOneAndDelete({ _id: req.params.gameId, userId: req.userId });
    if (!game) return res.status(404).json({ message: 'Game not found.' });
    
    res.json({ message: 'Game deleted successfully.' });
  } catch (error) {
    console.error('Game deletion error:', error.message);
    res.status(500).json({ message: 'Error deleting game.' });
  }
});

module.exports = router;