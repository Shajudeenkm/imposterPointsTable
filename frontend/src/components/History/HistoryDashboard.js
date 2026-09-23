import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { historyAPI } from '../../services/api';

const HistorySkeleton = () => (
  <div className="history-dashboard" aria-busy="true" aria-label="Loading history">
    <div className="page-header">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-text skeleton-text-md" />
    </div>

    <div className="dashboard-grid history-stats-grid">
      {[0, 1, 2].map((i) => (
        <div className="stat-card skeleton-card" key={i}>
          <div className="skeleton skeleton-circle" />
          <div className="skeleton skeleton-stat" />
          <div className="skeleton skeleton-label" />
        </div>
      ))}
    </div>

    <div className="card mb-3 history-summary-card">
      <div className="card-header">
        <div className="skeleton skeleton-heading" />
      </div>
      <div className="history-summary-scroll">
        {[0, 1, 2, 3].map((i) => (
          <div className="history-summary-chip skeleton-chip" key={i}>
            <div className="skeleton skeleton-text skeleton-text-sm" />
            <div className="skeleton skeleton-text skeleton-text-md" />
            <div className="skeleton skeleton-text skeleton-text-xs" />
          </div>
        ))}
      </div>
    </div>

    <div className="history-filters skeleton-filters">
      {[0, 1, 2, 3, 4].map((i) => (
        <div className="skeleton skeleton-pill" key={i} />
      ))}
    </div>

    <div className="history-list">
      {[0, 1, 2, 3].map((i) => (
        <div className="history-item skeleton-history-item" key={i}>
          <div className="history-item-main" style={{ pointerEvents: 'none' }}>
            <div className="game-info">
              <div className="game-info-body" style={{ flex: 1 }}>
                <div className="skeleton skeleton-text skeleton-text-lg" />
                <div className="skeleton skeleton-text skeleton-text-md" />
                <div className="skeleton-chip-row">
                  <div className="skeleton skeleton-chip-sm" />
                  <div className="skeleton skeleton-chip-sm" />
                  <div className="skeleton skeleton-chip-sm" />
                </div>
              </div>
              <div className="skeleton skeleton-text skeleton-text-xs skeleton-date" />
            </div>
          </div>
          <div className="history-item-actions">
            <div className="skeleton skeleton-btn" />
            <div className="skeleton skeleton-btn" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const HistoryDashboard = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [stats, setStats] = useState({});
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({});

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filter !== 'all') params.period = filter;

      const [historyRes, summaryRes] = await Promise.all([
        historyAPI.getHistory(params),
        historyAPI.getSummary()
      ]);

      setGames(historyRes.data.games);
      setStats(historyRes.data.stats);
      setPagination(historyRes.data.pagination);
      setSummary(summaryRes.data.summary);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const getWinner = (teams) => {
    if (!teams || teams.length === 0) return null;
    const maxScore = Math.max(...teams.map((t) => t.totalScore));
    return teams.find((t) => t.totalScore === maxScore);
  };

  const handlePlayAgain = (e, game) => {
    e.preventDefault();
    e.stopPropagation();
    const teamNames = (game.teams || []).map((t) => t.name).filter(Boolean);
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

  const filters = [
    { key: 'all', label: 'All Time' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' }
  ];

  if (loading) {
    return <HistorySkeleton />;
  }

  return (
    <div className="history-dashboard">
      <div className="page-header">
        <h1>📜 Game History</h1>
        <p>Review your past games and performance</p>
      </div>

      <div className="dashboard-grid history-stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🎮</div>
          <div className="stat-value">{stats.totalGames || 0}</div>
          <div className="stat-label">Total Games</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔄</div>
          <div className="stat-value">{stats.totalRounds || 0}</div>
          <div className="stat-label">Total Rounds</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">{stats.averageRoundsPerGame || 0}</div>
          <div className="stat-label">Avg Rounds/Game</div>
        </div>
      </div>

      {summary.length > 0 && (
        <div className="card mb-3 history-summary-card">
          <div className="card-header">
            <h3>📅 Monthly Summary</h3>
          </div>
          <div className="history-summary-scroll">
            {summary.slice(0, 6).map((item) => (
              <div key={item.month} className="history-summary-chip">
                <div className="history-summary-label">{item.label}</div>
                <div className="history-summary-games">{item.gamesPlayed} games</div>
                <div className="history-summary-rounds">{item.totalRounds} rounds</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="history-filters" role="tablist" aria-label="History period">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            className={`filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {games.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎮</div>
          <h3>No games found</h3>
          <p>Start playing to build your history!</p>
          <Link to="/play" className="btn btn-primary mt-2">
            Start a Game
          </Link>
        </div>
      ) : (
        <div className="history-list">
          {games.map((game) => {
            const winner = getWinner(game.teams);
            const gameId = game._id || game.id;
            return (
              <div className="history-item" key={gameId}>
                <Link to={`/history/game/${gameId}`} className="history-item-main">
                  <div className="game-info">
                    <div className="game-info-body">
                      <div className="game-title">{game.gameName}</div>
                      <div className="game-meta">
                        <span>👥 {game.numberOfPlayers} players</span>
                        <span>🔄 {game.currentRound} rounds</span>
                        {winner && <span>🏆 {winner.name}</span>}
                      </div>
                      <div className="game-teams">
                        {(game.teams || []).map((team) => (
                          <span
                            key={team.teamId}
                            className={`team-chip ${winner?.teamId === team.teamId ? 'winner' : ''}`}
                          >
                            {team.name}: {team.totalScore}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="game-date">
                      {new Date(game.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                </Link>
                <div className="history-item-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm history-play-btn"
                    onClick={(e) => handlePlayAgain(e, game)}
                    title="Play again with same teams"
                  >
                    ▶ Play
                  </button>
                  <Link
                    to={`/history/game/${gameId}`}
                    className="btn btn-secondary btn-sm history-view-btn"
                  >
                    View
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex-center mt-3 gap-md history-pagination">
          <span className="text-muted history-pagination-text">
            Page {pagination.currentPage} of {pagination.totalPages} · {pagination.totalCount}{' '}
            games
          </span>
        </div>
      )}
    </div>
  );
};

export default HistoryDashboard;