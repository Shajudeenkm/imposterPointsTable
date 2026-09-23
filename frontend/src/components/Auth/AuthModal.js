import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Single app-wide login/signup popup.
 * Open via openAuthModal() from AuthContext (Navbar, Landing, Guest save, etc.)
 */
const AuthModal = () => {
  const navigate = useNavigate();
  const {
    authModalOpen,
    closeAuthModal,
    authModalMode,
    setAuthModalMode,
    authModalReason,
    login,
    register,
    error,
    clearError,
    pendingSaveStatus,
    lastSavedGameId
  } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (authModalOpen) {
      setFormData({ username: '', email: '', password: '' });
      setLocalError('');
      clearError();
    }
  }, [authModalOpen, authModalMode]); 

  if (!authModalOpen) return null;

  const isLoginView = authModalMode !== 'register';
  const displayError = localError || error;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setLocalError('');
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLoading(true);

    try {
      let result;
      if (isLoginView) {
        result = await login(formData.email, formData.password);
      } else {
        result = await register(
          formData.username,
          formData.email,
          formData.password
        );
      }

      if (!result.success) {
        setLocalError(result.error || 'Something went wrong.');
        setLoading(false);
        return;
      }

      closeAuthModal();
      setLoading(false);

      if (result.saved && result.gameId) {
        navigate(`/history/game/${result.gameId}`);
        return;
      }

      if (authModalReason === 'guest-save' && result.saved === false && result.error) {
        navigate('/play');
        return;
      }

      navigate('/');
    } catch (err) {
      setLocalError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const toggleView = () => {
    setAuthModalMode(isLoginView ? 'register' : 'login');
    setLocalError('');
    clearError();
    setFormData({ username: '', email: '', password: '' });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: '1rem',
        backdropFilter: 'blur(5px)'
      }}
      onClick={() => !loading && closeAuthModal()}
    >
      <div
        style={{
          backgroundColor: '#1E2532',
          borderRadius: '20px',
          padding: '2.5rem 2rem',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2
            style={{
              margin: '0 0 0.5rem 0',
              fontSize: '1.8rem',
              background: 'linear-gradient(to right, #EF4765, #9b51e0)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: '800'
            }}
          >
            {isLoginView ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ color: '#8B949E', margin: 0, fontSize: '0.95rem' }}>
            {authModalReason === 'guest-save'
              ? 'Sign in to save your guest game to the cloud'
              : isLoginView
                ? 'Sign in to continue your games'
                : 'Register to start tracking scores'}
          </p>
        </div>

        {authModalReason === 'guest-save' && (
          <div
            style={{
              backgroundColor: 'rgba(155, 81, 224, 0.12)',
              border: '1px solid rgba(155, 81, 224, 0.35)',
              color: '#C9A0FF',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              fontSize: '0.85rem'
            }}
          >
            ☁️ Your completed guest game will be saved automatically after{' '}
            {isLoginView ? 'sign in' : 'sign up'}.
          </div>
        )}

        {pendingSaveStatus === 'saving' && (
          <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
            Saving your game to the cloud…
          </div>
        )}

        {displayError && (
          <div
            style={{
              backgroundColor: 'rgba(239, 71, 101, 0.1)',
              border: '1px solid rgba(239, 71, 101, 0.3)',
              color: '#EF4765',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: '500'
            }}
          >
            ⚠️ {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLoginView && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: '#8B949E',
                  marginBottom: '0.5rem',
                  letterSpacing: '0.05em'
                }}
              >
                USERNAME
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                minLength={3}
                maxLength={30}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#EF4765')}
                onBlur={(e) => (e.target.style.borderColor = '#2A3441')}
              />
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: '#8B949E',
                marginBottom: '0.5rem',
                letterSpacing: '0.05em'
              }}
            >
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="you@email.com"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#EF4765')}
              onBlur={(e) => (e.target.style.borderColor = '#2A3441')}
            />
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: '#8B949E',
                marginBottom: '0.5rem',
                letterSpacing: '0.05em'
              }}
            >
              PASSWORD
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="••••••"
              style={{ ...inputStyle, letterSpacing: '0.1em' }}
              onFocus={(e) => (e.target.style.borderColor = '#EF4765')}
              onBlur={(e) => (e.target.style.borderColor = '#2A3441')}
            />
          </div>

          <button
            type="submit"
            disabled={loading || pendingSaveStatus === 'saving'}
            style={{
              width: '100%',
              background: 'linear-gradient(to right, #EF4765, #FF5A75)',
              color: 'white',
              border: 'none',
              padding: '0.9rem',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 14px 0 rgba(239, 71, 101, 0.39)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {loading || pendingSaveStatus === 'saving' ? (
              'Processing...'
            ) : (
              <>
                <span style={{ fontSize: '1.1rem' }}>
                  {isLoginView ? '🔐' : '📝'}
                </span>
                {isLoginView ? 'Sign In' : 'Sign Up'}
              </>
            )}
          </button>
        </form>

        <div
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.9rem',
            color: '#8B949E'
          }}
        >
          {isLoginView ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={toggleView}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#EF4765',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            {isLoginView ? 'Create one' : 'Sign in'}
          </button>
        </div>

        {lastSavedGameId && pendingSaveStatus === 'saved' && (
          <p
            style={{
              marginTop: '1rem',
              fontSize: '0.8rem',
              color: '#8B949E',
              textAlign: 'center'
            }}
          >
            Game saved.
          </p>
        )}
      </div>
    </div>
  );
};

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  backgroundColor: '#11161D',
  border: '1px solid #2A3441',
  borderRadius: '8px',
  padding: '0.85rem 1rem',
  color: '#ffffff',
  fontSize: '1rem',
  outline: 'none'
};

export default AuthModal;