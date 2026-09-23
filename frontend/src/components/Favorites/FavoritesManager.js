import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { favoritesAPI } from '../../services/api';

const FavoritesSkeleton = () => (
  <div aria-busy="true" aria-label="Loading favorites">
    <div className="page-header">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-text skeleton-text-md" />
    </div>

    <div className="history-filters skeleton-filters">
      {[0, 1, 2, 3].map((i) => (
        <div className="skeleton skeleton-pill" key={i} />
      ))}
    </div>

    <div className="favorites-container">
      {[0, 1].map((section) => (
        <div className="category-section skeleton-category" key={section}>
          <div className="category-header">
            <div className="skeleton skeleton-heading" />
          </div>
          {[0, 1, 2].map((i) => (
            <div className="favorite-item skeleton-favorite-item" key={i}>
              <div className="favorite-info" style={{ flex: 1 }}>
                <div className="skeleton skeleton-text skeleton-text-lg" />
                <div className="skeleton skeleton-text skeleton-text-md" />
                <div className="skeleton skeleton-text skeleton-text-sm" />
              </div>
              <div className="favorite-actions skeleton-fav-actions">
                <div className="skeleton skeleton-btn" />
                <div className="skeleton skeleton-btn-icon" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

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
      .map((t) => t.name || t.teamName || '')
      .filter((name) => name.trim() !== '');

    if (playerNames.length < 3) {
      setMessage({
        type: 'error',
        text: 'This game does not have enough player data to rematch.'
      });
      return;
    }

    const prefillGameName = fav.gameId?.gameName
      ? `${fav.gameId.gameName} (Rematch)`
      : `Rematch ${new Date().toLocaleDateString()}`;

    navigate('/play', {
      state: {
        prefillPlayerNames: playerNames,
        prefillGameName,
        prefillCategory: fav.gameId?.category || 'malayalam'
      }
    });
  };

  if (loading) {
    return <FavoritesSkeleton />;
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
          type="button"
          className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          All ({favorites.length})
        </button>
        {categories.map((cat) => (
          <button
            type="button"
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
          <Link to="/history" className="btn btn-primary mt-2">
            Browse History
          </Link>
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

              {items.map((fav) => (
                <div className="favorite-item" key={fav._id}>
                  <div className="favorite-info">
                    <Link
                      to={`/history/game/${fav.gameId?._id || fav.gameId}`}
                      className="favorite-title-link"
                    >
                      {fav.gameId?.gameName || 'Game'}
                    </Link>
                    <div className="favorite-meta">
                      {fav.gameId?.numberOfPlayers} players · {fav.gameId?.currentRound} rounds
                      · {new Date(fav.savedAt).toLocaleDateString()}
                    </div>
                    {fav.notes && (
                      <div className="favorite-notes">&quot;{fav.notes}&quot;</div>
                    )}
                  </div>

                  <div className="favorite-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setPlayModalFav(fav)}
                      title="Play Options"
                    >
                      🎮 Play
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemove(fav._id)}
                      title="Remove from favorites"
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
        <div className="modal-overlay" onClick={() => setPlayModalFav(null)}>
          <div
            className="modal-content exit-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px' }}
          >
            <div className="exit-modal-icon">🎮</div>
            <h2>Play Options</h2>
            <p className="exit-modal-desc">
              Selected Game:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {playModalFav.gameId?.gameName || 'Unnamed Game'}
              </strong>
            </p>

            <div className="exit-modal-actions">
              <button
                type="button"
                className="btn btn-success btn-block"
                onClick={() => handleResumePlay(playModalFav.gameId?._id)}
              >
                ▶️ Resume / Continue Playing
              </button>

              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => handleNewGameSameTeams(playModalFav)}
              >
                🔄 Start New Game (Same Players)
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => setPlayModalFav(null)}
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