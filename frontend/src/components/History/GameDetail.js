import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
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
  const [shareCopied, setShareCopied] = useState(false);
  const [showPlayModal, setShowPlayModal] = useState(false);

  const loadGame = useCallback(async () => {
    try {
      // FIX: Guard against "undefined" ID 
      if (!gameId || gameId === 'undefined') {
        throw new Error('Invalid game ID');
      }
      const response = await gamesAPI.getById(gameId);
      setGame(response.data.game);
    } catch (err) {
      toast.error('Failed to load game details.');
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
      toast.success('Added to favorites!');
      setShowFavoriteModal(false);
      setFavoriteCategory('General');
      setFavoriteNotes('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to favorites.');
    }
  };

  const handleDeleteGame = async () => {
    if (window.confirm('Are you sure you want to delete this game? This cannot be undone.')) {
      try {
        await gamesAPI.delete(gameId);
        toast.success('Game deleted.');
        navigate('/history');
      } catch (err) {
        toast.error('Failed to delete game.');
      }
    }
  };

  const handleShare = async () => {
    if (!game) return;

    const maxScore = Math.max(...game.teams.map(t => t.totalScore));
    const winners = game.teams.filter(t => t.totalScore === maxScore).map(t => t.name);
    const standings = [...game.teams]
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((t, i) => `${i + 1}. ${t.name}: ${t.totalScore} pts`)
      .join('\n');

    const gameUrl = window.location.href;

    const shareText = `🎭 Imposter Game: ${game.gameName}\n` +
      `📅 ${new Date(game.createdAt).toLocaleDateString()}\n` +
      `👥 ${game.numberOfPlayers} players · ${game.currentRound} rounds\n` +
      `🏆 Winner: ${winners.join(', ')}\n\n` +
      `📊 Final Standings:\n${standings}\n\n` +
      `🔗 View full game history:\n${gameUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Imposter Game: ${game.gameName}`,
          text: shareText,
          url: gameUrl
        });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch {
        toast.error('Could not copy to clipboard.');
      }
    }
  };

  const handleRematch = () => {
    if (!game) return;
    const teamNames = (game.teams || []).map(t => t.name).filter(Boolean);
    setShowPlayModal(false);
    navigate('/play', {
      state: {
        rematch: true,
        teamNames,
        prefillPlayerNames: teamNames,
        numberOfPlayers: game.numberOfPlayers || teamNames.length,
        category: game.category || '',
        prefillCategory: game.category || 'malayalam',
        gameName: game.gameName ? `${game.gameName} (Rematch)` : '',
        prefillGameName: game.gameName ? `${game.gameName} (Rematch)` : ''
      }
    });
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div></div>;
  }

  // FIX: Provide a "Go Back" button if the game fails to load
  if (!game) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', marginTop: '3rem' }}>
        <div className="alert alert-error" style={{ marginBottom: '1.5rem', display: 'inline-block' }}>
          ⚠️ Game not found or the link is invalid.
        </div>
        <br />
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/history')}>
          ← Back to History
        </button>
      </div>
    );
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
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowPlayModal(true)}>▶ Play</button>
            <button className="btn btn-success btn-sm" onClick={handleShare}>
              {shareCopied ? '✅ Copied!' : '📤 Share'}
            </button>
            <button className="btn btn-warning btn-sm" onClick={() => setShowFavoriteModal(true)}>⭐ Favorite</button>
            <button className="btn btn-danger btn-sm" onClick={handleDeleteGame}>🗑️ Delete</button>
          </div>
        </div>
      </div>

      <Scoreboard teams={game.teams} rounds={game.rounds} />

      {game.rounds && game.rounds.length > 0 && (
        <div className="card mt-3">
          <div className="card-header">
            <h3>📋 Detailed Round History</h3>
          </div>

          {game.rounds.map(round => (
            <div
              key={round.roundNumber}
              style={{ padding: '1rem', marginBottom: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}
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
                    style={{ color: score.roundScore > 0 ? 'var(--accent-success)' : score.roundScore < 0 ? 'var(--accent-danger)' : 'var(--text-muted)' }}
                  >
                    {score.teamName}: {score.roundScore > 0 ? '+' : ''}{score.roundScore}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="btn btn-secondary mt-3" onClick={() => navigate('/history')}>
        ← Back to History
      </button>

      {/* FAVORITE MODAL */}
      {showFavoriteModal && (
        <div className="modal-overlay" onClick={() => setShowFavoriteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>⭐ Save to Favorites</h2>
            <div className="form-group">
              <label>Category</label>
              <input type="text" className="form-control" value={favoriteCategory} onChange={e => setFavoriteCategory(e.target.value)} placeholder="e.g., Best Games, Tournament" />
            </div>
            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea className="form-control" value={favoriteNotes} onChange={e => setFavoriteNotes(e.target.value)} placeholder="Add notes..." rows={3} maxLength={500} style={{ resize: 'vertical' }} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowFavoriteModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddFavorite}>⭐ Save</button>
            </div>
          </div>
        </div>
      )}

      {/* PLAY OPTIONS MODAL */}
      {showPlayModal && (
        <div className="modal-overlay" onClick={() => setShowPlayModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>▶</div>
            <h2>How do you want to play?</h2>
            <p className="text-muted mb-3">You selected: <strong>{game.gameName}</strong></p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button className="btn btn-primary btn-lg btn-block" onClick={handleRematch}>🔄 Rematch (Same Players)</button>
              <button className="btn btn-secondary btn-lg btn-block" onClick={() => navigate('/play')}>🆕 Start Entirely New Game</button>
              <button className="btn btn-ghost btn-block" onClick={() => setShowPlayModal(false)} style={{ marginTop: '0.25rem' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameDetail;