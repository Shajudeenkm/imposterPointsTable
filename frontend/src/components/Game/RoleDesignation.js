import React from 'react';

const RoleDesignation = ({ teams, selectedImposters, onToggleImposter, maxImposters, imposterCount, onCountChange }) => {
  const totalPlayers = teams.length;
  const maxAllowed = Math.max(1, totalPlayers - 2); // minimum 2 innocents required
  const countOptions = Array.from({ length: maxAllowed }, (_, i) => i + 1);

  // If only 3 players, imposter count is locked at 1
  const isLocked = totalPlayers <= 3;

  return (
    <div className="card">
      <div className="card-header">
        <h3>🎭 Select Imposter(s)</h3>
      </div>

      {/* Imposter Count Selector */}
      <div className="form-group">
        <label>
          Number of Imposters {isLocked && '(locked for 3 players)'}
        </label>
        <div className="count-selector">
          {countOptions.map(n => (
            <button
              key={n}
              type="button"
              className={`count-btn ${imposterCount === n ? 'active' : ''} ${isLocked && n !== 1 ? 'disabled' : ''}`}
              onClick={() => !isLocked && onCountChange(n)}
              disabled={isLocked && n !== 1}
            >
              {n}
            </button>
          ))}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          ℹ️ Minimum 2 innocents required. Max imposters allowed: {maxAllowed}
        </p>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
        Select {imposterCount} team{imposterCount > 1 ? 's' : ''} to be the imposter{imposterCount > 1 ? 's' : ''}
      </p>

      <div className="role-selection-grid">
        {teams.map(team => {
          const isSelected = selectedImposters.includes(team.teamId);
          const isDisabled = !isSelected && selectedImposters.length >= imposterCount;

          return (
            <div
              key={team.teamId}
              className={`role-option ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => !isDisabled && onToggleImposter(team.teamId)}
            >
              {isSelected && '🎭 '}
              {team.name}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Selected: <strong style={{ color: 'var(--accent-primary)' }}>{selectedImposters.length} / {imposterCount}</strong>
      </div>
    </div>
  );
};

export default RoleDesignation;