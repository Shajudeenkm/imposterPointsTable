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

// POST /api/teams/generate - Generate random team names
router.post('/generate', auth, (req, res) => {
  try {
    const { numberOfTeams, category = 'malayalam' } = req.body;

    if (!numberOfTeams || numberOfTeams < 2) {
      return res.status(400).json({ message: 'At least 2 teams are required.' });
    }

    if (numberOfTeams > 20) {
      return res.status(400).json({ message: 'Maximum 20 teams allowed.' });
    }

    const pool = namePools[category] || namePools.malayalam;

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selectedNames = shuffled.slice(0, Math.min(numberOfTeams, shuffled.length));

    while (selectedNames.length < numberOfTeams) {
      selectedNames.push(`Team ${selectedNames.length + 1}`);
    }

    const teams = selectedNames.map((name, index) => ({
      teamId: `team_${Date.now()}_${index}`,
      name: name,
      totalScore: 0
    }));

    res.json({ teams, category });
  } catch (error) {
    console.error('Team generation error:', error);
    res.status(500).json({ message: 'Error generating teams.' });
  }
});

// GET /api/teams/categories - Get available name categories
router.get('/categories', auth, (req, res) => {
  const categories = Object.keys(namePools).map(key => ({
    id: key,
    name: key === 'malayalam' ? 'Malayalam 🌴' : key.charAt(0).toUpperCase() + key.slice(1),
    sampleNames: namePools[key].slice(0, 3)
  }));

  res.json({ categories });
});

// GET /api/teams/suggestions - Get player name suggestions from past games & favorites
router.get('/suggestions', auth, async (req, res) => {
  try {
    // Get recent unique player names from user's past games
    const recentGames = await Game.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('teams');

    // Get names from favorited games
    const favorites = await Favorite.find({ userId: req.userId })
      .populate('gameId', 'teams')
      .limit(20);

    const nameMap = new Map(); // name -> { count, isFavorite }

    // Add recent names
    recentGames.forEach(game => {
      game.teams.forEach(team => {
        const key = team.name.trim();
        if (!nameMap.has(key)) {
          nameMap.set(key, { name: key, count: 0, isFavorite: false });
        }
        nameMap.get(key).count += 1;
      });
    });

    // Mark favorite ones
    favorites.forEach(fav => {
      if (fav.gameId && fav.gameId.teams) {
        fav.gameId.teams.forEach(team => {
          const key = team.name.trim();
          if (!nameMap.has(key)) {
            nameMap.set(key, { name: key, count: 0, isFavorite: true });
          } else {
            nameMap.get(key).isFavorite = true;
          }
        });
      }
    });

    // Sort: favorites first, then by usage count
    const suggestions = Array.from(nameMap.values())
      .sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return b.count - a.count;
      })
      .slice(0, 40);

    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ message: 'Error fetching suggestions.' });
  }
});

module.exports = router;