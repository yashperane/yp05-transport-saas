import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/authApi.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('auth_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      if (token) {
        const profile = await authApi.getProfile(token);
        setUser(profile);
        localStorage.setItem('auth_user', JSON.stringify(profile));
      }
    } catch (err) {
      console.warn('Session expired or invalid:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (identifier, password) => {
    const response = await authApi.login(identifier, password);
    const { token: receivedToken, user: loggedUser } = response.data;
    setUser(loggedUser);
    setToken(receivedToken);
    localStorage.setItem('auth_user', JSON.stringify(loggedUser));
    localStorage.setItem('auth_token', receivedToken);
    return loggedUser;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // ignore network error on logout
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
