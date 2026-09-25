import React from 'react';

const VotingPanel = ({
  teams,
  votes,
  onVoteChange,
  imposters,
  votingMode = 'single',
  allowImposterVoting = false,
  requiredVotesPerPlayer = 1
}) => {
  const isMulti = votingMode === 'multi' && imposters.length >= 2 && teams.length >= 5;
  const numPicks = isMulti ? imposters.length : 1;
  const requiredPicks = Math.min(requiredVotesPerPlayer, numPicks);

  const voters = allowImposterVoting && teams.length >= 5
    ? teams
    : teams.filter((t) => !imposters.includes(t.teamId));

  const getVoterVotes = (voterId) => {
    const v = votes[voterId];
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
  };

  const handleSlotChange = (voterId, slotIndex, votedForId) => {
    const current = getVoterVotes(voterId);
    const next = [...current];
    while (next.length < numPicks) next.push('');
    next[slotIndex] = votedForId;
    onVoteChange(voterId, next);
  };

  return (
    <div className="card voting-panel">
      <div className="card-header">
        <h3>🗳️ Cast Votes</h3>
      </div>
      <p className="voting-hint">
        {isMulti
          ? `Each voter picks up to ${numPicks} suspects (${requiredPicks} required)`
          : 'Each voter picks exactly who they think the imposter is'}
        {allowImposterVoting && teams.length >= 5 && (
          <>
            <br />
            <span style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
              🎭 Imposters vote too{isMulti ? ' — their votes score ±1 like everyone else' : " — their votes don't affect their own score"}
            </span>
          </>
        )}
      </p>

      <div className="voting-grid">
        {voters.map((voter) => {
          const isImposterVoter = imposters.includes(voter.teamId);
          const voterVotes = getVoterVotes(voter.teamId);
          const filledCount = voterVotes.filter((v) => v && v !== '').length;

          return (
            <div className="vote-row" key={voter.teamId}>
              <div className="voter-label">
                <span className="voter-name">
                  {isImposterVoter && '🎭 '}
                  {voter.name}
                </span>
                <span className="vote-arrow" aria-hidden="true">→</span>
                {isMulti && (
                  <span className="vote-counter-inline">
                    {filledCount}/{numPicks}
                    {filledCount >= requiredPicks && <span style={{ color: 'var(--accent-success)', marginLeft: 4 }}>✓</span>}
                  </span>
                )}
              </div>

              <div className="vote-slots">
                {Array.from({ length: numPicks }, (_, slotIndex) => {
                  const currentPick = voterVotes[slotIndex] || '';
                  const otherPicks = voterVotes.filter((_, i) => i !== slotIndex && voterVotes[i]);
                  const availableOptions = teams.filter((t) => t.teamId !== voter.teamId && !otherPicks.includes(t.teamId));
                  const isRequired = slotIndex < requiredPicks;

                  return (
                    <React.Fragment key={slotIndex}>
                      <label className="sr-only" htmlFor={`vote-${voter.teamId}-${slotIndex}`}>
                        {voter.name} vote {slotIndex + 1}
                      </label>
                      <select
                        id={`vote-${voter.teamId}-${slotIndex}`}
                        className={`form-control vote-select ${!isRequired && !currentPick ? 'vote-select-optional' : ''}`}
                        value={currentPick}
                        onChange={(e) => handleSlotChange(voter.teamId, slotIndex, e.target.value)}
                      >
                        <option value="">
                          {isRequired
                            ? `Pick ${slotIndex + 1} (Required)...`
                            : `Pick ${slotIndex + 1} (Optional)...`}
                        </option>
                        {availableOptions.map((t) => (
                          <option key={t.teamId} value={t.teamId}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VotingPanel;