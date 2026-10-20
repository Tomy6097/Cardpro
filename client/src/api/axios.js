import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cardpro_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong.';

    if (error.response?.status === 401) {
      localStorage.removeItem('cardpro_token');
      localStorage.removeItem('cardpro_user');
      if (window.location.pathname !== '/login' && !window.location.pathname.startsWith('/event/')) {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      toast.error('Access denied.');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again.');
    }

    return Promise.reject({ ...error, message });
  }
);

export default api;
