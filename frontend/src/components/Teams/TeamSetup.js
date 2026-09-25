import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Star, UserPlus, Dices, AlertCircle } from 'lucide-react';
import { teamsAPI, gamesAPI, favoritesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import TeamCard from './TeamCard';
import {
  getGuestCategories,
  generateGuestTeams,
  generateSingleGuestName,
  createGuestGame,
  saveGuestGame
} from '../../utils/guestGame';

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 20;
const CACHE_KEY = 'imposter_setup_cache';

const calcMaxImposters = (n) => {
  if (n <= 4) return 1;
  if (n === 5) return 2;
  return Math.floor(n / 2);
};

const TeamSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isGuest } = useAuth();

  const [numberOfTeams, setNumberOfTeams] = useState(MIN_PLAYERS);
  const [category, setCategory] = useState('malayalam');
  const [categories, setCategories] = useState([]);
  const [teams, setTeams] = useState([]);
  const [gameName, setGameName] = useState('');

  const [floorLimitEnabled, setFloorLimitEnabled] = useState(true);
  const [floorLimitValue, setFloorLimitValue] = useState(0);
  const [votingMode, setVotingMode] = useState('single');
  const [allowImposterVoting, setAllowImposterVoting] = useState(false);
  const [requiredVotesPerPlayer, setRequiredVotesPerPlayer] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState(null);

  const [showFavoriteGames, setShowFavoriteGames] = useState(false);
  const [favoriteGames, setFavoriteGames] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  const maxPossibleImposters = calcMaxImposters(numberOfTeams);

  useEffect(() => {
    let isMounted = true;
    const fetchMeta = async () => {
      if (isGuest || !isAuthenticated) {
        if (isMounted) setCategories(getGuestCategories());
        return;
      }
      try {
        const catRes = await teamsAPI.getCategories();
        if (isMounted) setCategories(catRes.data.categories || []);
        const sugRes = await teamsAPI.getSuggestions();
        if (isMounted) setSuggestions(sugRes.data.suggestions || []);
      } catch (err) {
        if (isMounted) setCategories(getGuestCategories());
      }
    };
    fetchMeta();
    return () => { isMounted = false; };
  }, [isAuthenticated, isGuest]);

  useEffect(() => {
    const pNames = location.state?.prefillPlayerNames || location.state?.teamNames;
    const pCat = location.state?.prefillCategory || location.state?.category;
    const pGame = location.state?.prefillGameName || location.state?.gameName;

    if (Array.isArray(pNames) && pNames.length > 0) {
      const built = pNames.map((name, idx) => ({
        teamId: `team_${Date.now()}_${idx}`,
        name,
        category: pCat || 'malayalam',
        totalScore: 0
      }));
      setTeams(built);
      setNumberOfTeams(built.length);
      if (pCat) setCategory(pCat);
      if (pGame) setGameName(pGame);
      localStorage.removeItem(CACHE_KEY);
      return;
    }

    try {
      const cache = localStorage.getItem(CACHE_KEY);
      if (cache) {
        const parsed = JSON.parse(cache);
        if (parsed.teams && parsed.teams.length >= MIN_PLAYERS) {
          setTeams(parsed.teams);
          setNumberOfTeams(parsed.numberOfTeams || parsed.teams.length);
          if (parsed.category) setCategory(parsed.category);
          if (parsed.gameName) setGameName(parsed.gameName);
          if (parsed.floorLimitEnabled !== undefined) setFloorLimitEnabled(parsed.floorLimitEnabled);
          if (parsed.floorLimitValue !== undefined) setFloorLimitValue(parsed.floorLimitValue);
          if (parsed.votingMode) setVotingMode(parsed.votingMode);
          if (parsed.allowImposterVoting !== undefined) setAllowImposterVoting(parsed.allowImposterVoting);
          if (parsed.requiredVotesPerPlayer !== undefined) setRequiredVotesPerPlayer(parsed.requiredVotesPerPlayer);
        }
      }
    } catch (e) {}
  }, [location.state]);

  useEffect(() => {
    if (teams.length > 0) {
      const stateToCache = {
        teams, numberOfTeams, category, gameName, floorLimitEnabled,
        floorLimitValue, votingMode, allowImposterVoting, requiredVotesPerPlayer
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(stateToCache));
    }
  }, [teams, numberOfTeams, category, gameName, floorLimitEnabled, floorLimitValue, votingMode, allowImposterVoting, requiredVotesPerPlayer]);

  useEffect(() => {
    if (numberOfTeams < 5) {
      if (votingMode === 'multi') setVotingMode('single');
      if (allowImposterVoting) setAllowImposterVoting(false);
      if (requiredVotesPerPlayer !== 1) setRequiredVotesPerPlayer(1);
    } else {
      if (requiredVotesPerPlayer > maxPossibleImposters) {
        setRequiredVotesPerPlayer(maxPossibleImposters);
      }
    }
  }, [numberOfTeams, votingMode, allowImposterVoting, requiredVotesPerPlayer, maxPossibleImposters]);

  const loadFavoriteGames = async () => {
    try {
      setLoadingFavorites(true);
      const response = await favoritesAPI.getAll({});
      setFavoriteGames(response.data.favorites || []);
    } catch (err) {
      setError('Could not load favorite games.');
    } finally {
      setLoadingFavorites(false);
    }
  };

  const handlePickFavoriteGame = (fav) => {
    const teamsData = fav.gameId?.teams || [];
    const playerNames = teamsData.map((t) => t.name || t.teamName || '').filter((name) => name.trim() !== '');

    if (playerNames.length < MIN_PLAYERS) {
      setError('This favorite game does not have enough player data.');
      setShowFavoriteGames(false);
      return;
    }

    const built = playerNames.map((name, idx) => ({
      teamId: `team_${Date.now()}_${idx}`,
      name,
      category: fav.gameId?.category || 'malayalam',
      totalScore: 0
    }));
    setTeams(built);
    setNumberOfTeams(playerNames.length);
    if (!gameName.trim()) {
      setGameName(`${fav.gameId?.gameName || 'Game'} (Rematch)`);
    }
    setShowFavoriteGames(false);
    setError('');
  };

  const generateTeams = async () => {
    try {
      setLoading(true);
      setError('');
      if (isGuest || !isAuthenticated) {
        setTeams(generateGuestTeams(numberOfTeams, category));
      } else {
        const response = await teamsAPI.generate({ numberOfTeams, category });
        setTeams(response.data.teams);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate teams.');
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (teamId, newName) => {
    setTeams((prev) => prev.map((t) => (t.teamId === teamId ? { ...t, name: newName } : t)));
  };

  const handlePickSuggestion = (name) => {
    if (activeTeamId) {
      handleNameChange(activeTeamId, name);
      setShowSuggestions(false);
      setActiveTeamId(null);
    }
  };

  const decreaseCount = () => {
    if (numberOfTeams <= MIN_PLAYERS) return;
    const next = numberOfTeams - 1;
    setNumberOfTeams(next);
    if (teams.length > next) setTeams((prev) => prev.slice(0, next));
  };

  const increaseCount = () => {
    if (numberOfTeams >= MAX_PLAYERS) return;
    const next = numberOfTeams + 1;
    setNumberOfTeams(next);
    if (teams.length > 0) {
      const usedNames = teams.map((t) => t.name);
      setTeams((prev) => [
        ...prev,
        { teamId: `team_${Date.now()}_${prev.length}`, name: generateSingleGuestName(category, usedNames), totalScore: 0 }
      ]);
    }
  };

  const handleAddPlayer = () => {
    if (teams.length >= MAX_PLAYERS) {
      setError(`Maximum ${MAX_PLAYERS} players allowed.`);
      return;
    }
    const usedNames = teams.map((t) => t.name);
    setTeams((prev) => [
      ...prev,
      { teamId: `team_${Date.now()}_${teams.length}`, name: generateSingleGuestName(category, usedNames), totalScore: 0 }
    ]);
    setNumberOfTeams((prev) => prev + 1);
    setError('');
  };

  const handleRemoveTeam = (teamId) => {
    if (teams.length <= MIN_PLAYERS) {
      setError(`Minimum ${MIN_PLAYERS} players required.`);
      return;
    }
    setTeams((prev) => prev.filter((t) => t.teamId !== teamId));
    setNumberOfTeams((prev) => Math.max(MIN_PLAYERS, prev - 1));
    setError('');
  };

  const handleRegenerateTeam = (teamId) => {
    const usedNames = teams.filter((t) => t.teamId !== teamId).map((t) => t.name);
    setTeams((prev) => prev.map((t) => (t.teamId === teamId ? { ...t, name: generateSingleGuestName(category, usedNames) } : t)));
  };

  const handleStartGame = async () => {
    if (teams.length < MIN_PLAYERS) return setError(`Need at least ${MIN_PLAYERS} teams.`);
    if (teams.some((t) => !t.name.trim())) return setError('All teams must have names.');

    const nameSet = new Set();
    for (const t of teams) {
      const key = t.name.trim().toLowerCase();
      if (nameSet.has(key)) return setError(`Duplicate name detected: "${t.name}".`);
      nameSet.add(key);
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        teams: teams.map((t) => ({ teamId: t.teamId, name: t.name.trim() })),
        gameName: gameName || `Game ${new Date().toLocaleDateString()}`,
        floorLimitEnabled,
        floorLimitValue,
        votingMode,
        allowImposterVoting,
        requiredVotesPerPlayer
      };

      if (isGuest || !isAuthenticated) {
        saveGuestGame(createGuestGame(payload));
        localStorage.removeItem(CACHE_KEY);
        navigate('/game/guest');
      } else {
        const response = await gamesAPI.create(payload);
        localStorage.removeItem(CACHE_KEY);
        // FIX: Extract the valid ID unconditionally
        const newGameId = response.data.game._id || response.data.game.id;
        navigate(`/game/${newGameId}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create game.');
      setLoading(false);
    }
  };

  const usedNames = new Set(teams.map((t) => t.name.trim().toLowerCase()));
  const filteredSuggestions = suggestions.filter((s) => !usedNames.has(s.name.toLowerCase()));
  const canUseAdvancedVoting = numberOfTeams >= 5;

  return (
    <div className="team-setup-page">
      <div className="page-header">
        <h1>🎯 Set Up New Game</h1>
        <p>
          {isGuest
            ? 'Guest mode — scores stay on this device until you save to cloud'
            : 'Configure your teams and game settings before starting'}
        </p>
      </div>

      {isGuest && (
        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
          👤 Playing as <strong>Guest</strong>. At the end you can save this game to your account.
        </div>
      )}

      {error && <div className="alert alert-error"><AlertCircle size={18} style={{marginRight: 8}}/> {error}</div>}

      <div className="card mb-3">
        <div className="card-header">
          <h2>Game Configuration</h2>
        </div>

        <div className="form-group">
          <label>Game Name (Optional)</label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g., Friday Night Game"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="setup-grid-2">
          <div className="form-group">
            <label>Number of Players</label>
            <div className="player-stepper" role="group" aria-label="Player count">
              <button type="button" className="stepper-btn" onClick={decreaseCount} disabled={numberOfTeams <= MIN_PLAYERS}>−</button>
              <span className="stepper-value">{numberOfTeams}</span>
              <button type="button" className="stepper-btn" onClick={increaseCount} disabled={numberOfTeams >= MAX_PLAYERS}>+</button>
            </div>
            <p className="stepper-hint">Min {MIN_PLAYERS} · Max {MAX_PLAYERS} · Max imposters: {maxPossibleImposters}</p>
          </div>

          <div className="form-group">
            <label>Name Theme</label>
            <select className="form-control" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={generateTeams} disabled={loading} type="button">
            <Dices size={18} /> {teams.length > 0 ? 'Regenerate All' : 'Generate Teams'}
          </button>
          {isAuthenticated && (
            <button className="btn btn-secondary" onClick={() => { loadFavoriteGames(); setShowFavoriteGames(true); }} type="button">
              <Star size={18} /> Pick from Favorite
            </button>
          )}
        </div>
      </div>

      {teams.length > 0 && (
        <>
          <div className="card mb-3">
            <div className="card-header">
              <h2>Players ({teams.length})</h2>
            </div>

            <div className="team-setup-grid">
              <AnimatePresence>
                {teams.map((team, index) => (
                  <motion.div
                    key={team.teamId}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, width: 0, padding: 0, margin: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TeamCard
                      team={team}
                      index={index}
                      onNameChange={handleNameChange}
                      onRemove={handleRemoveTeam}
                      onRegenerate={handleRegenerateTeam}
                      canRemove={teams.length > MIN_PLAYERS}
                      canRegenerate={true}
                      hasSuggestions={isAuthenticated && suggestions.length > 0}
                      suggestions={filteredSuggestions}
                      onOpenSuggestions={(id) => { setActiveTeamId(id); setShowSuggestions(true); }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-block add-player-btn"
              onClick={handleAddPlayer}
              disabled={teams.length >= MAX_PLAYERS}
              style={{ marginTop: '1rem' }}
            >
              <UserPlus size={18} />
              {teams.length < MAX_PLAYERS ? 'Add Another Player' : `Max ${MAX_PLAYERS} players reached`}
            </button>
          </div>

          <div className="card mb-3">
            <div className="card-header">
              <h3><Settings size={20}/> Score & Vote Settings</h3>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>
                Voting Mode
                {!canUseAdvancedVoting && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>· unlocks at 5+ players</span>}
              </label>
              <div className="count-selector">
                <button type="button" className={`count-btn ${votingMode === 'single' ? 'active' : ''}`} onClick={() => setVotingMode('single')}>
                  Single Vote
                </button>
                <button
                  type="button"
                  className={`count-btn ${votingMode === 'multi' ? 'active' : ''} ${!canUseAdvancedVoting ? 'disabled' : ''}`}
                  onClick={() => canUseAdvancedVoting && setVotingMode('multi')}
                  disabled={!canUseAdvancedVoting}
                >
                  Multi Vote
                </button>
              </div>
            </div>

            {votingMode === 'multi' && canUseAdvancedVoting && (
              <div className="form-group" style={{ borderLeft: '3px solid var(--accent-primary, #6366f1)', paddingLeft: '12px', marginTop: '1rem' }}>
                <label>Compulsory Votes Per Player</label>
                <select
                  className="form-control"
                  value={requiredVotesPerPlayer}
                  onChange={(e) => setRequiredVotesPerPlayer(Number(e.target.value))}
                  style={{ maxWidth: 240 }}
                >
                  {Array.from({ length: maxPossibleImposters }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'Vote Required' : 'Votes Required'}
                    </option>
                  ))}
                </select>
                <p className="role-hint" style={{ marginTop: '0.35rem' }}>
                  Each voter MUST cast at least {requiredVotesPerPlayer} vote{requiredVotesPerPlayer > 1 ? 's' : ''} to submit the round.
                </p>
              </div>
            )}

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: canUseAdvancedVoting ? 'pointer' : 'not-allowed', opacity: canUseAdvancedVoting ? 1 : 0.5 }}>
                <input
                  type="checkbox"
                  checked={allowImposterVoting && canUseAdvancedVoting}
                  onChange={(e) => canUseAdvancedVoting && setAllowImposterVoting(e.target.checked)}
                  disabled={!canUseAdvancedVoting}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ textTransform: 'none', fontSize: '0.95rem' }}>🎭 Allow imposters to vote</span>
              </label>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={floorLimitEnabled}
                  onChange={(e) => setFloorLimitEnabled(e.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ textTransform: 'none', fontSize: '0.95rem' }}>🛡️ Enable Score Floor Limit</span>
              </label>
            </div>
            {floorLimitEnabled && (
              <div className="form-group">
                <label>Minimum Score Allowed</label>
                <input
                  type="number"
                  className="form-control"
                  value={floorLimitValue}
                  onChange={(e) => setFloorLimitValue(parseInt(e.target.value, 10) || 0)}
                  style={{ maxWidth: '150px' }}
                />
              </div>
            )}
          </div>

          {/* FIX: Start game button is now standard block layout instead of hidden desktop class */}
          <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
            <button className="btn btn-success btn-lg" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }} onClick={handleStartGame} disabled={loading} type="button">
              {loading ? 'Creating game...' : '🚀 Start Game'}
            </button>
          </div>
        </>
      )}

      {/* Manual Full Suggestions Modal */}
      {showSuggestions && (
        <div className="modal-overlay" onClick={() => setShowSuggestions(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex-between mb-2">
              <h2>👥 Pick a Player Name</h2>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowSuggestions(false)} type="button">✕</button>
            </div>
            <div className="suggestions-list">
              {filteredSuggestions.length === 0 ? (
                <div className="empty-state"><p>No saved player names yet.</p></div>
              ) : (
                filteredSuggestions.map((s) => (
                  <button key={s.name} type="button" className="suggestion-item" onClick={() => handlePickSuggestion(s.name)}>
                    <span>{s.isFavorite && <span style={{ marginRight: 6 }}>⭐</span>}{s.name}</span>
                    <span className="suggestion-count">{s.count > 0 && `played ${s.count}×`}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Favorite Game Picker Modal */}
      {showFavoriteGames && (
        <div className="modal-overlay" onClick={() => setShowFavoriteGames(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="flex-between mb-2">
              <h2>⭐ Pick from Favorite Game</h2>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowFavoriteGames(false)} type="button">✕</button>
            </div>
            {loadingFavorites ? (
              <div className="loading-container" style={{ padding: '2rem' }}><div className="spinner"></div></div>
            ) : favoriteGames.length === 0 ? (
              <div className="empty-state"><p>No favorite games yet.</p></div>
            ) : (
              <div className="favorite-games-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
                {favoriteGames.map((fav) => {
                  const pNames = (fav.gameId?.teams || []).map((t) => t.name || '').filter(Boolean);
                  const hasEnough = pNames.length >= MIN_PLAYERS;
                  return (
                    <button
                      key={fav._id}
                      type="button"
                      className="suggestion-item"
                      onClick={() => hasEnough && handlePickFavoriteGame(fav)}
                      disabled={!hasEnough}
                      style={{ opacity: hasEnough ? 1 : 0.5, textAlign: 'left', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                    >
                      <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.35rem' }}>{fav.gameId?.gameName || 'Unnamed Game'}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        📁 {fav.category || 'Uncategorized'} · {pNames.length} players
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamSetup;