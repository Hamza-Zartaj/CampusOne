import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Setup axios defaults
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Axios instance
  const api = axios.create({
    baseURL: API_URL,
  });

  // Request interceptor to add token
  api.interceptors.request.use(
    (config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle errors
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expired or invalid
        logout();
      }
      return Promise.reject(error);
    }
  );

  // Fetch current user on mount if token exists
  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data.user);
        } catch (err) {
          console.error('Failed to fetch user:', err);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  // Register user
  const register = async (userData) => {
    try {
      setError(null);
      const response = await api.post('/auth/register', userData);
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', { email, password });
      
      // Check if 2FA is required
      if (response.data.message === '2FA_REQUIRED') {
        return { 
          success: true, 
          requires2FA: true, 
          userId: response.data.userId,
          deviceFingerprint: response.data.deviceFingerprint,
          deviceName: response.data.deviceName
        };
      }

      // Login successful
      const { token: newToken, user: userData } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      return { success: true, requires2FA: false };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Verify 2FA token
  const verify2FA = async (userId, token, deviceFingerprint, deviceName, trustDevice) => {
    try {
      setError(null);
      const response = await api.post('/auth/verify-2fa', {
        userId,
        token,
        deviceFingerprint,
        deviceName,
        trustDevice
      });

      const { token: newToken, user: userData } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.message || '2FA verification failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Setup 2FA
  const setup2FA = async () => {
    try {
      setError(null);
      const response = await api.post('/auth/setup-2fa');
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to setup 2FA';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Enable 2FA
  const enable2FA = async (token) => {
    try {
      setError(null);
      const response = await api.post('/auth/enable-2fa', { token });
      // Update user state
      setUser({ ...user, twoFactorEnabled: true });
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to enable 2FA';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Disable 2FA
  const disable2FA = async (password, token) => {
    try {
      setError(null);
      const response = await api.post('/auth/disable-2fa', { password, token });
      // Update user state
      setUser({ ...user, twoFactorEnabled: false });
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to disable 2FA';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setError(null);
  };

  const value = {
    user,
    token,
    loading,
    error,
    api,
    register,
    login,
    verify2FA,
    setup2FA,
    enable2FA,
    disable2FA,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
