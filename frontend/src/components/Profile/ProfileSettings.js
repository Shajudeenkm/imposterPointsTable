import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const ProfileSettings = () => {
  const { user, updateProfile } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [privacy, setPrivacy] = useState(user?.profilePrivacy || 'public');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSave = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    const result = await updateProfile({
      username: username !== user.username ? username : undefined,
      profilePrivacy: privacy
    });

    if (result.success) {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } else {
      setMessage({ type: 'error', text: result.error });
    }

    setLoading(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>⚙️ Profile Settings</h1>
        <p>Manage your account and privacy preferences</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'error' ? '⚠️' : '✅'} {message.text}
        </div>
      )}

      <div className="card mb-3">
        <div className="settings-section">
          <h3>👤 Account Information</h3>
          
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={30}
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              className="form-control"
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.6 }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Email cannot be changed
            </p>
          </div>

          <div className="form-group">
            <label>Member Since</label>
            <input
              type="text"
              className="form-control"
              value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : ''}
              disabled
              style={{ opacity: 0.6 }}
            />
          </div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="settings-section">
          <h3>🔒 Privacy Settings</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Control who can see your game statistics and profile
          </p>

          <div className="privacy-toggle">
            <div 
              className={`privacy-option ${privacy === 'public' ? 'selected' : ''}`}
              onClick={() => setPrivacy('public')}
            >
              <div className="option-icon">🌐</div>
              <div className="option-label">Public</div>
              <div className="option-desc">Anyone can view your stats</div>
            </div>
            
            <div 
              className={`privacy-option ${privacy === 'private' ? 'selected' : ''}`}
              onClick={() => setPrivacy('private')}
            >
              <div className="option-icon">🔒</div>
              <div className="option-label">Private</div>
              <div className="option-desc">Only you can see your stats</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="settings-section">
          <h3>📊 Your Statistics</h3>
          <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
            <div className="stat-card">
              <div className="stat-value">{user?.totalGamesPlayed || 0}</div>
              <div className="stat-label">Games Played</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{user?.totalWins || 0}</div>
              <div className="stat-label">Wins</div>
            </div>
          </div>
        </div>
      </div>

      <button 
        className="btn btn-primary btn-lg"
        onClick={handleSave}
        disabled={loading}
      >
        {loading ? 'Saving...' : '💾 Save Changes'}
      </button>
    </div>
  );
};

export default ProfileSettings;