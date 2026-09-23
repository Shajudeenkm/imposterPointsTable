import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { gamesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import RoleDesignation from './RoleDesignation';
import VotingPanel from './VotingPanel';
import Scoreboard from './Scoreboard';
import ScoreSettings from './ScoreSettings';
import {
  loadGuestGame,
  saveGuestGame,
  clearGuestGame,
  processGuestRound,
  setPendingGuestSave
} from '../../utils/guestGame';

const GameSession = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isGuest, endGuest, openAuthModal } = useAuth();

  const isGuestSession = gameId === 'guest' || isGuest;
  const forceResumeMode = location.state?.resumeMode === true;

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedImposters, setSelectedImposters] = useState([]);
  const [imposterCount, setImposterCount] = useState(1);
  const [votes, setVotes] = useState({});
  const [roundPhase, setRoundPhase] = useState('setup');
  const [lastRoundResult, setLastRoundResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [endingGame, setEndingGame] = useState(false);

  const [showBackExitModal, setShowBackExitModal] = useState(false);
  const [backExitProcessing, setBackExitProcessing] = useState(false);

  const [showGuestSaveModal, setShowGuestSaveModal] = useState(false);
  const [guestWinners, setGuestWinners] = useState([]);

  const loadGame = useCallback(async () => {
    try {
      setLoading(true);

      if (isGuestSession) {
        const local = loadGuestGame();
        if (!local) {
          setError('No guest game found. Start a new game from setup.');
          setGame(null);
          return;
        }
        setGame(local);
        if (local.numberOfPlayers <= 3) setImposterCount(1);
        return;
      }

      const response = await gamesAPI.getById(gameId);
      let loadedGame = response.data.game;

      if (loadedGame.status === 'completed' && forceResumeMode) {
        try {
          await gamesAPI.reactivate(gameId);
          loadedGame.status = 'active';
          loadedGame.completedAt = null;
        } catch (e) {
          console.warn('Could not reactivate on server', e);
          loadedGame.status = 'active';
        }
      }

      setGame(loadedGame);
      if (loadedGame.numberOfPlayers <= 3) setImposterCount(1);
    } catch (err) {
      setError('Failed to load game.');
    } finally {
      setLoading(false);
    }
  }, [gameId, forceResumeMode, isGuestSession]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  useEffect(() => {
    if (!game || game.status === 'completed') return;

    window.history.pushState({ gameGuard: true }, '', window.location.href);

    const onPopState = () => {
      window.history.pushState({ gameGuard: true }, '', window.location.href);
      setShowBackExitModal(true);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [game]);

  const handleBackEndGame = async () => {
    setBackExitProcessing(true);
    try {
      if (isGuestSession) {
        const ended = {
          ...game,
          status: 'completed',
          completedAt: new Date().toISOString()
        };
        saveGuestGame(ended);
        setGame(ended);
        const maxScore = Math.max(...ended.teams.map((t) => t.totalScore));
        setGuestWinners(ended.teams.filter((t) => t.totalScore === maxScore).map((w) => w.name));
        setShowBackExitModal(false);
        setShowGuestSaveModal(true);
        setBackExitProcessing(false);
        return;
      }

      await gamesAPI.complete(gameId);
      setShowBackExitModal(false);
      navigate('/history', { replace: true });
    } catch (err) {
      setError('Failed to end game.');
      setBackExitProcessing(false);
    }
  };

  const handleBackContinue = () => setShowBackExitModal(false);

  const handleBackPlayLater = () => {
    setShowBackExitModal(false);
    navigate('/play', { replace: true });
  };

  const handleToggleImposter = (teamId) => {
    setSelectedImposters((prev) => {
      if (prev.includes(teamId)) return prev.filter((id) => id !== teamId);
      if (prev.length >= imposterCount) return prev;
      return [...prev, teamId];
    });
  };

  const handleCountChange = (n) => {
    setImposterCount(n);
    setSelectedImposters((prev) => prev.slice(0, n));
  };

  const handleVoteChange = (voterId, votedForId) => {
    setVotes((prev) => ({ ...prev, [voterId]: votedForId }));
  };

  const handleProceedToVoting = () => {
    if (selectedImposters.length !== imposterCount) {
      setError(`Please select exactly ${imposterCount} imposter${imposterCount > 1 ? 's' : ''}.`);
      return;
    }
    setError('');
    setSuccess('');
    setRoundPhase('voting');
  };

  const handleSubmitRound = async () => {
    const nonImposters = game.teams.filter((t) => !selectedImposters.includes(t.teamId));
    const missingVotes = nonImposters.filter((t) => !votes[t.teamId]);

    if (missingVotes.length > 0) {
      setError(`Missing votes from: ${missingVotes.map((t) => t.name).join(', ')}`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const voteArray = Object.entries(votes).map(([voterId, votedForId]) => ({
        voterId,
        votedForId
      }));

      if (isGuestSession) {
        const result = processGuestRound(game, selectedImposters, voteArray);
        saveGuestGame(result.game);
        setGame(result.game);
        setLastRoundResult(result);

        const { imposterNames, identifiedByNames, fooledByNames, correctCount, missCount } = result.summary;
        const imposterList = imposterNames.join(', ');

        if (correctCount > 0 && missCount === 0) {
          setSuccess(`🔍 Perfect round! Everyone caught the imposter (${imposterList})! ${identifiedByNames.join(', ')} all guessed correctly.`);
        } else if (correctCount > 0) {
          setSuccess(`🔍 Imposter ${imposterList} was caught by ${identifiedByNames.join(', ')}! But ${fooledByNames.join(', ')} got fooled.`);
        } else {
          setSuccess(`🎭 Imposter ${imposterList} fooled EVERYONE and earned +${missCount} points! Fooled: ${fooledByNames.join(', ')}.`);
        }

        setRoundPhase('result');
        return;
      }

      const response = await gamesAPI.submitRound(gameId, {
        imposterIds: selectedImposters,
        votes: voteArray
      });

      setLastRoundResult(response.data);
      setGame((prev) => ({
        ...prev,
        teams: response.data.updatedTeams,
        rounds: [...(prev.rounds || []), response.data.round],
        currentRound: prev.currentRound + 1
      }));

      const { imposterNames, identifiedByNames, fooledByNames, correctCount, missCount } = response.data.summary;
      const imposterList = imposterNames.join(', ');

      if (correctCount > 0 && missCount === 0) {
        setSuccess(`🔍 Perfect round! Everyone caught the imposter (${imposterList})! ${identifiedByNames.join(', ')} all guessed correctly.`);
      } else if (correctCount > 0) {
        setSuccess(`🔍 Imposter ${imposterList} was caught by ${identifiedByNames.join(', ')}! But ${fooledByNames.join(', ')} got fooled.`);
      } else {
        setSuccess(`🎭 Imposter ${imposterList} fooled EVERYONE and earned +${missCount} points! Fooled: ${fooledByNames.join(', ')}.`);
      }

      setRoundPhase('result');
    } catch (err) {
      setError(err.message || err.response?.data?.message || 'Failed to submit round.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewRound = () => {
    setSelectedImposters([]);
    setVotes({});
    setRoundPhase('setup');
    setLastRoundResult(null);
    setSuccess('');
    setError('');
  };

  const requestEndGame = () => setShowEndConfirm(true);

  const confirmEndGame = async () => {
    setEndingGame(true);
    try {
      if (isGuestSession) {
        const ended = {
          ...game,
          status: 'completed',
          completedAt: new Date().toISOString()
        };
        saveGuestGame(ended);
        setGame(ended);
        const maxScore = Math.max(...ended.teams.map((t) => t.totalScore));
        const winners = ended.teams.filter((t) => t.totalScore === maxScore).map((w) => w.name);
        setGuestWinners(winners);
        setSuccess(`🏆 Game Over! Winner(s): ${winners.join(', ')}`);
        setShowEndConfirm(false);
        setShowGuestSaveModal(true);
        return;
      }

      const response = await gamesAPI.complete(gameId);
      setSuccess(`🏆 Game Over! Winner(s): ${response.data.winners.join(', ')}`);
      setGame((prev) => ({ ...prev, status: 'completed' }));
      setShowEndConfirm(false);
    } catch (err) {
      setError('Failed to end game.');
    } finally {
      setEndingGame(false);
    }
  };

  const handleGuestSaveToCloud = () => {
    const snapshot = loadGuestGame() || game;
    if (!snapshot) return;
    const pending = {
      ...snapshot,
      status: 'completed',
      completedAt: snapshot.completedAt || new Date().toISOString()
    };
    setPendingGuestSave(pending);
    setShowGuestSaveModal(false);
    openAuthModal({ mode: 'login', reason: 'guest-save', pendingGame: pending });
  };

  const handleGuestDiscard = () => {
    clearGuestGame();
    endGuest();
    setShowGuestSaveModal(false);
    navigate('/', { replace: true });
  };

  const handleUpdateSettings = async (settings) => {
    try {
      if (isGuestSession) {
        const next = {
          ...game,
          floorLimitEnabled: settings.floorLimitEnabled !== undefined ? settings.floorLimitEnabled : game.floorLimitEnabled,
          floorLimitValue: settings.floorLimitValue !== undefined ? settings.floorLimitValue : game.floorLimitValue
        };
        saveGuestGame(next);
        setGame(next);
        return;
      }

      const response = await gamesAPI.updateSettings(gameId, settings);
      setGame(response.data.game);
    } catch (err) {
      setError('Failed to update settings.');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading game...</p>
      </div>
    );
  }

  if (!game) {
    return (
      <div>
        <div className="alert alert-error">{error || 'Game not found.'}</div>
        <button className="btn btn-primary" type="button" onClick={() => navigate('/play')}>
          ← Back to Setup
        </button>
      </div>
    );
  }

  if (game.status === 'completed' && !isGuestSession) {
    return (
      <div>
        <div className="page-header">
          <h1>🏆 Game Completed</h1>
          <p>{game.gameName}</p>
        </div>
        {success && <div className="alert alert-success">{success}</div>}
        <Scoreboard teams={game.teams} rounds={game.rounds} />
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" type="button" onClick={() => navigate('/play')}>
            🎮 New Game
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => navigate('/history')}>
            📜 View History
          </button>
        </div>
      </div>
    );
  }

  if (game.status === 'completed' && isGuestSession && !showGuestSaveModal) {
    return (
      <div>
        <div className="page-header">
          <h1>🏆 Game Completed (Guest)</h1>
          <p>{game.gameName}</p>
        </div>
        {success && <div className="alert alert-success">{success}</div>}
        <Scoreboard teams={game.teams} rounds={game.rounds} />
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" type="button" onClick={() => setShowGuestSaveModal(true)}>
            ☁️ Save to Cloud
          </button>
          <button className="btn btn-secondary" type="button" onClick={handleGuestDiscard}>
            Discard & Leave
          </button>
        </div>
      </div>
    );
  }

  const maxImposters = Math.max(1, game.numberOfPlayers - 2);

  return (
    <div>
      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1>
              🎮 {game.gameName}
              {isGuestSession && (
                <span
                  style={{
                    marginLeft: '0.5rem',
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '999px',
                    background: 'rgba(239,71,101,0.15)',
                    color: '#EF4765',
                    verticalAlign: 'middle'
                  }}
                >
                  GUEST
                </span>
              )}
            </h1>
            <p>
              {game.numberOfPlayers} players · Round {(game.currentRound || 0) + 1}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-danger btn-sm" type="button" onClick={requestEndGame}>
              🏁 End Game
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
        <strong>📏 Scoring Rules:</strong>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <span>✅ Correct vote: <strong style={{ color: 'var(--accent-success)' }}>+1</strong></span>
          <span>❌ Wrong vote: <strong style={{ color: 'var(--accent-danger)' }}>−1</strong></span>
          <span>🎭 Imposter per fool: <strong style={{ color: 'var(--accent-success)' }}>+1</strong></span>
          <span>🎭 Imposter per catch: <strong style={{ color: 'var(--accent-danger)' }}>−1</strong></span>
        </div>
      </div>

      {error && <div className="alert alert-error">⚠️ {error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="game-layout">
        <div className="game-main">
          {roundPhase === 'setup' && game.status === 'active' && (
            <>
              <RoleDesignation
                teams={game.teams}
                selectedImposters={selectedImposters}
                onToggleImposter={handleToggleImposter}
                maxImposters={maxImposters}
                imposterCount={imposterCount}
                onCountChange={handleCountChange}
              />
              <button
                className="btn btn-primary btn-lg"
                type="button"
                onClick={handleProceedToVoting}
                disabled={selectedImposters.length !== imposterCount}
              >
                Continue to Voting →
              </button>
            </>
          )}

          {roundPhase === 'voting' && game.status === 'active' && (
            <>
              <div className="alert alert-info">
                🎭 Imposter{selectedImposters.length > 1 ? 's' : ''}:{' '}
                <strong>
                  {selectedImposters.map((id) => game.teams.find((t) => t.teamId === id)?.name).join(', ')}
                </strong>
              </div>

              <VotingPanel
                teams={game.teams}
                votes={votes}
                onVoteChange={handleVoteChange}
                imposters={selectedImposters}
              />

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" type="button" onClick={() => setRoundPhase('setup')}>
                  ← Back
                </button>
                <button
                  className="btn btn-success btn-lg"
                  type="button"
                  onClick={handleSubmitRound}
                  disabled={submitting}
                >
                  {submitting ? 'Calculating...' : '✅ Submit Round'}
                </button>
              </div>
            </>
          )}

          {roundPhase === 'result' && lastRoundResult && (
            <>
              <div className={`alert ${lastRoundResult.imposterIdentified ? 'alert-success' : 'alert-warning'}`}>
                {lastRoundResult.imposterIdentified ? '🔍 Good detective work! ' : '🎭 The imposter escaped! '}
                {success}
              </div>

              <div className="card">
                <div className="card-header">
                  <h3>📊 Round {lastRoundResult.round.roundNumber} Details</h3>
                </div>
                <div className="scoreboard-table-wrap">
                  <table className="scoreboard-table">
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th>Role</th>
                        <th>Voted For</th>
                        <th>Result</th>
                        <th>Round</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastRoundResult.round.scores.map((s) => (
                        <tr key={s.teamId}>
                          <td><strong>{s.teamName}</strong></td>
                          <td>
                            {s.wasImposter ? <span className="imposter-badge">🎭 Imposter</span> : '👤 Innocent'}
                          </td>
                          <td>{s.wasImposter ? '—' : s.votedFor || '—'}</td>
                          <td>
                            {s.wasImposter
                              ? `Fooled ${lastRoundResult.summary.missCount}, Caught by ${lastRoundResult.summary.correctCount}`
                              : s.identifiedImposter
                                ? <span style={{ color: 'var(--accent-success)' }}>✅ Correct</span>
                                : <span style={{ color: 'var(--accent-danger)' }}>❌ Wrong</span>}
                          </td>
                          <td>
                            <strong style={{ color: s.roundScore > 0 ? 'var(--accent-success)' : s.roundScore < 0 ? 'var(--accent-danger)' : 'var(--text-muted)' }}>
                              {s.roundScore > 0 ? '+' : ''}{s.roundScore}
                            </strong>
                          </td>
                          <td><strong>{s.cumulativeScore}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <Scoreboard teams={game.teams} rounds={game.rounds} />

              <button className="btn btn-primary btn-lg" type="button" onClick={handleNewRound}>
                🎲 Start Next Round
              </button>
            </>
          )}

          {roundPhase !== 'result' && game.rounds && game.rounds.length > 0 && (
            <Scoreboard teams={game.teams} rounds={game.rounds} />
          )}

          {game.rounds && game.rounds.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3>📋 Round History</h3>
              </div>
              <div className="round-history">
                {[...game.rounds].reverse().map((round) => (
                  <div className="round-summary" key={round.roundNumber}>
                    <div className="round-header">
                      <span className="round-title">Round {round.roundNumber}</span>
                      <span className={`round-result ${round.imposterIdentified ? 'result-caught' : 'result-escaped'}`}>
                        {round.imposterIdentified ? '🔍 Caught' : '🎭 Escaped'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      🎭 Imposter: <strong>{round.imposterNames.join(', ')}</strong>
                    </div>
                    {round.identifiedByNames && round.identifiedByNames.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-success)', marginTop: '0.25rem' }}>
                        ✅ Caught by: {round.identifiedByNames.join(', ')}
                      </div>
                    )}
                    {round.fooledByNames && round.fooledByNames.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-danger)', marginTop: '0.25rem' }}>
                        ❌ Fooled: {round.fooledByNames.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="game-sidebar">
          <ScoreSettings game={game} onUpdateSettings={handleUpdateSettings} />
        </div>
      </div>

      {showEndConfirm && (
        <div className="modal-overlay" onClick={() => !endingGame && setShowEndConfirm(false)}>
          <div className="modal-content exit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="exit-modal-icon">🏁</div>
            <h2>End the Game?</h2>
            <p className="exit-modal-desc">
              {isGuestSession
                ? 'Final scores will be locked. You can save to cloud (login) or discard.'
                : 'Are you sure you want to end this game? Final scores will be locked and a winner will be declared.'}
            </p>
            <div className="exit-modal-actions">
              <button className="btn btn-danger btn-block" type="button" onClick={confirmEndGame} disabled={endingGame}>
                {endingGame ? 'Ending...' : '🏁 Yes, End Game'}
              </button>
              <button className="btn btn-secondary btn-block" type="button" onClick={() => setShowEndConfirm(false)} disabled={endingGame}>
                🎮 Keep Playing
              </button>
            </div>
          </div>
        </div>
      )}

      {showBackExitModal && (
        <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={() => !backExitProcessing && handleBackContinue()}>
          <div className="modal-content exit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="exit-modal-icon">⚠️</div>
            <h2>Leaving the Game?</h2>
            <p className="exit-modal-desc">You pressed the browser Back button. What would you like to do with this game?</p>
            <div className="exit-modal-actions">
              <button className="btn btn-danger btn-block" type="button" onClick={handleBackEndGame} disabled={backExitProcessing}>
                {backExitProcessing ? 'Ending...' : '🏁 End Game'}
              </button>
              <button className="btn btn-success btn-block" type="button" onClick={handleBackContinue} disabled={backExitProcessing}>
                🎮 Continue Playing
              </button>
              <button className="btn btn-secondary btn-block" type="button" onClick={handleBackPlayLater} disabled={backExitProcessing}>
                ⏸️ Play Later
              </button>
            </div>
          </div>
        </div>
      )}

      {showGuestSaveModal && (
        <div className="modal-overlay" style={{ zIndex: 2100 }}>
          <div className="modal-content exit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="exit-modal-icon">☁️</div>
            <h2>Save Guest Game?</h2>
            <p className="exit-modal-desc">
              {guestWinners.length > 0 && <>Winner(s): <strong>{guestWinners.join(', ')}</strong><br /></>}
              Save this game to your account, or discard it forever.
            </p>
            <div className="exit-modal-actions">
              <button className="btn btn-primary btn-block" type="button" onClick={handleGuestSaveToCloud}>
                ☁️ Save to Cloud (Login / Signup)
              </button>
              <button className="btn btn-secondary btn-block" type="button" onClick={handleGuestDiscard}>
                🗑️ Discard & Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameSession;