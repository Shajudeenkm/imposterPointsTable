const express = require('express');
const auth = require('../middleware/auth');
const Game = require('../models/Game');
const Favorite = require('../models/Favorite');

const router = express.Router();

// Name pools for random team name generation
const namePools = {
  malayalam: [
    'Arakkal Abu', 'Shaji Pappan', 'Team Bahubali', 'Team Aadu', 'Team Marakkar',
    'Mangalassery Neelakandan', 'Vellanakkallan Bhaskaran', 'CID Moosa',
    'Ustaad Hotel', 'Kammath & Kammath', 'Team Kunjali', 'Team Pulimurugan',
    'Chackochan Squad', 'Boban and Molly', 'Kilukkam Gang', 'Thoppil Joppan',
    'Ramji Rao', 'Team Drishyam', 'Team Premam', 'Team Kumbalangi',
    'Team Njandukalude', 'Team Chackochan', 'Team Charlie', 'Team Bangalore Days',
    'Team Ustad', 'Team Angamaly', 'Team Maheshinte', 'Team Kammatipaadam',
    'Team Ee Ma Yau', 'Team Sudani', 'Team Jallikattu', 'Team Minnal Murali',
    'Achayan Squad', 'Nadan Pattukar', 'Team Kayamkulam Kochunni', 'Team Odiyan',
    'Team Kaduva', 'Team Lucifer', 'Team Vikram', 'Team Manjummel Boys'
  ],
  // Malayalam Mass / funny
  malayalam2: [
    'Aadu Thoma', 'CID Dasan', 'CID Vijayan', 'Pavanayi', 'Ramanan',
    'Spadikam', 'Punjabi House Gang', 'Meesamadhavan', 'Kalyanaraman',
    'Narasimham Squad', 'Ravanaprabhu', 'Chathikkatha Chanthu', 'Kochi Rajavu',
    'Pokkiri Raja', 'Karikku Boys', 'Dasanum Vijayanum', 'Oru Vadakkan Team',
    'Pappu & Boys', 'Jagathy Army', 'In Harihar Nagar', 'Kakkakuyil',
    'Vettam', 'CID Moosa Gang', 'Kottayam Kunjachan', 'Lelam', 'Commissioner',
    'Thilakan Squad', 'Kaduva Kuttichan', 'Manichitrathazhu', 'Thenmavin Kombath'
  ],
  movies: [
    'The Godfather', 'Pulp Fiction', 'Inception', 'The Matrix', 'Fight Club',
    'Interstellar', 'Gladiator', 'The Prestige', 'Memento', 'Shutter Island',
    'Forrest Gump', 'The Departed', 'Goodfellas', 'Scarface', 'Braveheart',
    'The Avengers', 'Jurassic Park', 'Titanic', 'Avatar', 'Jaws',
    'Back to Future', 'Star Wars', 'Iron Man', 'Dark Knight', 'Rocky'
  ],
  comedy: [
    'Michael Scott', 'Dwight Schrute', 'Ron Swanson', 'Jake Peralta',
    'Chandler Bing', 'Joey Tribbiani', 'Phil Dunphy', 'Leslie Knope',
    'Sheldon Cooper', 'Barney Stinson', 'Homer Simpson', 'Eric Cartman',
    'Larry David', 'George Costanza', 'Kramer', 'Rosa Diaz',
    'Andy Dwyer', 'April Ludgate', 'Phoebe Buffay', 'Jim Halpert',
    'Kevin Malone', 'Gina Linetti', 'Troy Barnes', 'Abed Nadir', 'Dennis Reynolds'
  ],
  animals: [
    'Thunder Wolves', 'Shadow Panthers', 'Iron Eagles', 'Storm Bears',
    'Mystic Foxes', 'Royal Lions', 'Blazing Hawks', 'Night Owls',
    'Silver Sharks', 'Crimson Falcons', 'Golden Tigers', 'Arctic Wolves',
    'Raging Bulls', 'Wild Mustangs', 'Electric Eels', 'Phantom Cobras',
    'Savage Rhinos', 'Turbo Turtles', 'Cosmic Dolphins', 'Neon Jaguars',
    'Stealth Vipers', 'Rocket Rabbits', 'Atomic Ants', 'Nuclear Narwhals', 'Laser Llamas'
  ],
  mythical: [
    'Phoenix Rising', 'Dragon Slayers', 'Unicorn Brigade', 'Griffin Guard',
    'Kraken Crew', 'Hydra Squad', 'Cerberus Pack', 'Minotaur Maze',
    'Pegasus Flight', 'Chimera Chain', 'Basilisk Band', 'Sphinx Riddle',
    'Valkyrie Vow', 'Titan Force', 'Cyclops Circle', 'Banshee Wail',
    'Gargoyle Gate', 'Werewolf Watch', 'Goblin Gang', 'Troll Tribe',
    'Fairy Fleet', 'Centaur Charge', 'Siren Song', 'Leprechaun Luck', 'Yeti Yell'
  ]
};

// Fisher–Yates shuffle (unbiased)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// POST /api/v1/teams/generate - Generate random team names
router.post('/generate', auth, (req, res) => {
  try {
    const numberOfTeams = parseInt(req.body.numberOfTeams, 10);
    const category = typeof req.body.category === 'string' ? req.body.category : 'malayalam';

    if (!numberOfTeams || numberOfTeams < 2) {
      return res.status(400).json({ message: 'At least 2 teams are required.' });
    }

    if (numberOfTeams > 20) {
      return res.status(400).json({ message: 'Maximum 20 teams allowed.' });
    }

    if (!Object.prototype.hasOwnProperty.call(namePools, category)) {
      return res.status(400).json({
        message: 'Invalid category.',
        allowed: Object.keys(namePools)
      });
    }

    const pool = namePools[category];
    const shuffled = shuffle(pool);
    const selectedNames = shuffled.slice(0, Math.min(numberOfTeams, shuffled.length));

    // If pool is smaller than requested count, pad with unique Team N names
    let pad = 1;
    while (selectedNames.length < numberOfTeams) {
      const candidate = `Team ${pad}`;
      pad += 1;
      if (!selectedNames.includes(candidate)) selectedNames.push(candidate);
    }

    const ts = Date.now();
    const teams = selectedNames.map((name, index) => ({
      teamId: `team_${ts}_${index}`,
      name,
      totalScore: 0
    }));

    res.json({ teams, category });
  } catch (error) {
    console.error('Team generation error:', error.message);
    res.status(500).json({ message: 'Error generating teams.' });
  }
});

// GET /api/v1/teams/categories - Get available name categories
router.get('/categories', auth, (_req, res) => {
  const categories = Object.keys(namePools).map((key) => {
    let displayName = key.charAt(0).toUpperCase() + key.slice(1);
    if (key === 'malayalam') displayName = 'Malayalam 🌴';
    if (key === 'malayalam2') displayName = 'Malayalam Mass 🔥';

    return {
      id: key,
      name: displayName,
      sampleNames: namePools[key].slice(0, 3),
      count: namePools[key].length
    };
  });

  res.json({ categories });
});

// GET /api/v1/teams/suggestions - player name suggestions from past games & favorites
router.get('/suggestions', auth, async (req, res) => {
  try {
    // Inclusion-only select (do NOT mix with -__v — Game.toJSON / lean handles it)
    const recentGames = await Game.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('teams')
      .lean();

    let favorites = [];
    try {
      favorites = await Favorite.find({ userId: req.userId })
        .populate({ path: 'gameId', select: 'teams' })
        .limit(50)
        .lean();
    } catch (favErr) {
      // Favorites are optional enrichment — don't fail the whole endpoint
      console.warn('Suggestions favorites lookup:', favErr.message);
      favorites = [];
    }

    const nameMap = new Map();

    const addName = (rawName, { favorite = false } = {}) => {
      if (typeof rawName !== 'string') return;
      const key = rawName.trim();
      if (!key) return;
      if (!nameMap.has(key)) {
        nameMap.set(key, { name: key, count: 0, isFavorite: false });
      }
      const entry = nameMap.get(key);
      entry.count += 1;
      if (favorite) entry.isFavorite = true;
    };

    recentGames.forEach((game) => {
      if (!Array.isArray(game.teams)) return;
      game.teams.forEach((team) => addName(team && team.name));
    });

    favorites.forEach((fav) => {
      const teams = fav.gameId && Array.isArray(fav.gameId.teams) ? fav.gameId.teams : null;
      if (!teams) return;
      teams.forEach((team) => addName(team && team.name, { favorite: true }));
    });

    const suggestions = Array.from(nameMap.values()).sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return b.count - a.count;
    });

    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error.message);
    res.status(500).json({ message: 'Error fetching suggestions.' });
  }
});

module.exports = router;