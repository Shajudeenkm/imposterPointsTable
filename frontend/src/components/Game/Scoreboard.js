import React from 'react';

const Scoreboard = ({ teams, rounds }) => {
  const sortedTeams = [...teams].sort((a, b) => b.totalScore - a.totalScore);

  const getRankClass = (index) => {
    if (index === 0) return 'rank-badge rank-1';
    if (index === 1) return 'rank-badge rank-2';
    if (index === 2) return 'rank-badge rank-3';
    return 'rank-badge rank-other';
  };

  const getScoreClass = (score) => {
    if (score > 0) return 'score-positive';
    if (score < 0) return 'score-negative';
    return 'score-zero';
  };

  const lastRound = rounds && rounds.length > 0 ? rounds[rounds.length - 1] : null;

  const getLastRoundScore = (teamId) => {
    if (!lastRound) return null;
    return lastRound.scores.find((s) => s.teamId === teamId) || null;
  };

  return (
    <div className="card scoreboard-card">
      <div className="card-header">
        <h3>📊 Scoreboard</h3>
        {rounds && <span className="round-indicator">Round {rounds.length}</span>}
      </div>

      {/* Desktop / tablet table */}
      <div className="scoreboard scoreboard-table-wrap">
        <table className="scoreboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              {lastRound && <th>Last</th>}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map((team, index) => {
              const lastRoundScore = getLastRoundScore(team.teamId);
              return (
                <tr key={team.teamId}>
                  <td>
                    <span className={getRankClass(index)}>{index + 1}</span>
                  </td>
                  <td>
                    <div className="scoreboard-team-cell">
                      <span className="scoreboard-team-name">{team.name}</span>
                      <span className="scoreboard-badges">
                        {lastRoundScore?.wasImposter && (
                          <span className="imposter-badge">🎭 Imposter</span>
                        )}
                        {lastRoundScore?.identifiedImposter && (
                          <span className="imposter-badge identified-badge">🔍 Found</span>
                        )}
                      </span>
                    </div>
                  </td>
                  {lastRound && (
                    <td>
                      <span className={getScoreClass(lastRoundScore?.roundScore || 0)}>
                        {lastRoundScore?.roundScore > 0 ? '+' : ''}
                        {lastRoundScore?.roundScore || 0}
                      </span>
                    </td>
                  )}
                  <td>
                    <span className={`${getScoreClass(team.totalScore)} scoreboard-total`}>
                      {team.totalScore}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="scoreboard-mobile">
        {sortedTeams.map((team, index) => {
          const lastRoundScore = getLastRoundScore(team.teamId);
          return (
            <div className="scoreboard-mobile-row" key={team.teamId}>
              <div className="scoreboard-mobile-left">
                <span className={getRankClass(index)}>{index + 1}</span>
                <div className="scoreboard-mobile-meta">
                  <span className="scoreboard-team-name">{team.name}</span>
                  <span className="scoreboard-badges">
                    {lastRoundScore?.wasImposter && (
                      <span className="imposter-badge">🎭</span>
                    )}
                    {lastRoundScore?.identifiedImposter && (
                      <span className="imposter-badge identified-badge">🔍</span>
                    )}
                  </span>
                </div>
              </div>
              <div className="scoreboard-mobile-right">
                {lastRound && (
                  <span className={`${getScoreClass(lastRoundScore?.roundScore || 0)} scoreboard-last`}>
                    {lastRoundScore?.roundScore > 0 ? '+' : ''}
                    {lastRoundScore?.roundScore || 0}
                  </span>
                )}
                <span className={`${getScoreClass(team.totalScore)} scoreboard-total`}>
                  {team.totalScore}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Scoreboard;