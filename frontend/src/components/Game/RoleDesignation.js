import React from 'react';

const RoleDesignation = ({
  teams,
  selectedImposters,
  onToggleImposter,
  maxImposters,
  imposterCount,
  onCountChange
}) => {
  const totalPlayers = teams.length;
  const maxAllowed = Math.max(1, Math.min(maxImposters || totalPlayers - 2, totalPlayers - 2));
  const countOptions = Array.from({ length: maxAllowed }, (_, i) => i + 1);
  const isLocked = totalPlayers <= 3;

  return (
    <div className="card role-designation">
      <div className="card-header">
        <h3>🎭 Select Imposter(s)</h3>
      </div>

      <div className="form-group">
        <label className="role-count-label">
          Number of Imposters
          {isLocked && (
            <span className="role-lock-hint"> · locked for 3 players</span>
          )}
        </label>
        <div className="count-selector" role="group" aria-label="Imposter count">
          {countOptions.map((n) => {
            const disabled = isLocked && n !== 1;
            return (
              <button
                key={n}
                type="button"
                className={`count-btn ${imposterCount === n ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && onCountChange(n)}
                disabled={disabled}
                aria-pressed={imposterCount === n}
              >
                {n}
              </button>
            );
          })}
        </div>
        <p className="role-hint">
          ℹ️ Min 2 innocents required · Max imposters: {maxAllowed}
        </p>
      </div>

      <p className="role-instruction">
        Select {imposterCount} team{imposterCount > 1 ? 's' : ''} to be the
        imposter{imposterCount > 1 ? 's' : ''}
      </p>

      <div className="role-selection-grid">
        {teams.map((team) => {
          const isSelected = selectedImposters.includes(team.teamId);
          const isDisabled = !isSelected && selectedImposters.length >= imposterCount;

          return (
            <button
              key={team.teamId}
              type="button"
              className={`role-option ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => !isDisabled && onToggleImposter(team.teamId)}
              disabled={isDisabled}
              aria-pressed={isSelected}
            >
              <span className="role-option-icon">{isSelected ? '🎭' : '👤'}</span>
              <span className="role-option-name">{team.name}</span>
            </button>
          );
        })}
      </div>

      <div className="role-selected-count">
        Selected:{' '}
        <strong>
          {selectedImposters.length} / {imposterCount}
        </strong>
      </div>
    </div>
  );
};

export default RoleDesignation;