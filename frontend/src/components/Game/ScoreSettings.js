import React from 'react';

const ScoreSettings = ({ game, onUpdateSettings }) => {
  return (
    <div className="card">
      <div className="card-header">
        <h3>⚙️ Settings</h3>
      </div>

      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={game.floorLimitEnabled}
            onChange={(e) => onUpdateSettings({
              floorLimitEnabled: e.target.checked,
              floorLimitValue: game.floorLimitValue
            })}
            style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
          />
          <span style={{ textTransform: 'none', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
            Floor Limit
          </span>
        </label>
      </div>

      {game.floorLimitEnabled && (
        <div className="form-group">
          <label>Min Score</label>
          <input
            type="number"
            className="form-control"
            value={game.floorLimitValue}
            onChange={(e) => onUpdateSettings({
              floorLimitEnabled: true,
              floorLimitValue: parseInt(e.target.value) || 0
            })}
          />
        </div>
      )}

      <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text-secondary)' }}>Scoring Rules:</strong>
        <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', lineHeight: '1.8' }}>
          <li>Imposter not caught: <span className="text-success">+{game.numberOfPlayers - 2}</span> pts</li>
          <li>Imposter caught: <span className="text-danger">-{game.numberOfPlayers - 1}</span> pts</li>
          <li>Correct identifier: <span className="text-success">+1</span> pt</li>
        </ul>
      </div>
    </div>
  );
};

export default ScoreSettings;