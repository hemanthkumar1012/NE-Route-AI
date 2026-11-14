import axios from 'axios';

// In local development, Vite proxies /api to FastAPI. In Docker, Nginx does
// the same. A deployed frontend can override this with VITE_API_URL when the
// API is hosted on a separate origin.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ne-route-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
