import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  // Where to send the user: previous page if available, otherwise home/play
  const getFallbackPath = () => {
    // document.referrer is cross-origin unsafe sometimes; prefer history length
    if (window.history.length > 1) {
      return null; // signal: use navigate(-1)
    }
    return '/play';
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          const fallback = getFallbackPath();
          if (fallback === null) {
            navigate(-1);
          } else {
            navigate(fallback, { replace: true });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/play', { replace: true });
    }
  };

  const handleGoHome = () => {
    navigate('/play', { replace: true });
  };

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem'
      }}
    >
      <div style={{ fontSize: '5rem', marginBottom: '0.5rem' }}>🔍</div>
      <h1 style={{ fontSize: '3rem', margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>404</h1>
      <h2 style={{ margin: '0 0 1rem', color: 'var(--text-primary)' }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: '420px', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        Oops! The page you're looking for doesn't exist or may have been moved.
        You'll be redirected back automatically.
      </p>

      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color, #333)',
          borderRadius: '12px',
          padding: '1.25rem 2rem',
          marginBottom: '1.5rem',
          minWidth: '220px'
        }}
      >
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
          Auto-redirect in
        </div>
        <div
          style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: 'var(--accent-primary, #6c63ff)',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {countdown}s
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: '100%',
          maxWidth: '280px',
          height: '6px',
          background: 'var(--border-color, #333)',
          borderRadius: '3px',
          overflow: 'hidden',
          marginBottom: '2rem'
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${(countdown / 10) * 100}%`,
            background: 'var(--accent-primary, #6c63ff)',
            borderRadius: '3px',
            transition: 'width 1s linear'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={handleGoBack}>
          ← Go Back Now
        </button>
        <button className="btn btn-secondary" onClick={handleGoHome}>
          🏠 New Game
        </button>
      </div>
    </div>
  );
};

export default NotFound;