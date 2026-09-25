import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import AuthModal from './components/Auth/AuthModal';
import TeamSetup from './components/Teams/TeamSetup';
import GameSession from './components/Game/GameSession';
import HistoryDashboard from './components/History/HistoryDashboard';
import GameDetail from './components/History/GameDetail';
import FavoritesManager from './components/Favorites/FavoritesManager';
import ProfileSettings from './components/Profile/ProfileSettings';
import HelpPage from './components/HelpPage';
import NotFound from './components/NotFound';
import LandingPage from './components/LandingPage';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {user?.username}! 👋</h1>
        <p>Ready for another round of deduction and deception?</p>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-icon">🎮</div>
          <div className="stat-value">{user?.totalGamesPlayed || 0}</div>
          <div className="stat-label">Games Played</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-value">{user?.totalWins || 0}</div>
          <div className="stat-label">Total Wins</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-value">
            {user?.totalGamesPlayed > 0
              ? Math.round((user.totalWins / user.totalGamesPlayed) * 100)
              : 0}
            %
          </div>
          <div className="stat-label">Win Rate</div>
        </div>
      </div>

      <div className="quick-actions">
        <a href="/play" className="action-card">
          <div className="action-icon">🚀</div>
          <h3>New Game</h3>
          <p>Start a fresh game session</p>
        </a>
        <a href="/history" className="action-card">
          <div className="action-icon">📜</div>
          <h3>History</h3>
          <p>Review past games</p>
        </a>
        <a href="/favorites" className="action-card">
          <div className="action-icon">⭐</div>
          <h3>Favorites</h3>
          <p>Your saved sessions</p>
        </a>
        <a href="/help" className="action-card">
          <div className="action-icon">❓</div>
          <h3>Help & Rules</h3>
          <p>Learn how to play</p>
        </a>
      </div>
    </div>
  );
};

const RootRoute = () => {
  const { user, loading, isGuest } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (user) return <Dashboard />;
  if (isGuest) return <Navigate to="/play" replace />;
  return <LandingPage />;
};

function App() {
  // NO AuthProvider here — already in index.js
  // NO BrowserRouter here — already in index.js
  return (
    <div className="app-container">
      <Navbar />
      <AuthModal />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />

          <Route path="/" element={<RootRoute />} />

          <Route
            path="/play"
            element={
              <PrivateRoute allowGuest>
                <TeamSetup />
              </PrivateRoute>
            }
          />
          <Route
            path="/game/:gameId"
            element={
              <PrivateRoute allowGuest>
                <GameSession />
              </PrivateRoute>
            }
          />

          <Route
            path="/history"
            element={
              <PrivateRoute>
                <HistoryDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/history/game/:gameId"
            element={
              <PrivateRoute>
                <GameDetail />
              </PrivateRoute>
            }
          />
          <Route
            path="/favorites"
            element={
              <PrivateRoute>
                <FavoritesManager />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfileSettings />
              </PrivateRoute>
            }
          />

          <Route path="/help" element={<HelpPage />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;