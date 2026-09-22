import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { historyAPI } from '../../services/api';

const HistoryDashboard = () => {
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
    const maxScore = Math.max(...teams.map(t => t.totalScore));
    return teams.find(t => t.totalScore === maxScore);
  };

  const filters = [
    { key: 'all', label: 'All Time' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' }
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading history...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>📜 Game History</h1>
        <p>Review your past games and performance</p>
      </div>

      {/* Stats Overview */}
      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
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

      {/* Monthly Summary */}
      {summary.length > 0 && (
        <div className="card mb-3">
          <div className="card-header">
            <h3>📅 Monthly Summary</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {summary.slice(0, 6).map(item => (
              <div key={item.month} style={{
                padding: '0.75rem 1rem',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                minWidth: '150px'
              }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.label}</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.25rem' }}>
                  {item.gamesPlayed} games
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {item.totalRounds} rounds
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="history-filters">
        {filters.map(f => (
          <button
            key={f.key}
            className={`filter-btn ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Game List */}
      {games.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎮</div>
          <h3>No games found</h3>
          <p>Start playing to build your history!</p>
          <Link to="/play" className="btn btn-primary mt-2">Start a Game</Link>
        </div>
      ) : (
        <div className="history-list">
          {games.map(game => {
            const winner = getWinner(game.teams);
            return (
              <Link 
                to={`/history/game/${game._id}`} 
                className="history-item" 
                key={game._id}
              >
                <div className="game-info">
                  <div>
                    <div className="game-title">{game.gameName}</div>
                    <div className="game-meta">
                      <span>👥 {game.numberOfPlayers} players</span>
                      <span>🔄 {game.currentRound} rounds</span>
                      {winner && <span>🏆 {winner.name}</span>}
                    </div>
                    <div className="game-teams">
                      {game.teams.map(team => (
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
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex-center mt-3 gap-md">
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>
            Page {pagination.currentPage} of {pagination.totalPages} · {pagination.totalCount} games
          </span>
        </div>
      )}
    </div>
  );
};

export default HistoryDashboard;