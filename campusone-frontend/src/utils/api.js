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
      // Only redirect to login if we're not already on the login page
      // and if the error is due to an invalid/expired token (not wrong credentials)
      const currentPath = window.location.pathname;
      const isLoginError = error.config?.url?.includes('/auth/login');
      
      if (currentPath !== '/login' && !isLoginError) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
  
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
  
  completeFirstTimeSetup: (data) => 
    api.post('/auth/first-time-setup', data),
  
  skip2FASetup: () => 
    api.post('/auth/skip-2fa-setup'),
  
  setupEmail2FA: () => 
    api.post('/auth/setup-email-2fa'),
  
  enableEmail2FA: (otp) => 
    api.post('/auth/enable-email-2fa', { otp }),
  
  sendLoginOTP: (userId) => 
    api.post('/auth/send-login-otp', { userId }),
  
  verifyEmailOTP: (userId, otp, rememberDevice = true) => 
    api.post('/auth/verify-email-otp', { userId, otp, rememberDevice }),
  
  forgotPassword: (email) => 
    api.post('/auth/forgot-password', { email }),
  
  verifyResetCode: (userId, code) => 
    api.post('/auth/verify-reset-code', { userId, code }),
  
  resetPassword: (resetToken, newPassword) => 
    api.post('/auth/reset-password', { resetToken, newPassword }),
};

// User Management endpoints
export const userAPI = {
  getUserStatsByRole: () => 
    api.get('/users/stats/by-role'),
  
  searchStudents: (query) => 
    api.get(`/users/search-students?query=${encodeURIComponent(query)}`),
  
  createUser: (userData) => 
    api.post('/users', userData),
  
  promoteStudentToTA: (studentUserId, courseIds = []) => 
    api.post('/users/promote-to-ta', { studentUserId, courseIds }),
  
  getAllUsers: (params = {}) => 
    api.get('/users', { params }),
  
  getUserById: (userId) => 
    api.get(`/users/${userId}`),
  
  updateUser: (userId, userData) => 
    api.put(`/users/${userId}`, userData),
  
  deactivateUser: (userId) => 
    api.put(`/users/${userId}/deactivate`),
  
  activateUser: (userId) => 
    api.put(`/users/${userId}/activate`),
  
  deleteUser: (userId) => 
    api.delete(`/users/${userId}`)
};

export default api;
