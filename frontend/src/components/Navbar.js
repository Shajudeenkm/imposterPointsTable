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

  // Detect if user is currently inside an active game
  const isInGame = location.pathname.startsWith('/game/');
  const currentGameId = isInGame ? location.pathname.split('/')[2] : null;

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' ? 'nav-link active' : 'nav-link';
    return location.pathname.startsWith(path) ? 'nav-link active' : 'nav-link';
  };

  // Intercept navigation while in a game
  const handleNavClick = (e, path) => {
    // Allow free navigation if not in a game, or if going to the same game page
    if (!isInGame || path === location.pathname) {
      setMenuOpen(false);
      return;
    }

    // Block navigation and show the exit modal
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

  // Logout also protected during a game
  const handleLogout = (e) => {
    if (isInGame) {
      e.preventDefault();
      setPendingPath('LOGOUT');
      setShowExitModal(true);
      setMenuOpen(false);
    } else {
      logout();
    }
  };

  const confirmLogout = async () => {
    // If they chose "End Game" during logout flow
    if (pendingPath === 'LOGOUT') {
      setShowExitModal(false);
      setPendingPath(null);
      logout();
      navigate('/login');
    }
  };

  // Special handler when modal is opened via Logout
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
    navigate('/login');
  };

  const handlePlayLaterLogout = () => {
    setShowExitModal(false);
    setPendingPath(null);
    logout();
    navigate('/login');
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
              <button onClick={handleLogout} className="nav-btn-logout">
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

      {/* ── Exit Game Modal ── */}
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
              {/* End Game */}
              <button
                className="btn btn-danger btn-block"
                onClick={isLogoutFlow ? handleEndAndLogout : handleEndGame}
                disabled={ending}
              >
                {ending ? 'Ending...' : '🏁 End Game'}
              </button>

              {/* Continue Playing */}
              <button
                className="btn btn-primary btn-block"
                onClick={handleContinue}
                disabled={ending}
              >
                🎮 Continue Playing
              </button>

              {/* Play Later / Leave without ending */}
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
    </>
  );
};

export default Navbar;