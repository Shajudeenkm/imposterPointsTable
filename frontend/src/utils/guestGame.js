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

/**
 * Generate a single random name from a category, excluding names already used.
 * Used by "Add Another Player" and per-team regenerate buttons.
 */
export const generateSingleGuestName = (category = 'malayalam', excludeNames = []) => {
  const pool = GUEST_NAME_POOLS[category] || GUEST_NAME_POOLS.malayalam;
  const excludeLower = new Set(excludeNames.map((n) => (n || '').toLowerCase().trim()));
  const available = pool.filter((n) => !excludeLower.has(n.toLowerCase()));
  if (available.length === 0) {
    // Fallback to numbered team name
    let counter = excludeNames.length + 1;
    while (excludeLower.has(`team ${counter}`.toLowerCase())) counter += 1;
    return `Team ${counter}`;
  }
  return available[Math.floor(Math.random() * available.length)];
};

export const createGuestGame = ({
  teams,
  gameName,
  floorLimitEnabled = false,
  floorLimitValue = 0,
  votingMode = 'single',
  allowImposterVoting = false
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
  votingMode: votingMode === 'multi' ? 'multi' : 'single',
  allowImposterVoting: !!allowImposterVoting,
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

/**
 * Mirrors backend/routes/games.js scoring exactly.
 * `votes` is an array of { voterId, votedForId } — one entry per vote cast.
 * A voter may appear multiple times (multi-vote mode).
 */
export const processGuestRound = (game, imposterIds, votes) => {
  if (imposterIds.length >= game.numberOfPlayers - 1) {
    throw new Error(
      `You must leave at least 2 players as innocents. Max imposters allowed: ${game.numberOfPlayers - 2}`
    );
  }

  const isMultiVote = game.votingMode === 'multi' && imposterIds.length >= 2 && game.numberOfPlayers >= 5;
  const allowImposterVoting = !!game.allowImposterVoting && game.numberOfPlayers >= 5;
  // Imposter votes only affect their score in multi mode
  const imposterVotingCountsForScore = isMultiVote && allowImposterVoting;

  const imposterNames = imposterIds.map((id) => {
    const team = game.teams.find((t) => t.teamId === id);
    return team ? team.name : 'Unknown';
  });

  // Group votes per voter
  const votesByVoter = {};
  votes.forEach((v) => {
    if (!votesByVoter[v.voterId]) votesByVoter[v.voterId] = [];
    const votedTeam = game.teams.find((t) => t.teamId === v.votedForId);
    votesByVoter[v.voterId].push({
      votedForId: v.votedForId,
      votedForName: votedTeam ? votedTeam.name : 'Unknown',
      isCorrect: imposterIds.includes(v.votedForId)
    });
  });

  const allowedVoterIds = allowImposterVoting
    ? game.teams.map((t) => t.teamId)
    : game.teams.filter((t) => !imposterIds.includes(t.teamId)).map((t) => t.teamId);
  Object.keys(votesByVoter).forEach((voterId) => {
    if (!allowedVoterIds.includes(voterId)) delete votesByVoter[voterId];
  });

  // Aggregates from NON-IMPOSTER votes only
  let correctCount = 0;
  let missCount = 0;
  const identifiedByIds = new Set();
  const fooledByIds = new Set();

  Object.entries(votesByVoter).forEach(([voterId, voterVotes]) => {
    if (imposterIds.includes(voterId)) return;
    voterVotes.forEach((vv) => {
      if (vv.isCorrect) {
        correctCount += 1;
        identifiedByIds.add(voterId);
      } else {
        missCount += 1;
        fooledByIds.add(voterId);
      }
    });
  });

  const identifiedByNames = Array.from(identifiedByIds).map((id) => {
    const t = game.teams.find((tm) => tm.teamId === id);
    return t ? t.name : 'Unknown';
  });
  const fooledByNames = Array.from(fooledByIds).map((id) => {
    const t = game.teams.find((tm) => tm.teamId === id);
    return t ? t.name : 'Unknown';
  });

  const updatedTeams = game.teams.map((team) => ({ ...team }));

  const roundScores = updatedTeams.map((team) => {
    const isImposter = imposterIds.includes(team.teamId);
    let roundScore = 0;
    const teamVotes = votesByVoter[team.teamId] || [];

    if (isImposter) {
      // Base: fool bonus from non-imposter votes
      roundScore = missCount - correctCount;

      // Multi-vote + imposter-voting: imposters get ±1 per own vote too
      if (imposterVotingCountsForScore) {
        teamVotes.forEach((vv) => {
          roundScore += vv.isCorrect ? 1 : -1;
        });
      }
    } else {
      teamVotes.forEach((vv) => {
        roundScore += vv.isCorrect ? 1 : -1;
      });
    }

    let newCumulativeScore = team.totalScore + roundScore;

    if (game.floorLimitEnabled && newCumulativeScore < game.floorLimitValue) {
      newCumulativeScore = game.floorLimitValue;
      roundScore = game.floorLimitValue - team.totalScore;
    }

    team.totalScore = newCumulativeScore;

    const correctInThisTeam = teamVotes.filter((vv) => vv.isCorrect).length;

    return {
      teamId: team.teamId,
      teamName: team.name,
      roundScore,
      cumulativeScore: newCumulativeScore,
      wasImposter: isImposter,
      wasIdentified: isImposter && correctCount > 0,
      identifiedImposter: !isImposter && correctInThisTeam > 0,
      votedFor: teamVotes.length > 0 ? teamVotes.map((vv) => vv.votedForName).join(', ') : '',
      votes: teamVotes.map((vv) => ({
        votedForId: vv.votedForId,
        votedForName: vv.votedForName,
        isCorrect: vv.isCorrect
      }))
    };
  });

  const flatVotes = [];
  Object.entries(votesByVoter).forEach(([voterId, voterVotes]) => {
    const voterTeam = game.teams.find((t) => t.teamId === voterId);
    const voterName = voterTeam ? voterTeam.name : 'Unknown';
    voterVotes.forEach((vv) => {
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
    floorLimitValue: guestGame.floorLimitValue || 0,
    votingMode: guestGame.votingMode || 'single',
    allowImposterVoting: !!guestGame.allowImposterVoting
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