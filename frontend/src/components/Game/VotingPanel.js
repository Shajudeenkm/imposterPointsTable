import React from 'react';

const VotingPanel = ({ teams, votes, onVoteChange, imposters }) => {
  const voters = teams.filter((t) => !imposters.includes(t.teamId));

  return (
    <div className="card voting-panel">
      <div className="card-header">
        <h3>🗳️ Cast Votes</h3>
      </div>
      <p className="voting-hint">
        Each non-imposter player votes for who they think the imposter is
      </p>
      <div className="voting-grid">
        {voters.map((voter) => (
          <div className="vote-row" key={voter.teamId}>
            <div className="voter-label">
              <span className="voter-name">{voter.name}</span>
              <span className="vote-arrow" aria-hidden="true">
                →
              </span>
            </div>
            <label className="sr-only" htmlFor={`vote-${voter.teamId}`}>
              {voter.name} votes for
            </label>
            <select
              id={`vote-${voter.teamId}`}
              className="form-control vote-select"
              value={votes[voter.teamId] || ''}
              onChange={(e) => onVoteChange(voter.teamId, e.target.value)}
            >
              <option value="">Select suspect...</option>
              {teams
                .filter((t) => t.teamId !== voter.teamId)
                .map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VotingPanel;