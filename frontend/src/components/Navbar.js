import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { gamesAPI } from '../services/api';

const Navbar = () => {
  const { user, logout, isAuthenticated, isGuest, endGuest, openAuthModal } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingPath, setPendingPath] = useState(null);
  const [ending, setEnding] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isInGame = location.pathname.startsWith('/game/');
  const currentGameId = isInGame ? location.pathname.split('/')[2] : null;
  const isGuestGame = currentGameId === 'guest';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' ? 'nav-link active' : 'nav-link';
    return location.pathname.startsWith(path) ? 'nav-link active' : 'nav-link';
  };

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

  const handleEndGame = async () => {
    if (!currentGameId || isGuestGame) {
      setShowExitModal(false);
      navigate(pendingPath || '/');
      setPendingPath(null);
      return;
    }

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

  const handleContinue = () => {
    setShowExitModal(false);
    setPendingPath(null);
  };

  const handlePlayLater = () => {
    setShowExitModal(false);
    navigate(pendingPath || '/');
    setPendingPath(null);
  };

  const handleLogoutClick = (e) => {
    e.preventDefault();
    setMenuOpen(false);

    if (isGuest) {
      endGuest();
      navigate('/');
      return;
    }

    if (isInGame) {
      setPendingPath('LOGOUT');
      setShowExitModal(true);
      return;
    }
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/');
  };

  const cancelLogout = () => setShowLogoutConfirm(false);

  const handleEndAndLogout = async () => {
    if (currentGameId && !isGuestGame) {
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
        <Link
          to={isGuest ? '/play' : '/'}
          className="navbar-brand"
          onClick={(e) => handleNavClick(e, isGuest ? '/play' : '/')}
        >
          <img
            src="/Image/logo-icon.png"
            alt="Imposter Game"
            className="navbar-logo-img"
            width={32}
            height={32}
          />
          <span className="brand-text">Imposter Game</span>
        </Link>

        <button
          type="button"
          className={`hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        {menuOpen && (
          <button
            type="button"
            className="nav-backdrop"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
        )}

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
              <Link to="/help" className={isActive('/help')} onClick={(e) => handleNavClick(e, '/help')}>
                Help
              </Link>
              <Link to="/profile" className={isActive('/profile')} onClick={(e) => handleNavClick(e, '/profile')}>
                <span className="nav-avatar">{user?.username?.charAt(0)?.toUpperCase()}</span>
                <span className="nav-username">{user?.username}</span>
              </Link>
              <button type="button" onClick={handleLogoutClick} className="nav-btn-logout">
                Logout
              </button>
            </>
          ) : isGuest ? (
            <>
              <Link to="/play" className={isActive('/play')} onClick={(e) => handleNavClick(e, '/play')}>
                Guest Play
              </Link>
              <Link to="/help" className={isActive('/help')} onClick={(e) => handleNavClick(e, '/help')}>
                Help
              </Link>
              <button
                type="button"
                className="nav-link nav-link-outline"
                onClick={() => {
                  setMenuOpen(false);
                  openAuthModal({ mode: 'login' });
                }}
              >
                Sign In
              </button>
              <button type="button" onClick={handleLogoutClick} className="nav-btn-logout">
                Leave Guest
              </button>
            </>
          ) : (
            <>
              <Link to="/help" className={isActive('/help')}>
                Help
              </Link>
              <button
                type="button"
                className="nav-link"
                onClick={() => {
                  setMenuOpen(false);
                  openAuthModal({ mode: 'login' });
                }}
              >
                Login
              </button>
              <button
                type="button"
                className="nav-link nav-link-cta"
                onClick={() => {
                  setMenuOpen(false);
                  openAuthModal({ mode: 'register' });
                }}
              >
                Register
              </button>
            </>
          )}
        </div>
      </nav>

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
              {!isGuestGame && (
                <button
                  type="button"
                  className="btn btn-danger btn-block"
                  onClick={isLogoutFlow ? handleEndAndLogout : handleEndGame}
                  disabled={ending}
                >
                  {ending ? 'Ending...' : '🏁 End Game'}
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={handleContinue}
                disabled={ending}
              >
                🎮 Continue Playing
              </button>
              <button
                type="button"
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
            <div className="exit-modal-actions">
              <button type="button" className="btn btn-danger btn-block" onClick={confirmLogout}>
                🚪 Yes, Log Out
              </button>
              <button type="button" className="btn btn-secondary btn-block" onClick={cancelLogout}>
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