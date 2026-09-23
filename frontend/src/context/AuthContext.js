import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback
} from 'react';
import { authAPI } from '../services/api';
import {
  isGuestModeFlag,
  setGuestModeFlag,
  clearGuestGame,
  getPendingGuestSave,
  clearPendingGuestSave,
  setPendingGuestSave,
  uploadGuestGameToCloud,
  clearGuestGame as clearGuestGameStorage
} from '../utils/guestGame';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGuest, setIsGuest] = useState(() => isGuestModeFlag());

  // Global auth modal (single popup for whole app — no /login page)
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register'
  const [authModalReason, setAuthModalReason] = useState(null); // 'guest-save' | null
  const [pendingSaveStatus, setPendingSaveStatus] = useState(null); // null | 'saving' | 'saved' | 'error'
  const [lastSavedGameId, setLastSavedGameId] = useState(null);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      setIsGuest(isGuestModeFlag());
      return;
    }

    try {
      const response = await authAPI.getProfile();
      setUser(response.data.user);
      setIsGuest(false);
      setGuestModeFlag(false);
    } catch (err) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const persistSession = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsGuest(false);
    setGuestModeFlag(false);
  };

  const flushPendingGuestGame = async () => {
    const pending = getPendingGuestSave();
    if (!pending) return { saved: false };

    setPendingSaveStatus('saving');
    try {
      const newId = await uploadGuestGameToCloud(pending);
      clearPendingGuestSave();
      clearGuestGameStorage();
      setLastSavedGameId(newId);
      setPendingSaveStatus('saved');
      return { saved: true, gameId: newId };
    } catch (err) {
      console.error('Guest save failed:', err);
      setPendingSaveStatus('error');
      return {
        saved: false,
        error: err.response?.data?.message || 'Failed to save game to cloud.'
      };
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authAPI.login({ email, password });
      persistSession(response.data.user, response.data.token);

      let saveResult = { saved: false };
      if (authModalReason === 'guest-save' || getPendingGuestSave()) {
        saveResult = await flushPendingGuestGame();
      }

      return { success: true, ...saveResult };
    } catch (err) {
      const message =
        err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (username, email, password) => {
    try {
      setError(null);
      const response = await authAPI.register({ username, email, password });
      persistSession(response.data.user, response.data.token);

      let saveResult = { saved: false };
      if (authModalReason === 'guest-save' || getPendingGuestSave()) {
        saveResult = await flushPendingGuestGame();
      }

      return { success: true, ...saveResult };
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.msg ||
        'Registration failed. Please try again.';
      setError(message);
      return { success: false, error: message };
    }
  };

  /** Direct session set (token already received) */
  const loginWithToken = async (userData, token) => {
    persistSession(userData, token);
    let saveResult = { saved: false };
    if (authModalReason === 'guest-save' || getPendingGuestSave()) {
      saveResult = await flushPendingGuestGame();
    }
    return { success: true, ...saveResult };
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
    setIsGuest(false);
    setGuestModeFlag(false);
    setPendingSaveStatus(null);
    setLastSavedGameId(null);
  };

  const startGuest = () => {
    if (user) return;
    setIsGuest(true);
    setGuestModeFlag(true);
  };

  const endGuest = () => {
    setIsGuest(false);
    setGuestModeFlag(false);
    clearGuestGame();
    clearPendingGuestSave();
  };

  const updateProfile = async (data) => {
    try {
      const response = await authAPI.updateProfile(data);
      setUser(response.data.user);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Update failed.';
      return { success: false, error: message };
    }
  };

  const openAuthModal = (options = {}) => {
    setAuthModalMode(options.mode === 'register' ? 'register' : 'login');
    setAuthModalReason(options.reason || null);
    setError(null);
    setPendingSaveStatus(null);
    if (options.pendingGame) {
      setPendingGuestSave(options.pendingGame);
    }
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setAuthModalReason(null);
    setError(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        loginWithToken,
        logout,
        updateProfile,
        clearError,
        isAuthenticated: !!user,
        isGuest,
        startGuest,
        endGuest,
        // Global modal
        authModalOpen,
        authModalMode,
        setAuthModalMode,
        authModalReason,
        openAuthModal,
        closeAuthModal,
        pendingSaveStatus,
        lastSavedGameId,
        setPendingSaveStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;