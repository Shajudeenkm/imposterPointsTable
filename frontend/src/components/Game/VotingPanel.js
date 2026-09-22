import React from 'react';

const VotingPanel = ({ teams, votes, onVoteChange, imposters }) => {
  // Only non-imposter teams vote
  const voters = teams.filter(t => !imposters.includes(t.teamId));

  return (
    <div className="card">
      <div className="card-header">
        <h3>🗳️ Cast Votes</h3>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
        Each non-imposter player votes for who they think the imposter is
      </p>
      <div className="voting-grid">
        {voters.map(voter => (
          <div className="vote-row" key={voter.teamId}>
            <span className="voter-name">{voter.name}</span>
            <span className="vote-arrow">→</span>
            <select
              className="form-control"
              value={votes[voter.teamId] || ''}
              onChange={(e) => onVoteChange(voter.teamId, e.target.value)}
            >
              <option value="">Select suspect...</option>
              {teams
                .filter(t => t.teamId !== voter.teamId) // Can't vote for yourself
                .map(t => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.name}
                  </option>
                ))
              }
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VotingPanel;