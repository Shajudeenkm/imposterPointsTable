import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Settings, X } from 'lucide-react';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { gamesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import RoleDesignation from './RoleDesignation';
import VotingPanel from './VotingPanel';
import Scoreboard from './Scoreboard';
import {
  loadGuestGame, saveGuestGame, clearGuestGame,
  processGuestRound
} from '../../utils/guestGame';

const calcMaxImposters = (n) => {
  if (n <= 4) return 1;
  if (n === 5) return 2;
  return Math.floor(n / 2);
};

const vibrate = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(50);
  }
};

const triggerConfetti = () => {
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#6366f1', '#ec4899', '#10b981', '#f59e0b']
  });
};

const GameSession = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isGuest, endGuest } = useAuth();

  const isGuestSession = gameId === 'guest' || isGuest;
  const forceResumeMode = location.state?.resumeMode === true;

  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedImposters, setSelectedImposters] = useState([]);
  const [imposterCount, setImposterCount] = useState(1);
  const [votes, setVotes] = useState({});
  const [roundPhase, setRoundPhase] = useState('setup');
  const [lastRoundResult, setLastRoundResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showBackExitModal, setShowBackExitModal] = useState(false);
  const [backExitProcessing, setBackExitProcessing] = useState(false);
  const [showGuestSaveModal, setShowGuestSaveModal] = useState(false);

  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const [tempFloorEnabled, setTempFloorEnabled] = useState(false);
  const [tempFloorValue, setTempFloorValue] = useState(0);
  const [tempVotingMode, setTempVotingMode] = useState('single');
  const [tempAllowImposterVoting, setTempAllowImposterVoting] = useState(false);
  const [tempRequiredVotes, setTempRequiredVotes] = useState(1);

  const loadGame = useCallback(async () => {
    try {
      setLoading(true);
      if (isGuestSession) {
        const local = loadGuestGame();
        if (!local) return navigate('/play');
        setGame(local);
        setTempFloorEnabled(local.floorLimitEnabled || false);
        setTempFloorValue(local.floorLimitValue || 0);
        setTempVotingMode(local.votingMode || 'single');
        setTempAllowImposterVoting(local.allowImposterVoting || false);
        setTempRequiredVotes(local.requiredVotesPerPlayer || 1);
        if (local.numberOfPlayers <= 3) setImposterCount(1);

        if (local.currentRound === 0 && !localStorage.getItem('seen_game_tooltip')) {
          setShowTooltip(true);
        }
        return;
      }
      
      // FIX: Guard against "undefined" ID navigation
      if (!gameId || gameId === 'undefined') {
        throw new Error('Invalid game ID');
      }

      const response = await gamesAPI.getById(gameId);
      let loadedGame = response.data.game;
      if (loadedGame.status === 'completed' && forceResumeMode) {
        try {
          await gamesAPI.reactivate(gameId);
          loadedGame.status = 'active';
        } catch (e) { console.warn('Could not reactivate'); }
      }
      setGame(loadedGame);
      setTempFloorEnabled(loadedGame.floorLimitEnabled || false);
      setTempFloorValue(loadedGame.floorLimitValue || 0);
      setTempVotingMode(loadedGame.votingMode || 'single');
      setTempAllowImposterVoting(loadedGame.allowImposterVoting || false);
      setTempRequiredVotes(loadedGame.requiredVotesPerPlayer || 1);
      if (loadedGame.numberOfPlayers <= 3) setImposterCount(1);

      if (loadedGame.currentRound === 0 && !localStorage.getItem('seen_game_tooltip')) {
        setShowTooltip(true);
      }
    } catch (err) {
      toast.error('Failed to load game.');
    } finally {
      setLoading(false);
    }
  }, [gameId, forceResumeMode, isGuestSession, navigate]);

  useEffect(() => { loadGame(); }, [loadGame]);

  const dismissTooltip = () => {
    setShowTooltip(false);
    localStorage.setItem('seen_game_tooltip', 'true');
  };

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

  const handleVoteChange = (voterId, votedForIds) => {
    vibrate();
    setVotes((prev) => ({ ...prev, [voterId]: votedForIds }));
  };

  const handleSubmitRound = async () => {
    vibrate();
    const isMultiVote = game.votingMode === 'multi' && selectedImposters.length >= 2 && game.numberOfPlayers >= 5;
    const allowImposterVoting = !!game.allowImposterVoting && game.numberOfPlayers >= 5;
    const requiredPicks = Math.min(game.requiredVotesPerPlayer || 1, isMultiVote ? selectedImposters.length : 1);
    const requiredVoters = allowImposterVoting ? game.teams : game.teams.filter((t) => !selectedImposters.includes(t.teamId));

    const missingVotes = requiredVoters.filter((t) => {
      const v = votes[t.teamId];
      if (!v || !Array.isArray(v)) return true;
      const filled = v.filter((x) => x && x !== '').length;
      return filled < requiredPicks;
    });

    if (missingVotes.length > 0) {
      toast.error(`Each voter must pick at least ${requiredPicks} suspect(s). Missing from: ${missingVotes.map((t) => t.name).join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      const voteArray = [];
      Object.entries(votes).forEach(([voterId, targetIds]) => {
        const targets = Array.isArray(targetIds) ? targetIds : [targetIds];
        targets.forEach((votedForId) => {
          if (votedForId && votedForId !== '') voteArray.push({ voterId, votedForId });
        });
      });

      if (isGuestSession) {
        const result = processGuestRound(game, selectedImposters, voteArray);
        saveGuestGame(result.game);
        setGame(result.game);
        setLastRoundResult(result);
        toast.success(result.imposterIdentified ? '🔍 Imposter Caught!' : '🎭 Imposter Escaped!');
        setRoundPhase('result');
        return;
      }

      const response = await gamesAPI.submitRound(gameId, { imposterIds: selectedImposters, votes: voteArray });
      setLastRoundResult(response.data);
      setGame((prev) => ({
        ...prev,
        teams: response.data.updatedTeams,
        rounds: [...(prev.rounds || []), response.data.round],
        currentRound: prev.currentRound + 1
      }));
      toast.success(response.data.imposterIdentified ? '🔍 Imposter Caught!' : '🎭 Imposter Escaped!');
      setRoundPhase('result');
    } catch (err) {
      toast.error(err.message || 'Failed to submit round.');
    } finally {
      setSubmitting(false);
    }
  };

  const saveSettings = async () => {
    try {
      const payload = {
        floorLimitEnabled: tempFloorEnabled,
        floorLimitValue: tempFloorValue,
        votingMode: tempVotingMode,
        allowImposterVoting: tempAllowImposterVoting,
        requiredVotesPerPlayer: tempRequiredVotes
      };
      if (isGuestSession) {
        const next = { ...game, ...payload };
        saveGuestGame(next);
        setGame(next);
      } else {
        const response = await gamesAPI.updateSettings(gameId, payload);
        setGame(response.data.game);
      }
      toast.success('Settings updated for next round!');
      setShowSettingsPanel(false);
    } catch (err) {
      toast.error('Failed to save settings.');
    }
  };

  const confirmEndGame = async () => {
    try {
      if (isGuestSession) {
        const ended = { ...game, status: 'completed', completedAt: new Date().toISOString() };
        saveGuestGame(ended);
        setGame(ended);
        setShowEndConfirm(false);
        setShowGuestSaveModal(true);
        triggerConfetti();
        return;
      }
      const response = await gamesAPI.complete(gameId);
      setGame((prev) => ({ ...prev, status: 'completed' }));
      setShowEndConfirm(false);
      triggerConfetti();
      toast.success(`🏆 Game Over! Winner: ${response.data.winners.join(', ')}`);
    } catch (err) {
      toast.error('Failed to end game.');
    }
  };

  const handleBackEndGame = async () => {
    setBackExitProcessing(true);
    try {
      if (isGuestSession) {
        const ended = { ...game, status: 'completed', completedAt: new Date().toISOString() };
        saveGuestGame(ended);
        setGame(ended);
        setShowBackExitModal(false);
        setShowGuestSaveModal(true);
        triggerConfetti();
      } else {
        await gamesAPI.complete(gameId);
        setShowBackExitModal(false);
        triggerConfetti();
        navigate('/history', { replace: true });
      }
    } catch (err) {
      toast.error('Failed to end game.');
    } finally {
      setBackExitProcessing(false);
    }
  };

  const handleBackContinue = () => setShowBackExitModal(false);
  const handleBackPlayLater = () => {
    setShowBackExitModal(false);
    navigate(isGuestSession ? '/' : '/play', { replace: true });
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;

  // FIX: Provide a "Go Back" button if game fails to load
  if (!game) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', marginTop: '3rem' }}>
        <div className="alert alert-error" style={{ marginBottom: '1.5rem', display: 'inline-block' }}>
          ⚠️ Game not found or the link is invalid.
        </div>
        <br />
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/play')}>
          ← Start a New Game
        </button>
      </div>
    );
  }

  if (game.status === 'completed' && !isGuestSession) {
    return (
      <div>
        <div className="page-header"><h1>🏆 Game Completed</h1><p>{game.gameName}</p></div>
        <Scoreboard teams={game.teams} rounds={game.rounds} />
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/play')}>🎮 New Game</button>
          <button className="btn btn-secondary" onClick={() => navigate('/history')}>📜 View History</button>
        </div>
      </div>
    );
  }

  if (game.status === 'completed' && isGuestSession && !showGuestSaveModal) {
    return (
      <div>
        <div className="page-header"><h1>🏆 Game Completed (Guest)</h1><p>{game.gameName}</p></div>
        <Scoreboard teams={game.teams} rounds={game.rounds} />
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => setShowGuestSaveModal(true)}>☁️ Save to Cloud</button>
          <button className="btn btn-secondary" onClick={() => { clearGuestGame(); endGuest(); navigate('/'); }}>Discard & Leave</button>
        </div>
      </div>
    );
  }

  const pCount = game.numberOfPlayers;
  const maxImposters = calcMaxImposters(pCount);
  const canUseAdvancedVoting = pCount >= 5;
  const isMultiActive = game.votingMode === 'multi' && canUseAdvancedVoting;
  const maxImposterBonus = pCount - imposterCount - (game.allowImposterVoting ? 0 : 1);
  const tempMaxRequiredVotes = maxImposters;

  return (
    <div className="game-session-page relative">

      {showTooltip && (
        <div className="tooltip-overlay" onClick={dismissTooltip}>
          <div className="tooltip-box" onClick={e => e.stopPropagation()}>
            <h3>Welcome to your first game! 🎮</h3>
            <p>1. Pick the imposter(s) using the buttons.</p>
            <p>2. Pass the phone so everyone can vote.</p>
            <p>3. Click the ⚙️ <strong>Settings Gear</strong> above to change voting mode, floor limit, or imposter voting any time.</p>
            <button className="btn btn-primary btn-block mt-2" onClick={dismissTooltip}>Got it!</button>
          </div>
        </div>
      )}

      <div className="page-header">
        <div className="flex-between">
          <div>
            <h1>
              🎮 {game.gameName}
              {isGuestSession && <span className="badge badge-guest">GUEST</span>}
            </h1>
            <p>
              {pCount} players · Round {(game.currentRound || 0) + 1}
              <span className="text-muted ml-2">
                {isMultiActive ? '🗳️ Multi' : '🗳️ Single'}
                {game.allowImposterVoting && canUseAdvancedVoting ? ' · 🎭 Imposters vote' : ''}
              </span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowSettingsPanel(true)} title="Settings">
              <Settings size={18}/>
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => setShowEndConfirm(true)}>🏁 End</button>
          </div>
        </div>
      </div>

      <div className="card mb-3" style={{ fontSize: '0.85rem' }}>
        <strong>📏 Scoring Rules ({pCount} players):</strong>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <span>✅ Correct identifier: <strong className="text-success">+1</strong></span>
          <span>❌ Wrong vote: <strong className="text-danger">−1</strong></span>
          <span>🎭 Imposter not caught: <strong className="text-success">+1 per fool</strong> (max +{maxImposterBonus})</span>
          <span>🎭 Imposter caught: <strong className="text-danger">−1 per catch</strong></span>
        </div>
        {game.floorLimitEnabled && (
          <div style={{ marginTop: '0.5rem', color: 'var(--warning)', fontWeight: 600 }}>
            🛡️ Floor limit active: minimum score = {game.floorLimitValue}
          </div>
        )}
        {isMultiActive && (
          <div style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
            🗳️ Multi-vote: {game.requiredVotesPerPlayer || 1} vote{(game.requiredVotesPerPlayer || 1) > 1 ? 's' : ''} required per player
          </div>
        )}
      </div>

      <div className="game-layout">
        <div className="game-main">
          {roundPhase === 'setup' && (
            <>
              <RoleDesignation
                teams={game.teams}
                selectedImposters={selectedImposters}
                onToggleImposter={(id) => {
                  vibrate();
                  setSelectedImposters(p => p.includes(id) ? p.filter(x=>x!==id) : (p.length < imposterCount ? [...p, id] : p));
                }}
                maxImposters={maxImposters}
                imposterCount={imposterCount}
                onCountChange={(n) => {setImposterCount(n); setSelectedImposters(p => p.slice(0,n)); vibrate();}}
              />
              {/* FIX: Start button is now guaranteed visible on mobile */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', width: '100%' }}>
                <button className="btn btn-primary btn-lg" style={{ width: '100%', padding: '1rem' }} onClick={() => {setVotes({}); setRoundPhase('voting');}} disabled={selectedImposters.length !== imposterCount}>
                  Continue to Voting →
                </button>
              </div>
            </>
          )}

          {roundPhase === 'voting' && (
            <>
              <div className="alert alert-info">
                🎭 Imposter{selectedImposters.length > 1 ? 's' : ''}:{' '}
                <strong>{selectedImposters.map((id) => game.teams.find((t) => t.teamId === id)?.name).join(', ')}</strong>
              </div>
              <VotingPanel
                teams={game.teams}
                votes={votes}
                onVoteChange={handleVoteChange}
                imposters={selectedImposters}
                votingMode={game.votingMode}
                allowImposterVoting={game.allowImposterVoting}
                requiredVotesPerPlayer={game.requiredVotesPerPlayer || 1}
              />
              {/* FIX: Voting actions are now guaranteed visible on mobile */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', width: '100%' }}>
                <button className="btn btn-secondary" style={{ padding: '1rem', flex: 1 }} onClick={() => setRoundPhase('setup')}>← Back</button>
                <button className="btn btn-success btn-lg" style={{ padding: '1rem', flex: 2 }} onClick={handleSubmitRound} disabled={submitting}>
                  {submitting ? 'Calculating...' : '✅ Submit Round'}
                </button>
              </div>
            </>
          )}

          {roundPhase === 'result' && lastRoundResult && (
            <>
              <div className="card mb-3">
                <div className="card-header"><h3>📊 Round {lastRoundResult.round.roundNumber} Details</h3></div>
                <div className="scoreboard-table-wrap">
                  <table className="scoreboard-table">
                    <thead><tr><th>Player</th><th>Role</th><th>Result</th><th>Round Score</th></tr></thead>
                    <tbody>
                      {lastRoundResult.round.scores.map((s) => (
                        <tr key={s.teamId}>
                          <td><strong>{s.teamName}</strong></td>
                          <td>{s.wasImposter ? '🎭 Imposter' : '👤 Innocent'}</td>
                          <td>
                            {s.wasImposter
                              ? (s.wasIdentified ? 'Caught!' : 'Escaped!')
                              : (s.identifiedImposter ? 'Guessed right' : 'Fooled')}
                          </td>
                          <td className={s.roundScore > 0 ? 'text-success' : s.roundScore < 0 ? 'text-danger' : ''}>
                            {s.roundScore > 0 ? '+' : ''}{s.roundScore}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="btn btn-primary btn-lg" onClick={() => { setSelectedImposters([]); setVotes({}); setRoundPhase('setup'); }}>
                  Next Round →
                </button>
              </div>
            </>
          )}
        </div>

        <div className="game-sidebar">
          <Scoreboard teams={game.teams} />
        </div>
      </div>

      {/* MID-GAME SETTINGS MODAL */}
      {showSettingsPanel && (
        <div className="modal-overlay" onClick={() => setShowSettingsPanel(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex-between mb-2">
              <h2>⚙️ Game Settings</h2>
              <button className="btn btn-sm btn-ghost" onClick={() => setShowSettingsPanel(false)}><X size={20}/></button>
            </div>
            <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>Changes apply to the next round.</p>

            <div className="form-group">
              <label>
                Voting Mode
                {!canUseAdvancedVoting && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>· unlocks at 5+ players</span>}
              </label>
              <div className="count-selector">
                <button
                  type="button"
                  className={`count-btn ${tempVotingMode === 'single' ? 'active' : ''}`}
                  onClick={() => setTempVotingMode('single')}
                >
                  Single Vote
                </button>
                <button
                  type="button"
                  className={`count-btn ${tempVotingMode === 'multi' ? 'active' : ''} ${!canUseAdvancedVoting ? 'disabled' : ''}`}
                  onClick={() => canUseAdvancedVoting && setTempVotingMode('multi')}
                  disabled={!canUseAdvancedVoting}
                >
                  Multi Vote
                </button>
              </div>
            </div>

            {tempVotingMode === 'multi' && canUseAdvancedVoting && (
              <div className="form-group" style={{ borderLeft: '3px solid var(--accent-primary, #6366f1)', paddingLeft: '12px', marginTop: '1rem' }}>
                <label>Compulsory Votes Per Player</label>
                <select
                  className="form-control"
                  value={Math.min(tempRequiredVotes, tempMaxRequiredVotes)}
                  onChange={(e) => setTempRequiredVotes(Number(e.target.value))}
                  style={{ maxWidth: 240 }}
                >
                  {Array.from({ length: tempMaxRequiredVotes }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'Vote Required' : 'Votes Required'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: canUseAdvancedVoting ? 'pointer' : 'not-allowed', opacity: canUseAdvancedVoting ? 1 : 0.5 }}>
                <input
                  type="checkbox"
                  checked={tempAllowImposterVoting && canUseAdvancedVoting}
                  onChange={(e) => canUseAdvancedVoting && setTempAllowImposterVoting(e.target.checked)}
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
                  checked={tempFloorEnabled}
                  onChange={(e) => setTempFloorEnabled(e.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ textTransform: 'none', fontSize: '0.95rem' }}>🛡️ Enable Score Floor Limit</span>
              </label>
            </div>
            {tempFloorEnabled && (
              <div className="form-group" style={{ paddingLeft: '28px', marginTop: '0.5rem' }}>
                <label>Minimum Score Allowed:</label>
                <input
                  type="number"
                  className="form-control"
                  value={tempFloorValue}
                  onChange={(e) => setFloorLimitValue(parseInt(e.target.value, 10) || 0)}
                  style={{ maxWidth: '150px' }}
                />
              </div>
            )}

            <div className="modal-actions mt-4">
              <button className="btn btn-secondary" onClick={() => setShowSettingsPanel(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveSettings}>Save Settings</button>
            </div>
          </div>
        </div>
      )}

      {/* END GAME CONFIRM MODAL */}
      {showEndConfirm && (
        <div className="modal-overlay" onClick={() => setShowEndConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>🏁 End Game?</h2>
            <p>Are you sure you want to finish this game? No more rounds can be added.</p>
            <div className="modal-actions mt-3">
              <button className="btn btn-secondary" onClick={() => setShowEndConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmEndGame}>Yes, End Game</button>
            </div>
          </div>
        </div>
      )}

      {/* BACK-BUTTON EXIT MODAL */}
      {showBackExitModal && (
        <div className="modal-overlay" onClick={handleBackContinue}>
          <div className="modal-content exit-modal" onClick={e => e.stopPropagation()}>
            <div className="exit-modal-icon">⚠️</div>
            <h2>Exit this game?</h2>
            <p className="exit-modal-desc">
              You're in the middle of a game. What would you like to do?
            </p>
            <div className="exit-modal-actions">
              <button
                type="button"
                className="btn btn-danger btn-block"
                onClick={handleBackEndGame}
                disabled={backExitProcessing}
              >
                {backExitProcessing ? 'Processing...' : '🏁 End Game Now'}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={handleBackContinue}
                disabled={backExitProcessing}
              >
                🎮 Continue Playing
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={handleBackPlayLater}
                disabled={backExitProcessing}
              >
                ⏸️ Play Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GUEST SAVE MODAL */}
      {showGuestSaveModal && (
        <div className="modal-overlay" onClick={() => setShowGuestSaveModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>☁️</div>
              <h2>Save Your Game?</h2>
              <p className="text-muted" style={{ marginBottom: '1rem' }}>
                Sign in or create a free account to save this game to your history, add favorites, and access it from any device.
              </p>
            </div>
            <div className="modal-actions" style={{ flexDirection: 'column', gap: '0.5rem' }}>
              <button
                className="btn btn-primary btn-block"
                onClick={() => {
                  localStorage.setItem('imposter_pending_save', 'true');
                  setShowGuestSaveModal(false);
                  navigate('/');
                }}
              >
                ☁️ Sign in & Save
              </button>
              <button
                className="btn btn-secondary btn-block"
                onClick={() => {
                  clearGuestGame();
                  endGuest();
                  setShowGuestSaveModal(false);
                  navigate('/');
                }}
              >
                🗑️ Discard Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameSession;