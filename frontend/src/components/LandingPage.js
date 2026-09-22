import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const LandingPage = () => {
  const { login } = useAuth();
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);
  
  // Form State
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(''); // Clear error when typing
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLoginView) {
        const res = await authAPI.login({ email: formData.email, password: formData.password });
        login(res.data.user, res.data.token);
      } else {
        const res = await authAPI.register(formData);
        login(res.data.user, res.data.token);
      }
    } catch (err) {
      setError(err.response?.data?.message || `${isLoginView ? 'Login' : 'Registration'} failed. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setError('');
    setFormData({ username: '', email: '', password: '' });
  };

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🎭</div>
      <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
        Imposter Game Manager
      </h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '600px', marginBottom: '2.5rem', lineHeight: '1.6' }}>
        The ultimate platform to track scores, manage teams, and find out who the real imposter is. 
        Create your first game session in seconds.
      </p>
      
      <button 
        onClick={() => setShowModal(true)}
        style={{
          background: 'linear-gradient(to right, #EF4765, #FF5A75)',
          color: 'white',
          border: 'none',
          padding: '1rem 2.5rem',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          borderRadius: '50px',
          cursor: 'pointer',
          boxShadow: '0 10px 25px rgba(239, 71, 101, 0.4)',
          transition: 'transform 0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        Play Now 🚀
      </button>

      {/* AUTH MODAL OVERLAY */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 9999, padding: '1rem', backdropFilter: 'blur(5px)'
        }}
        onClick={() => setShowModal(false)}
        >
          {/* MODAL CARD (Matches Screenshot) */}
          <div style={{
            backgroundColor: '#1E2532',
            borderRadius: '20px',
            padding: '2.5rem 2rem',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            color: '#ffffff',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{ 
                margin: '0 0 0.5rem 0', 
                fontSize: '1.8rem', 
                background: 'linear-gradient(to right, #EF4765, #9b51e0)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: '800'
              }}>
                {isLoginView ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p style={{ color: '#8B949E', margin: 0, fontSize: '0.95rem' }}>
                {isLoginView ? 'Sign in to continue your games' : 'Register to start tracking scores'}
              </p>
            </div>

            {/* Error Box (Matches Screenshot) */}
            {error && (
              <div style={{
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
              }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {!isLoginView && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#8B949E', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                    USERNAME
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%', boxSizing: 'border-box', backgroundColor: '#11161D', border: '1px solid #2A3441',
                      borderRadius: '8px', padding: '0.85rem 1rem', color: '#ffffff', fontSize: '1rem', outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#EF4765'}
                    onBlur={(e) => e.target.style.borderColor = '#2A3441'}
                  />
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#8B949E', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="leo@gmail.com"
                  style={{
                    width: '100%', boxSizing: 'border-box', backgroundColor: '#11161D', border: '1px solid #2A3441',
                    borderRadius: '8px', padding: '0.85rem 1rem', color: '#ffffff', fontSize: '1rem', outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#EF4765'}
                  onBlur={(e) => e.target.style.borderColor = '#2A3441'}
                />
              </div>

              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#8B949E', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                  PASSWORD
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••"
                  style={{
                    width: '100%', boxSizing: 'border-box', backgroundColor: '#11161D', border: '1px solid #2A3441',
                    borderRadius: '8px', padding: '0.85rem 1rem', color: '#ffffff', fontSize: '1rem', outline: 'none', letterSpacing: '0.1em'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#EF4765'}
                  onBlur={(e) => e.target.style.borderColor = '#2A3441'}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
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
                {loading ? 'Processing...' : (
                  <>
                    <span style={{ fontSize: '1.1rem' }}>{isLoginView ? '🔐' : '📝'}</span> 
                    {isLoginView ? 'Sign In' : 'Sign Up'}
                  </>
                )}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#8B949E' }}>
              {isLoginView ? "Don't have an account? " : "Already have an account? "}
              <button 
                onClick={toggleView}
                style={{ 
                  background: 'none', border: 'none', padding: 0, 
                  color: '#EF4765', fontWeight: 'bold', cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                {isLoginView ? 'Create one' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;