import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import TeamSetup from './components/Teams/TeamSetup';
import GameSession from './components/Game/GameSession';
import HistoryDashboard from './components/History/HistoryDashboard';
import GameDetail from './components/History/GameDetail';
import FavoritesManager from './components/Favorites/FavoritesManager';
import ProfileSettings from './components/Profile/ProfileSettings';
import NotFound from './components/NotFound'; // Added NotFound import

// Dashboard / Home Component
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
              : 0}%
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
        <a href="/profile" className="action-card">
          <div className="action-icon">⚙️</div>
          <h3>Settings</h3>
          <p>Manage your profile</p>
        </a>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={
                <PrivateRoute><Dashboard /></PrivateRoute>
              } />
              <Route path="/play" element={
                <PrivateRoute><TeamSetup /></PrivateRoute>
              } />
              <Route path="/game/:gameId" element={
                <PrivateRoute><GameSession /></PrivateRoute>
              } />
              <Route path="/history" element={
                <PrivateRoute><HistoryDashboard /></PrivateRoute>
              } />
              <Route path="/history/game/:gameId" element={
                <PrivateRoute><GameDetail /></PrivateRoute>
              } />
              <Route path="/favorites" element={
                <PrivateRoute><FavoritesManager /></PrivateRoute>
              } />
              <Route path="/profile" element={
                <PrivateRoute><ProfileSettings /></PrivateRoute>
              } />
              
              {/* 404 Catch-All Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;