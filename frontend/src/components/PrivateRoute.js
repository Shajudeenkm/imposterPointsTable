import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * allowGuest: if true, guest-mode users can access (e.g. /play, /game/:id)
 * Unauthenticated non-guests always go to landing (/) — never a separate /login page
 */
const PrivateRoute = ({ children, allowGuest = false }) => {
  const { isAuthenticated, isGuest, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) return children;
  if (allowGuest && isGuest) return children;

  return <Navigate to="/" replace />;
};

export default PrivateRoute;