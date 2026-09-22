import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  getPublicProfile: (userId) => api.get(`/auth/public/${userId}`)
};

export const teamsAPI = {
  generate: (data) => api.post('/teams/generate', data),
  getCategories: () => api.get('/teams/categories'),
  getSuggestions: () => api.get('/teams/suggestions')
};

export const gamesAPI = {
  create: (data) => api.post('/games', data),
  getAll: (params) => api.get('/games', { params }),
  getById: (gameId) => api.get(`/games/${gameId}`),
  submitRound: (gameId, data) => api.post(`/games/${gameId}/rounds`, data),
  updateTeams: (gameId, data) => api.put(`/games/${gameId}/teams`, data),
  complete: (gameId) => api.put(`/games/${gameId}/complete`),
  updateSettings: (gameId, data) => api.put(`/games/${gameId}/settings`, data),
  reactivate: (gameId) => api.post(`/games/${gameId}/reactivate`),
  delete: (gameId) => api.delete(`/games/${gameId}`)
};

export const historyAPI = {
  getHistory: (params) => api.get('/history', { params }),
  getSummary: () => api.get('/history/summary'),
  getDaily: (date) => api.get(`/history/daily/${date}`)
};

export const favoritesAPI = {
  add: (data) => api.post('/favorites', data),
  getAll: (params) => api.get('/favorites', { params }),
  getCategories: () => api.get('/favorites/categories'),
  update: (favoriteId, data) => api.put(`/favorites/${favoriteId}`, data),
  remove: (favoriteId) => api.delete(`/favorites/${favoriteId}`)
};

export default api;