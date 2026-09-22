import React from 'react';

const Scoreboard = ({ teams, rounds }) => {
  // Sort teams by total score (descending)
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

  return (
    <div className="card">
      <div className="card-header">
        <h3>📊 Scoreboard</h3>
        {rounds && <span className="round-indicator">Round {rounds.length}</span>}
      </div>

      <div className="scoreboard">
        <table className="scoreboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              {lastRound && <th>Last Round</th>}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map((team, index) => {
              const lastRoundScore = lastRound 
                ? lastRound.scores.find(s => s.teamId === team.teamId)
                : null;

              return (
                <tr key={team.teamId}>
                  <td>
                    <span className={getRankClass(index)}>
                      {index + 1}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{team.name}</span>
                    {lastRoundScore?.wasImposter && (
                      <span className="imposter-badge" style={{ marginLeft: '8px' }}>
                        🎭 Imposter
                      </span>
                    )}
                    {lastRoundScore?.identifiedImposter && (
                      <span className="imposter-badge identified-badge" style={{ marginLeft: '8px' }}>
                        🔍 Found it
                      </span>
                    )}
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
                    <span className={getScoreClass(team.totalScore)} style={{ fontSize: '1.1rem' }}>
                      {team.totalScore}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Scoreboard;