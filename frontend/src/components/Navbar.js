import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { gamesAPI } from '../services/api';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);
  const [ending, setEnding] = useState(false);

  // NEW: Logout confirmation modal (always shown on Logout click)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Detect if user is currently inside an active game
  const isInGame = location.pathname.startsWith('/game/');
  const currentGameId = isInGame ? location.pathname.split('/')[2] : null;

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' ? 'nav-link active' : 'nav-link';
    return location.pathname.startsWith(path) ? 'nav-link active' : 'nav-link';
  };

  // Intercept navigation while in a game
  const handleNavClick = (e, path) => {
    if (!isInGame || path === location.pathname) {
      setMenuOpen(false);
      return;
    }

    e.preventDefault();
    setPendingPath(path);
    setShowExitModal(true);
    setMenuOpen(false);
  };

  // Option 1: End the game, then leave
  const handleEndGame = async () => {
    if (!currentGameId) return;
    setEnding(true);
    try {
      await gamesAPI.complete(currentGameId);
    } catch (err) {
      console.error('Failed to end game:', err);
    } finally {
      setEnding(false);
      setShowExitModal(false);
      navigate(pendingPath || '/');
      setPendingPath(null);
    }
  };

  // Option 2: Stay and keep playing
  const handleContinue = () => {
    setShowExitModal(false);
    setPendingPath(null);
  };

  // Option 3: Leave without ending (Play Later — game stays active)
  const handlePlayLater = () => {
    setShowExitModal(false);
    navigate(pendingPath || '/');
    setPendingPath(null);
  };

  // ── LOGOUT FLOW ──────────────────────────────────────────
  // Always show confirmation first
  const handleLogoutClick = (e) => {
    e.preventDefault();
    setMenuOpen(false);

    // If currently in a game, use the richer exit modal (End / Continue / Logout & Play Later)
    if (isInGame) {
      setPendingPath('LOGOUT');
      setShowExitModal(true);
      return;
    }

    // Otherwise show simple logout confirmation
    setShowLogoutConfirm(true);
  };

  // Confirm simple logout (not in game)
  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/');
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // End game then logout (from in-game exit modal)
  const handleEndAndLogout = async () => {
    if (currentGameId) {
      setEnding(true);
      try {
        await gamesAPI.complete(currentGameId);
      } catch (err) {
        console.error(err);
      }
      setEnding(false);
    }
    setShowExitModal(false);
    setPendingPath(null);
    logout();
    navigate('/');
  };

  // Logout without ending game (Play Later)
  const handlePlayLaterLogout = () => {
    setShowExitModal(false);
    setPendingPath(null);
    logout();
    navigate('/');
  };

  const isLogoutFlow = pendingPath === 'LOGOUT';

  return (
    <>
      <nav className="navbar">
        {/* Brand */}
        <Link
          to="/"
          className="navbar-brand"
          onClick={(e) => handleNavClick(e, '/')}
        >
          <span className="logo-icon">🎭</span>
          <span className="brand-text">Imposter Game</span>
        </Link>

        {/* Hamburger button (mobile) */}
        {isAuthenticated && (
          <button
            className={`hamburger ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        )}

        {/* Links */}
        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {isAuthenticated ? (
            <>
              <Link to="/" className={isActive('/')} onClick={(e) => handleNavClick(e, '/')}>
                Home
              </Link>
              <Link to="/play" className={isActive('/play')} onClick={(e) => handleNavClick(e, '/play')}>
                Play
              </Link>
              <Link to="/history" className={isActive('/history')} onClick={(e) => handleNavClick(e, '/history')}>
                History
              </Link>
              <Link to="/favorites" className={isActive('/favorites')} onClick={(e) => handleNavClick(e, '/favorites')}>
                Favorites
              </Link>
              <Link to="/profile" className={isActive('/profile')} onClick={(e) => handleNavClick(e, '/profile')}>
                <span className="nav-avatar">{user?.username?.charAt(0)?.toUpperCase()}</span>
                {user?.username}
              </Link>
              <button onClick={handleLogoutClick} className="nav-btn-logout">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={isActive('/login')} onClick={() => setMenuOpen(false)}>
                Login
              </Link>
              <Link to="/register" className={`nav-link nav-link-cta`} onClick={() => setMenuOpen(false)}>
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Exit Game Modal (nav away / logout while in game) ── */}
      {showExitModal && (
        <div className="modal-overlay" onClick={handleContinue}>
          <div className="modal-content exit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="exit-modal-icon">⚠️</div>
            <h2>You have a game in progress!</h2>
            <p className="exit-modal-desc">
              {isLogoutFlow
                ? 'You are about to log out while a game is still active. What would you like to do?'
                : 'You are currently playing a game. What would you like to do?'}
            </p>

            <div className="exit-modal-actions">
              <button
                className="btn btn-danger btn-block"
                onClick={isLogoutFlow ? handleEndAndLogout : handleEndGame}
                disabled={ending}
              >
                {ending ? 'Ending...' : '🏁 End Game'}
              </button>

              <button
                className="btn btn-primary btn-block"
                onClick={handleContinue}
                disabled={ending}
              >
                🎮 Continue Playing
              </button>

              <button
                className="btn btn-secondary btn-block"
                onClick={isLogoutFlow ? handlePlayLaterLogout : handlePlayLater}
                disabled={ending}
              >
                ⏸️ {isLogoutFlow ? 'Logout & Play Later' : 'Play Later'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── NEW: Logout Confirmation Modal (when NOT in a game) ── */}
      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={cancelLogout}>
          <div
            className="modal-content exit-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px', textAlign: 'center' }}
          >
            <div className="exit-modal-icon">🚪</div>
            <h2>Log out?</h2>
            <p className="exit-modal-desc">
              Are you sure you want to log out of your account?
            </p>

            <div className="exit-modal-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                className="btn btn-danger btn-block"
                onClick={confirmLogout}
              >
                🚪 Yes, Log Out
              </button>
              <button
                className="btn btn-secondary btn-block"
                onClick={cancelLogout}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;