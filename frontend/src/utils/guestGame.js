// Guest mode: localStorage game + client-side scoring (mirrors backend)
import { gamesAPI } from '../services/api';

export const GUEST_GAME_KEY = 'imposter_guest_game';
export const GUEST_MODE_KEY = 'imposter_guest_mode';
export const PENDING_SAVE_KEY = 'imposter_pending_guest_save';

export const GUEST_NAME_POOLS = {
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

export const getGuestCategories = () =>
  Object.keys(GUEST_NAME_POOLS).map((key) => {
    let name = key.charAt(0).toUpperCase() + key.slice(1);
    if (key === 'malayalam') name = 'Malayalam 🌴';
    if (key === 'malayalam2') name = 'Malayalam Mass 🔥';
    return {
      id: key,
      name,
      sampleNames: GUEST_NAME_POOLS[key].slice(0, 3)
    };
  });

export const generateGuestTeams = (numberOfTeams, category = 'malayalam') => {
  const n = Math.min(20, Math.max(3, parseInt(numberOfTeams, 10) || 3));
  const pool = GUEST_NAME_POOLS[category] || GUEST_NAME_POOLS.malayalam;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(n, shuffled.length));
  while (selected.length < n) selected.push(`Team ${selected.length + 1}`);
  return selected.map((name, index) => ({
    teamId: `guest_${Date.now()}_${index}`,
    name,
    totalScore: 0
  }));
};

export const createGuestGame = ({
  teams,
  gameName,
  floorLimitEnabled = false,
  floorLimitValue = 0
}) => ({
  _id: 'guest',
  gameName: gameName || `Game ${new Date().toLocaleDateString()}`,
  teams: teams.map((t, index) => ({
    teamId: t.teamId || `guest_${Date.now()}_${index}`,
    name: t.name,
    totalScore: 0
  })),
  rounds: [],
  numberOfPlayers: teams.length,
  floorLimitEnabled: !!floorLimitEnabled,
  floorLimitValue: Number(floorLimitValue) || 0,
  status: 'active',
  currentRound: 0,
  createdAt: new Date().toISOString(),
  completedAt: null,
  isGuest: true
});

export const saveGuestGame = (game) => {
  localStorage.setItem(GUEST_GAME_KEY, JSON.stringify(game));
};

export const loadGuestGame = () => {
  try {
    const raw = localStorage.getItem(GUEST_GAME_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearGuestGame = () => {
  localStorage.removeItem(GUEST_GAME_KEY);
};

export const setGuestModeFlag = (on) => {
  if (on) localStorage.setItem(GUEST_MODE_KEY, 'true');
  else localStorage.removeItem(GUEST_MODE_KEY);
};

export const isGuestModeFlag = () => localStorage.getItem(GUEST_MODE_KEY) === 'true';

export const setPendingGuestSave = (game) => {
  localStorage.setItem(PENDING_SAVE_KEY, JSON.stringify(game));
};

export const getPendingGuestSave = () => {
  try {
    const raw = localStorage.getItem(PENDING_SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearPendingGuestSave = () => {
  localStorage.removeItem(PENDING_SAVE_KEY);
};

/** Same scoring formula as backend/routes/games.js */
export const processGuestRound = (game, imposterIds, votes) => {
  if (imposterIds.length >= game.numberOfPlayers - 1) {
    throw new Error(
      `You must leave at least 2 players as innocents. Max imposters allowed: ${game.numberOfPlayers - 2}`
    );
  }

  const imposterNames = imposterIds.map((id) => {
    const team = game.teams.find((t) => t.teamId === id);
    return team ? team.name : 'Unknown';
  });

  const nonImposterVoters = votes.filter((v) => !imposterIds.includes(v.voterId));
  const voterResults = {};
  const voterVoteMap = {};

  nonImposterVoters.forEach((v) => {
    voterResults[v.voterId] = imposterIds.includes(v.votedForId);
    const votedTeam = game.teams.find((t) => t.teamId === v.votedForId);
    voterVoteMap[v.voterId] = votedTeam ? votedTeam.name : 'Unknown';
  });

  const correctCount = Object.values(voterResults).filter((r) => r === true).length;
  const missCount = Object.values(voterResults).filter((r) => r === false).length;

  const identifiedByIds = Object.entries(voterResults)
    .filter(([, correct]) => correct)
    .map(([id]) => id);
  const identifiedByNames = identifiedByIds.map((id) => {
    const t = game.teams.find((tm) => tm.teamId === id);
    return t ? t.name : 'Unknown';
  });

  const fooledByIds = Object.entries(voterResults)
    .filter(([, correct]) => !correct)
    .map(([id]) => id);
  const fooledByNames = fooledByIds.map((id) => {
    const t = game.teams.find((tm) => tm.teamId === id);
    return t ? t.name : 'Unknown';
  });

  const updatedTeams = game.teams.map((team) => ({ ...team }));

  const roundScores = updatedTeams.map((team) => {
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

    team.totalScore = newCumulativeScore;

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

  const newRound = {
    roundNumber: game.currentRound + 1,
    imposterIds,
    imposterNames,
    votes: votes.map((v) => ({
      voterId: v.voterId,
      voterName: game.teams.find((t) => t.teamId === v.voterId)?.name || 'Unknown',
      votedForId: v.votedForId,
      votedForName: game.teams.find((t) => t.teamId === v.votedForId)?.name || 'Unknown'
    })),
    scores: roundScores,
    imposterIdentified: correctCount > 0,
    identifiedByIds,
    identifiedByNames,
    fooledByNames,
    correctCount,
    missCount,
    completedAt: new Date().toISOString()
  };

  const nextGame = {
    ...game,
    teams: updatedTeams,
    rounds: [...(game.rounds || []), newRound],
    currentRound: game.currentRound + 1
  };

  return {
    game: nextGame,
    round: newRound,
    updatedTeams,
    imposterIdentified: correctCount > 0,
    summary: {
      correctCount,
      missCount,
      imposterNames,
      identifiedByNames,
      fooledByNames
    }
  };
};

/** Replay guest rounds onto cloud after login */
export const uploadGuestGameToCloud = async (guestGame) => {
  const createRes = await gamesAPI.create({
    teams: guestGame.teams.map((t) => ({
      teamId: t.teamId,
      name: t.name
    })),
    gameName: guestGame.gameName || `Game ${new Date().toLocaleDateString()}`,
    floorLimitEnabled: !!guestGame.floorLimitEnabled,
    floorLimitValue: guestGame.floorLimitValue || 0
  });

  const newId = createRes.data.game._id;
  const rounds = guestGame.rounds || [];

  for (const round of rounds) {
    await gamesAPI.submitRound(newId, {
      imposterIds: round.imposterIds,
      votes: (round.votes || []).map((v) => ({
        voterId: v.voterId,
        votedForId: v.votedForId
      }))
    });
  }

  if (guestGame.status === 'completed' || rounds.length > 0) {
    try {
      await gamesAPI.complete(newId);
    } catch {
      // still return id if complete fails after rounds saved
    }
  }

  return newId;
};