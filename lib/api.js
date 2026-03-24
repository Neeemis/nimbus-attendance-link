import axios from 'axios';

// For Next.js APIs on the same host, use relative path
const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (typeof window !== 'undefined') {
    const targetUserStr = localStorage.getItem('targetUser');
    if (targetUserStr) {
      try {
        const targetUser = JSON.parse(targetUserStr);
        if (targetUser && targetUser.id) {
          config.params = config.params || {};
          config.params.userId = targetUser.id;
        }
      } catch (e) {
        // ignore
      }
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
