import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('cardpro_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('cardpro_token');
    if (!token) { setLoading(false); return; }
    try {
      const res = await authAPI.getMe();
      setUser(res.data.user);
      localStorage.setItem('cardpro_user', JSON.stringify(res.data.user));
    } catch {
      localStorage.removeItem('cardpro_token');
      localStorage.removeItem('cardpro_user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = (token, userData) => {
    localStorage.setItem('cardpro_token', token);
    localStorage.setItem('cardpro_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('cardpro_token');
    localStorage.removeItem('cardpro_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin: user?.role === 'admin', isScanner: user?.role === 'scanner' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
