import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gotham_auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('gotham_auth_token') || null);
  const [loading, setLoading] = useState(false);

  const login = async (role, username, password) => {
    setLoading(true);
    try {
      const endpoint = `/api/auth/login/${role}`;
      const res = await api.post(endpoint, { username, password });
      const { token: jwtToken, user: userData } = res.data;

      setToken(jwtToken);
      setUser(userData);

      localStorage.setItem('gotham_auth_token', jwtToken);
      localStorage.setItem('gotham_auth_user', JSON.stringify(userData));

      return { success: true, user: userData };
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Login failed';
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('gotham_auth_token');
    localStorage.removeItem('gotham_auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
