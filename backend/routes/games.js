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
  body('floorLimitValue').optional().isNumeric(),
  body('votingMode').optional().isIn(['single', 'multi']),
  body('allowImposterVoting').optional().isBoolean(),
  body('requiredVotesPerPlayer').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Door 6: Strict field allowlist (no passing full req.body)
    const {
      teams,
      gameName,
      floorLimitEnabled,
      floorLimitValue,
      votingMode,
      allowImposterVoting,
      requiredVotesPerPlayer
    } = req.body;

    // Door 8: Server-side validation of incoming team names
    const seenNames = new Set();
    const validatedTeams = [];

    for (let i = 0; i < teams.length; i++) {
      const t = teams[i];
      const cleanedName = String(t?.name || '').trim();

      if (!cleanedName) {
        return res.status(400).json({ message: `Player ${i + 1} name is required.` });
      }

      if (cleanedName.length > 40) {
        return res.status(400).json({
          message: `Player name "${cleanedName.substring(0, 10)}..." exceeds maximum limit of 40 characters.`
        });
      }

      const lowerName = cleanedName.toLowerCase();
      if (seenNames.has(lowerName)) {
        return res.status(400).json({ message: 'Duplicate team names are not allowed.' });
      }
      seenNames.add(lowerName);

      validatedTeams.push({
        teamId: t.teamId || `team_${Date.now()}_${i}`,
        name: cleanedName,
        totalScore: 0
      });
    }

    const game = new Game({
      userId: req.userId,
      gameName: gameName || `Game ${new Date().toLocaleDateString()}`,
      teams: validatedTeams,
      numberOfPlayers: validatedTeams.length,
      floorLimitEnabled: floorLimitEnabled || false,
      floorLimitValue: floorLimitValue || 0,
      votingMode: votingMode === 'multi' ? 'multi' : 'single',
      allowImposterVoting: allowImposterVoting === true,
      requiredVotesPerPlayer: Number.isInteger(requiredVotesPerPlayer) ? requiredVotesPerPlayer : 1,
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

// POST /api/games/:gameId/rounds - Submit a round (supports single + multi vote)
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

    // Mode determination
    const isMultiVote = game.votingMode === 'multi' && imposterIds.length >= 2 && game.numberOfPlayers >= 5;
    const allowImposterVoting = !!game.allowImposterVoting && game.numberOfPlayers >= 5;
    // IMPORTANT: Imposter voting only affects imposter scores in MULTI mode.
    const imposterVotingCountsForScore = isMultiVote && allowImposterVoting;

    const imposterNames = imposterIds.map(id => {
      const team = game.teams.find(t => t.teamId === id);
      return team ? team.name : 'Unknown';
    });

    // Group votes per voter
    const votesByVoter = {};

    votes.forEach(v => {
      if (!votesByVoter[v.voterId]) votesByVoter[v.voterId] = [];
      const votedTeam = game.teams.find(t => t.teamId === v.votedForId);
      votesByVoter[v.voterId].push({
        votedForId: v.votedForId,
        votedForName: votedTeam ? votedTeam.name : 'Unknown',
        isCorrect: imposterIds.includes(v.votedForId)
      });
    });

    // Determine allowed voters
    const allowedVoterIds = allowImposterVoting
      ? game.teams.map(t => t.teamId)
      : game.teams.filter(t => !imposterIds.includes(t.teamId)).map(t => t.teamId);

    // Filter out disallowed voter entries
    Object.keys(votesByVoter).forEach(voterId => {
      if (!allowedVoterIds.includes(voterId)) {
        delete votesByVoter[voterId];
      }
    });

    // Aggregate totals (from NON-IMPOSTER votes only — imposter fool bonus is based on these)
    let correctCount = 0;
    let missCount = 0;
    const identifiedByIds = new Set();
    const fooledByIds = new Set();

    Object.entries(votesByVoter).forEach(([voterId, voterVotes]) => {
      if (imposterIds.includes(voterId)) return; // skip imposters for correct/miss tally
      voterVotes.forEach(vv => {
        if (vv.isCorrect) {
          correctCount += 1;
          identifiedByIds.add(voterId);
        } else {
          missCount += 1;
          fooledByIds.add(voterId);
        }
      });
    });

    const identifiedByNames = Array.from(identifiedByIds).map(id => {
      const t = game.teams.find(tm => tm.teamId === id);
      return t ? t.name : 'Unknown';
    });

    const fooledByNames = Array.from(fooledByIds).map(id => {
      const t = game.teams.find(tm => tm.teamId === id);
      return t ? t.name : 'Unknown';
    });

    // Per-team round score
    const roundScores = game.teams.map(team => {
      const isImposter = imposterIds.includes(team.teamId);
      let roundScore = 0;
      const teamVotes = votesByVoter[team.teamId] || [];

      if (isImposter) {
        // Base: fool bonus from non-imposter votes
        roundScore = missCount - correctCount;

        // If multi-vote + imposter voting is on, imposters get ±1 for their own votes too
        if (imposterVotingCountsForScore) {
          teamVotes.forEach(vv => {
            roundScore += vv.isCorrect ? 1 : -1;
          });
        }
      } else {
        // Non-imposter: +1 for each correct vote, -1 for each wrong vote
        teamVotes.forEach(vv => {
          roundScore += vv.isCorrect ? 1 : -1;
        });
      }

      let newCumulativeScore = team.totalScore + roundScore;

      if (game.floorLimitEnabled && newCumulativeScore < game.floorLimitValue) {
        newCumulativeScore = game.floorLimitValue;
        roundScore = game.floorLimitValue - team.totalScore;
      }

      const correctInThisTeam = teamVotes.filter(vv => vv.isCorrect).length;
      const primaryVote = teamVotes[0];

      return {
        teamId: team.teamId,
        teamName: team.name,
        roundScore,
        cumulativeScore: newCumulativeScore,
        wasImposter: isImposter,
        wasIdentified: isImposter && correctCount > 0,
        identifiedImposter: !isImposter && correctInThisTeam > 0,
        votedFor: primaryVote
          ? teamVotes.map(vv => vv.votedForName).join(', ')
          : '',
        votes: teamVotes.map(vv => ({
          votedForId: vv.votedForId,
          votedForName: vv.votedForName,
          isCorrect: vv.isCorrect
        }))
      };
    });

    roundScores.forEach(rs => {
      const team = game.teams.find(t => t.teamId === rs.teamId);
      if (team) team.totalScore = rs.cumulativeScore;
    });

    const flatVotes = [];
    Object.entries(votesByVoter).forEach(([voterId, voterVotes]) => {
      const voterTeam = game.teams.find(t => t.teamId === voterId);
      const voterName = voterTeam ? voterTeam.name : 'Unknown';
      voterVotes.forEach(vv => {
        flatVotes.push({
          voterId,
          voterName,
          votedForId: vv.votedForId,
          votedForName: vv.votedForName
        });
      });
    });

    const newRound = {
      roundNumber: game.currentRound + 1,
      imposterIds,
      imposterNames,
      votes: flatVotes,
      scores: roundScores,
      imposterIdentified: correctCount > 0,
      identifiedByIds: Array.from(identifiedByIds),
      identifiedByNames,
      fooledByNames,
      correctCount,
      missCount,
      votingMode: isMultiVote ? 'multi' : 'single',
      allowImposterVoting,
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

    const seenNames = new Set();
    const processedUpdates = [];

    for (let i = 0; i < teams.length; i++) {
      const update = teams[i];
      if (update.teamId && update.name) {
        const cleanedName = String(update.name).trim();

        if (!cleanedName) {
          return res.status(400).json({ message: 'All player names must be populated.' });
        }

        if (cleanedName.length > 40) {
          return res.status(400).json({ message: `Player name exceeds the 40 character maximum.` });
        }

        const lowerName = cleanedName.toLowerCase();
        if (seenNames.has(lowerName)) {
          return res.status(400).json({ message: 'Duplicate team names are not allowed.' });
        }
        seenNames.add(lowerName);
        processedUpdates.push({ teamId: update.teamId, name: cleanedName });
      }
    }

    processedUpdates.forEach(update => {
      const team = game.teams.find(t => t.teamId === update.teamId);
      if (team) {
        team.name = update.name;
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

    const {
      floorLimitEnabled,
      floorLimitValue,
      votingMode,
      allowImposterVoting,
      requiredVotesPerPlayer
    } = req.body;

    const game = await Game.findOne({ _id: req.params.gameId, userId: req.userId });
    if (!game) return res.status(404).json({ message: 'Game not found.' });

    if (typeof floorLimitEnabled === 'boolean') game.floorLimitEnabled = floorLimitEnabled;
    if (typeof floorLimitValue === 'number') game.floorLimitValue = floorLimitValue;
    if (votingMode === 'single' || votingMode === 'multi') game.votingMode = votingMode;
    if (typeof allowImposterVoting === 'boolean') game.allowImposterVoting = allowImposterVoting;
    if (Number.isInteger(requiredVotesPerPlayer) && requiredVotesPerPlayer >= 1) {
      game.requiredVotesPerPlayer = requiredVotesPerPlayer;
    }

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