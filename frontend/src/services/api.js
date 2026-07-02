import axios from 'axios';

/**
 * Central Axios instance for all API calls to the CanonVault backend.
 * The Authorization header is set dynamically after Firebase login
 * (see src/services/auth.js for token injection).
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Firebase token to every request if available
api.interceptors.request.use(async (config) => {
  const { getCurrentUserToken } = await import('./auth');
  const token = await getCurrentUserToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
