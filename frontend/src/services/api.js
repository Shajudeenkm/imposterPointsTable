import axios from 'axios';

// Phase 2 hard-cut: all calls go to /api/v1
// Local (package.json proxy): leave REACT_APP_API_URL unset → uses '/api/v1'
// Production (Vercel): set REACT_APP_API_URL=https://<your-render-host>/api/v1
const API_BASE_URL = (process.env.REACT_APP_API_URL || '/api/v1').replace(/\/+$/, '');

const REQUEST_TIMEOUT_MS = 20000; // 20s — Render cold starts can be slow

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' }
});

// ── Helpers ───────────────────────────────────────────────────────────────
const isBrowser = typeof window !== 'undefined';

const safeGetToken = () => {
  try {
    return isBrowser ? localStorage.getItem('token') : null;
  } catch {
    return null;
  }
};

const clearAuthStorage = () => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch {
    /* ignore */
  }
};

export const friendlyErrorMessage = (error) => {
  if (!error) return 'Unknown error.';
  if (error.code === 'ECONNABORTED') return 'The server is taking too long to respond. Please try again.';
  if (error.message === 'Network Error') {
    return 'Cannot reach the server. Check your internet connection or try again shortly.';
  }
  const status = error.response?.status;
  const serverMsg = error.response?.data?.message;
  if (serverMsg) return serverMsg;
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission for this action.';
  if (status === 404) return 'Resource not found.';
  if (status === 410) return 'This API endpoint is retired.';
  if (status === 413) return 'Request too large.';
  if (status === 429) return 'Too many requests. Please slow down and try again.';
  if (status >= 500) return 'Server error. Please try again in a moment.';
  return error.message || 'Request failed.';
};

// ── Request interceptor ───────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = safeGetToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ──────────────────────────────────────────────────
let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if (status === 401 && isBrowser) {
      clearAuthStorage();
      // After logout / bad token → landing page (not /login)
      if (!isRedirecting && window.location.pathname !== '/') {
        isRedirecting = true;
        // Defer so current call stack completes
        setTimeout(() => {
          window.location.href = '/';
        }, 0);
      }
    }

    // Attach a user-friendly message for UI layers
    error.friendlyMessage = friendlyErrorMessage(error);
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  getPublicProfile: (userId) => api.get(`/auth/public/${encodeURIComponent(userId)}`)
};

// ── Teams ─────────────────────────────────────────────────────────────────
export const teamsAPI = {
  generate: (data) => api.post('/teams/generate', data),
  getCategories: () => api.get('/teams/categories'),
  getSuggestions: () => api.get('/teams/suggestions')
};

// ── Games ─────────────────────────────────────────────────────────────────
export const gamesAPI = {
  create: (data) => api.post('/games', data),
  getAll: (params) => api.get('/games', { params }),
  getById: (gameId) => api.get(`/games/${encodeURIComponent(gameId)}`),
  submitRound: (gameId, data) => api.post(`/games/${encodeURIComponent(gameId)}/rounds`, data),
  updateTeams: (gameId, data) => api.put(`/games/${encodeURIComponent(gameId)}/teams`, data),
  complete: (gameId) => api.put(`/games/${encodeURIComponent(gameId)}/complete`),
  updateSettings: (gameId, data) => api.put(`/games/${encodeURIComponent(gameId)}/settings`, data),
  reactivate: (gameId) => api.post(`/games/${encodeURIComponent(gameId)}/reactivate`),
  delete: (gameId) => api.delete(`/games/${encodeURIComponent(gameId)}`)
};

// ── History ───────────────────────────────────────────────────────────────
export const historyAPI = {
  getHistory: (params) => api.get('/history', { params }),
  getSummary: () => api.get('/history/summary'),
  getDaily: (date) => api.get(`/history/daily/${encodeURIComponent(date)}`)
};

// ── Favorites ─────────────────────────────────────────────────────────────
export const favoritesAPI = {
  add: (data) => api.post('/favorites', data),
  getAll: (params) => api.get('/favorites', { params }),
  getCategories: () => api.get('/favorites/categories'),
  update: (favoriteId, data) => api.put(`/favorites/${encodeURIComponent(favoriteId)}`, data),
  remove: (favoriteId) => api.delete(`/favorites/${encodeURIComponent(favoriteId)}`)
};

// ── Utility: check backend health ─────────────────────────────────────────
export const healthAPI = {
  check: () => api.get('/health')
};

export default api;