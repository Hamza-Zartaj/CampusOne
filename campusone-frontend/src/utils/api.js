import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
  
  verify2FA: (userId, token, rememberDevice = true) => 
    api.post('/auth/verify-2fa', { userId, token, rememberDevice }),
  
  getCurrentUser: () => 
    api.get('/auth/me'),
  
  logout: () => 
    api.post('/auth/logout'),
  
  setup2FA: () => 
    api.post('/auth/setup-2fa'),
  
  enable2FA: (token) => 
    api.post('/auth/enable-2fa', { token }),
  
  disable2FA: (password, token) => 
    api.post('/auth/disable-2fa', { password, token }),
};

export default api;
