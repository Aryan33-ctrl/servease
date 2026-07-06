import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verify token on app initialization
  const verifyTokenOnLoad = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }

      // Verify token with backend
      const response = await api.get('/api/auth/verify-token');
      if (response.data.success) {
        setUser(response.data.data.user);
        setError(null);
      }
    } catch (err) {
      // Token is invalid or expired - clear storage
      console.error('Token verification failed:', err.message);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setError('Session expired. Please log in again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check storage on initial load
  useEffect(() => {
    verifyTokenOnLoad();
  }, [verifyTokenOnLoad]);

  const login = useCallback((userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setError(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      // Call logout endpoint to invalidate token on server (optional)
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout API call failed:', err);
    } finally {
      // Clear local storage regardless of API success
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setError(null);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};
