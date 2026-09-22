import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gamesAPI, favoritesAPI } from '../../services/api';
import Scoreboard from '../Game/Scoreboard';

const GameDetail = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFavoriteModal, setShowFavoriteModal] = useState(false);
  const [favoriteCategory, setFavoriteCategory] = useState('General');
  const [favoriteNotes, setFavoriteNotes] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadGame = useCallback(async () => {
    try {
      const response = await gamesAPI.getById(gameId);
      setGame(response.data.game);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to load game details.' });
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  const handleAddFavorite = async () => {
    try {
      await favoritesAPI.add({
        gameId,
        category: favoriteCategory,
        notes: favoriteNotes
      });
      setMessage({ type: 'success', text: 'Added to favorites!' });
      setShowFavoriteModal(false);
      setFavoriteCategory('General');
      setFavoriteNotes('');
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Failed to add to favorites.'
      });
    }
  };

  const handleDeleteGame = async () => {
    if (window.confirm('Are you sure you want to delete this game? This cannot be undone.')) {
      try {
        await gamesAPI.delete(gameId);
        navigate('/history');
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to delete game.' });
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading game details...</p>
      </div>
    );
  }

  if (!game) {
    return <div className="alert alert-error">Game not found.</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1>📋 {game.gameName}</h1>
            <p>
              {new Date(game.createdAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
              {' · '}
              {game.numberOfPlayers} players · {game.currentRound} rounds
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-warning btn-sm"
              onClick={() => setShowFavoriteModal(true)}
            >
              ⭐ Favorite
            </button>
            <button 
              className="btn btn-danger btn-sm"
              onClick={handleDeleteGame}
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'error' ? '⚠️' : '✅'} {message.text}
        </div>
      )}

      {/* Final Scoreboard */}
      <Scoreboard teams={game.teams} rounds={game.rounds} />

      {/* Detailed Round History */}
      {game.rounds && game.rounds.length > 0 && (
        <div className="card mt-3">
          <div className="card-header">
            <h3>📋 Detailed Round History</h3>
          </div>
          
          {game.rounds.map(round => (
            <div 
              key={round.roundNumber}
              style={{
                padding: '1rem',
                marginBottom: '0.75rem',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)'
              }}
            >
              <div className="flex-between mb-1">
                <span style={{ fontWeight: 700 }}>Round {round.roundNumber}</span>
                <span className={`round-result ${round.imposterIdentified ? 'result-caught' : 'result-escaped'}`}>
                  {round.imposterIdentified ? '🔍 Imposter Caught' : '🎭 Imposter Escaped'}
                </span>
              </div>
              
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <strong>Imposter:</strong> {round.imposterNames.join(', ')}
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                <strong>Votes:</strong>{' '}
                {round.votes.map((v, i) => (
                  <span key={i}>
                    {v.voterName} → {v.votedForName}
                    {i < round.votes.length - 1 ? ' · ' : ''}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {round.scores.map(score => (
                  <span 
                    key={score.teamId}
                    className={`team-chip ${score.roundScore > 0 ? '' : ''}`}
                    style={{
                      color: score.roundScore > 0 ? 'var(--accent-success)' : 
                             score.roundScore < 0 ? 'var(--accent-danger)' : 'var(--text-muted)'
                    }}
                  >
                    {score.teamName}: {score.roundScore > 0 ? '+' : ''}{score.roundScore}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <button 
        className="btn btn-secondary mt-3"
        onClick={() => navigate('/history')}
      >
        ← Back to History
      </button>

      {/* Favorite Modal */}
      {showFavoriteModal && (
        <div className="modal-overlay" onClick={() => setShowFavoriteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>⭐ Save to Favorites</h2>
            
            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                className="form-control"
                value={favoriteCategory}
                onChange={e => setFavoriteCategory(e.target.value)}
                placeholder="e.g., Best Games, Tournament, Fun Nights"
              />
            </div>

            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea
                className="form-control"
                value={favoriteNotes}
                onChange={e => setFavoriteNotes(e.target.value)}
                placeholder="Add notes about this game..."
                rows={3}
                maxLength={500}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowFavoriteModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleAddFavorite}
              >
                ⭐ Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameDetail;