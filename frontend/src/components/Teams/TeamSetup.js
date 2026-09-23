import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { teamsAPI, gamesAPI, favoritesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import TeamCard from './TeamCard';
import {
  getGuestCategories,
  generateGuestTeams,
  createGuestGame,
  saveGuestGame
} from '../../utils/guestGame';

const TeamSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isGuest } = useAuth();

  // Combine standard (Favorites) and fallback (History) state passing logic
  const pNames = location.state?.prefillPlayerNames || location.state?.teamNames || [];
  const pCat = location.state?.prefillCategory || location.state?.category || 'malayalam';
  const pGame = location.state?.prefillGameName || location.state?.gameName || '';

  const [numberOfTeams, setNumberOfTeams] = useState(pNames.length || 3);
  const [category, setCategory] = useState(pCat);
  const [categories, setCategories] = useState([]);
  const [teams, setTeams] = useState([]);
  const [gameName, setGameName] = useState(pGame);
  
  const [floorLimitEnabled, setFloorLimitEnabled] = useState(true);
  const [floorLimitValue, setFloorLimitValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTeamId, setActiveTeamId] = useState(null);

  const [showFavoriteGames, setShowFavoriteGames] = useState(false);
  const [favoriteGames, setFavoriteGames] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  const prefillTeamsFromNames = useCallback((playerNames, catId = 'custom') => {
    const built = playerNames.map((name, idx) => ({
      teamId: `team_${Date.now()}_${idx}`,
      name,
      category: catId,
      totalScore: 0
    }));
    setTeams(built);
  }, []);

  // Run on mount to fetch categories and suggestions
  useEffect(() => {
    const loadCategories = async () => {
      if (isGuest || !isAuthenticated) {
        setCategories(getGuestCategories());
        return;
      }
      try {
        const response = await teamsAPI.getCategories();
        setCategories(response.data.categories);
      } catch (err) {
        setCategories(getGuestCategories());
      }
    };

    const loadSuggestions = async () => {
      try {
        const response = await teamsAPI.getSuggestions();
        setSuggestions(response.data.suggestions || []);
      } catch (err) {
        console.error('Failed to load suggestions:', err);
      }
    };

    loadCategories();
    if (isAuthenticated) {
      loadSuggestions();
    }
  }, [isAuthenticated, isGuest]); 

  // Run once if location state holds prefill data (History or Favorites rematch)
  useEffect(() => {
    if (pNames.length > 0) {
      prefillTeamsFromNames(pNames, pCat);
      setNumberOfTeams(pNames.length);
      if (pGame) setGameName(pGame);
    }
  }, [pNames, pCat, pGame, prefillTeamsFromNames]);

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

  const openFavoriteGamesPicker = () => {
    loadFavoriteGames();
    setShowFavoriteGames(true);
  };

  const handlePickFavoriteGame = (fav) => {
    const teamsData = fav.gameId?.teams || [];
    const playerNames = teamsData
      .map((t) => t.name || t.teamName || '')
      .filter((name) => name.trim() !== '');

    if (playerNames.length < 3) {
      setError('This favorite game does not have enough player data.');
      setShowFavoriteGames(false);
      return;
    }

    prefillTeamsFromNames(playerNames, fav.gameId?.category || 'malayalam');
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
        const localTeams = generateGuestTeams(numberOfTeams, category);
        setTeams(localTeams);
        return;
      }

      const response = await teamsAPI.generate({ numberOfTeams, category });
      setTeams(response.data.teams);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate teams.');
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (teamId, newName) => {
    setTeams((prev) =>
      prev.map((t) => (t.teamId === teamId ? { ...t, name: newName } : t))
    );
  };

  const handlePickSuggestion = (name) => {
    if (activeTeamId) {
      handleNameChange(activeTeamId, name);
      setShowSuggestions(false);
      setActiveTeamId(null);
    }
  };

  const openSuggestions = (teamId) => {
    setActiveTeamId(teamId);
    setShowSuggestions(true);
  };

  const handleStartGame = async () => {
    if (teams.length < 3) {
      setError('You need at least 3 teams to start a game.');
      return;
    }

    const emptyTeam = teams.find((t) => !t.name.trim());
    if (emptyTeam) {
      setError('All teams must have names.');
      return;
    }

    const nameSet = new Set();
    for (const t of teams) {
      const key = t.name.trim().toLowerCase();
      if (nameSet.has(key)) {
        setError(`Duplicate team name detected: "${t.name}". Each team must have a unique name.`);
        return;
      }
      nameSet.add(key);
    }

    try {
      setLoading(true);
      setError('');

      if (isGuest || !isAuthenticated) {
        const guestGame = createGuestGame({
          teams: teams.map((t) => ({ teamId: t.teamId, name: t.name.trim() })),
          gameName: gameName || `Game ${new Date().toLocaleDateString()}`,
          floorLimitEnabled,
          floorLimitValue
        });
        saveGuestGame(guestGame);
        navigate('/game/guest');
        return;
      }

      const response = await gamesAPI.create({
        teams: teams.map((t) => ({
          teamId: t.teamId,
          name: t.name.trim()
        })),
        gameName: gameName || `Game ${new Date().toLocaleDateString()}`,
        floorLimitEnabled,
        floorLimitValue
      });

      navigate(`/game/${response.data.game._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create game.');
      setLoading(false);
    }
  };

  const usedNames = new Set(teams.map((t) => t.name.trim().toLowerCase()));
  const filteredSuggestions = suggestions.filter(
    (s) => !usedNames.has(s.name.toLowerCase())
  );

  return (
    <div>
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
          👤 Playing as <strong>Guest</strong>. At the end you can save this game
          to your account (login/signup) or discard it.
        </div>
      )}

      {error && <div className="alert alert-error">⚠️ {error}</div>}

      {pNames.length > 0 && teams.length > 0 && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          ✅ Auto-filled {teams.length} players from previous game. You can edit
          names, add more players, or start the game directly!
        </div>
      )}

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
            <label>Number of Players/Teams</label>
            <input
              type="number"
              className="form-control"
              min="3"
              max="20"
              value={numberOfTeams}
              onChange={(e) => setNumberOfTeams(parseInt(e.target.value, 10) || 3)}
            />
          </div>

          <div className="form-group">
            <label>Name Theme</label>
            <select
              className="form-control"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({(cat.sampleNames || []).join(', ')}...)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={generateTeams}
            disabled={loading}
            type="button"
          >
            {loading ? 'Generating...' : '🎲 Generate Teams'}
          </button>

          {isAuthenticated && (
            <button
              className="btn btn-secondary"
              onClick={openFavoriteGamesPicker}
              type="button"
            >
              ⭐ Pick from Favorite Game
            </button>
          )}
        </div>
      </div>

      {teams.length > 0 && (
        <>
          <div className="card mb-3">
            <div className="card-header">
              <h2>Teams ({teams.length})</h2>
              <button
                className="btn btn-secondary btn-sm"
                onClick={generateTeams}
                type="button"
              >
                🔄 Regenerate
              </button>
            </div>

            {isAuthenticated && suggestions.length > 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                💡 Type to see recent suggestions, or click 👥 to view all saved players.
              </p>
            )}

            <div className="team-setup-grid">
              {teams.map((team, index) => (
                <div key={team.teamId} className="team-card-wrapper">
                  <TeamCard
                    team={team}
                    index={index}
                    onNameChange={handleNameChange}
                    suggestions={isAuthenticated ? filteredSuggestions : []}
                  />
                  {isAuthenticated && suggestions.length > 0 && (
                    <button
                      type="button"
                      className="pick-suggestion-btn"
                      onClick={() => openSuggestions(team.teamId)}
                      title="Pick from saved players"
                    >
                      👥
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header">
              <h3>⚙️ Score Settings</h3>
            </div>

            <div className="form-group">
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={floorLimitEnabled}
                  onChange={(e) => setFloorLimitEnabled(e.target.checked)}
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: 'var(--accent-primary)'
                  }}
                />
                <span
                  style={{
                    textTransform: 'none',
                    fontSize: '0.95rem',
                    color: 'var(--text-primary)'
                  }}
                >
                  Enable Score Floor Limit (prevent scores from going below a
                  minimum)
                </span>
              </label>
            </div>

            {floorLimitEnabled && (
              <div className="form-group">
                <label>Minimum Score Value</label>
                <input
                  type="number"
                  className="form-control"
                  value={floorLimitValue}
                  onChange={(e) =>
                    setFloorLimitValue(parseInt(e.target.value, 10) || 0)
                  }
                  style={{ maxWidth: '200px' }}
                />
              </div>
            )}
          </div>

          <button
            className="btn btn-success btn-lg"
            onClick={handleStartGame}
            disabled={loading}
            style={{ marginTop: '1rem' }}
            type="button"
          >
            {loading ? 'Creating game...' : '🚀 Start Game'}
          </button>
        </>
      )}

      {/* Manual Full Suggestions Modal */}
      {showSuggestions && (
        <div className="modal-overlay" onClick={() => setShowSuggestions(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex-between mb-2">
              <h2>👥 Pick a Player Name</h2>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setShowSuggestions(false)}
                type="button"
              >
                ✕
              </button>
            </div>

            {filteredSuggestions.length === 0 ? (
              <div className="empty-state">
                <p>No saved player names yet. Play some games to build your list!</p>
              </div>
            ) : (
              <div className="suggestions-list">
                {filteredSuggestions.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    className="suggestion-item"
                    onClick={() => handlePickSuggestion(s.name)}
                  >
                    <span>
                      {s.isFavorite && <span style={{ marginRight: 6 }}>⭐</span>}
                      {s.name}
                    </span>
                    <span className="suggestion-count">
                      {s.count > 0 && `played ${s.count}×`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Favorite Game Picker Modal */}
      {showFavoriteGames && (
        <div className="modal-overlay" onClick={() => setShowFavoriteGames(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px' }}
          >
            <div className="flex-between mb-2">
              <h2>⭐ Pick from Favorite Game</h2>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setShowFavoriteGames(false)}
                type="button"
              >
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Select any favorite game to instantly load its players into the new game setup.
            </p>

            {loadingFavorites ? (
              <div className="loading-container" style={{ padding: '2rem' }}>
                <div className="spinner"></div>
                <p>Loading favorite games...</p>
              </div>
            ) : favoriteGames.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">⭐</div>
                <p>No favorite games yet.</p>
              </div>
            ) : (
              <div
                className="favorite-games-list"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}
              >
                {favoriteGames.map((fav) => {
                  const teamsData = fav.gameId?.teams || [];
                  const playerNames = teamsData
                    .map((t) => t.name || t.teamName || '')
                    .filter((n) => n.trim());
                  const hasEnough = playerNames.length >= 3;

                  return (
                    <button
                      key={fav._id}
                      type="button"
                      className="suggestion-item"
                      onClick={() => hasEnough && handlePickFavoriteGame(fav)}
                      disabled={!hasEnough}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '1rem',
                        textAlign: 'left',
                        opacity: hasEnough ? 1 : 0.5,
                        cursor: hasEnough ? 'pointer' : 'not-allowed'
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          marginBottom: '0.35rem',
                          color: 'var(--text-primary)'
                        }}
                      >
                        {fav.gameId?.gameName || 'Unnamed Game'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                        📁 {fav.category || 'Uncategorized'} · {playerNames.length} players · {fav.gameId?.currentRound || 0} rounds
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Players: {playerNames.slice(0, 5).join(', ')}
                        {playerNames.length > 5 ? `, +${playerNames.length - 5} more` : ''}
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