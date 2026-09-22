import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { favoritesAPI } from '../../services/api';

const FavoritesManager = () => {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [playModalFav, setPlayModalFav] = useState(null);

  const loadFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory !== 'all') params.category = selectedCategory;

      const [favRes, catRes] = await Promise.all([
        favoritesAPI.getAll(params),
        favoritesAPI.getCategories()
      ]);

      setFavorites(favRes.data.favorites);
      setGrouped(favRes.data.grouped);
      setCategories(catRes.data.categories);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleRemove = async (favoriteId) => {
    if (!window.confirm('Remove from favorites?')) return;

    try {
      await favoritesAPI.remove(favoriteId);
      setMessage({ type: 'success', text: 'Removed from favorites.' });
      loadFavorites();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to remove.' });
    }
  };

  const handleResumePlay = (gameId) => {
    setPlayModalFav(null);
    navigate(`/game/${gameId}`, { state: { resumeMode: true } });
  };

  const handleNewGameSameTeams = (fav) => {
    setPlayModalFav(null);
    const teamsData = fav.gameId?.teams || [];

    const playerNames = teamsData
      .map(t => t.name || t.teamName || '')
      .filter(name => name.trim() !== '');

    if (playerNames.length < 3) {
      setMessage({ type: 'error', text: 'This game does not have enough player data to rematch.' });
      return;
    }

    const prefillGameName = fav.gameId?.gameName
      ? `${fav.gameId.gameName} (Rematch)`
      : `Rematch ${new Date().toLocaleDateString()}`;

    // FIXED: navigate to /play (TeamSetup route), NOT /teams
    navigate('/play', {
      state: {
        prefillPlayerNames: playerNames,
        prefillGameName,
        prefillCategory: fav.gameId?.category || 'malayalam'
      }
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading favorites...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>⭐ Favorites</h1>
        <p>Your saved game sessions organized by category</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'error' ? '⚠️' : '✅'} {message.text}
        </div>
      )}

      <div className="history-filters">
        <button
          className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          All ({favorites.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat.name}
            className={`filter-btn ${selectedCategory === cat.name ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.name)}
          >
            {cat.name} ({cat.count})
          </button>
        ))}
      </div>

      {favorites.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⭐</div>
          <h3>No favorites yet</h3>
          <p>Save your best games from the history page!</p>
          <Link to="/history" className="btn btn-primary mt-2">Browse History</Link>
        </div>
      ) : (
        <div className="favorites-container">
          {Object.entries(grouped).map(([categoryName, items]) => (
            <div className="category-section" key={categoryName}>
              <div className="category-header">
                <span className="category-name">
                  📁 {categoryName}
                  <span className="category-count">{items.length}</span>
                </span>
              </div>

              {items.map(fav => (
                <div
                  className="favorite-item"
                  key={fav._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div className="favorite-info">
                    <Link
                      to={`/history/game/${fav.gameId?._id || fav.gameId}`}
                      style={{
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        fontSize: '1.1rem'
                      }}
                    >
                      {fav.gameId?.gameName || 'Game'}
                    </Link>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      {fav.gameId?.numberOfPlayers} players · {fav.gameId?.currentRound} rounds ·
                      {' '}{new Date(fav.savedAt).toLocaleDateString()}
                    </div>
                    {fav.notes && (
                      <div className="favorite-notes" style={{ marginTop: '0.5rem', fontStyle: 'italic', fontSize: '0.9rem' }}>
                        "{fav.notes}"
                      </div>
                    )}
                  </div>

                  <div className="favorite-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setPlayModalFav(fav)}
                      title="Play Options"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.4rem 0.8rem',
                        fontWeight: 'bold'
                      }}
                    >
                      🎮 Play
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemove(fav._id)}
                      title="Remove from favorites"
                      style={{ padding: '0.4rem 0.8rem', fontWeight: 'bold' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {playModalFav && (
        <div
          className="modal-overlay"
          onClick={() => setPlayModalFav(null)}
          style={{
            zIndex: 1000,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-surface)',
              padding: '2rem',
              borderRadius: '12px',
              maxWidth: '420px',
              width: '90%',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
            }}
          >
            <h3 style={{ marginTop: 0, color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              🎮 Play Options
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Selected Game:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {playModalFav.gameId?.gameName || 'Unnamed Game'}
              </strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <button
                className="btn btn-success"
                onClick={() => handleResumePlay(playModalFav.gameId?._id)}
                style={{
                  padding: '0.85rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                ▶️ Resume / Continue Playing
              </button>

              <button
                className="btn btn-primary"
                onClick={() => handleNewGameSameTeams(playModalFav)}
                style={{
                  padding: '0.85rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                🔄 Start New Game (Same Players)
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => setPlayModalFav(null)}
                style={{ padding: '0.85rem', fontSize: '1rem', marginTop: '0.5rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FavoritesManager;