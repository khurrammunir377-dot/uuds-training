import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, setAuthToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('uuds_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verify() {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.getMe();
        if (res?.user) {
          setUser(res.user);
          localStorage.setItem('uuds_user', JSON.stringify(res.user));
        }
      } catch (err) {
        console.error("Auth verification failed", err);
        setAuthToken(null);
        setUser(null);
        localStorage.removeItem('uuds_user');
      } finally {
        setLoading(false);
      }
    }
    verify();

    const handleUnauthorized = () => {
      setUser(null);
      localStorage.removeItem('uuds_user');
    };
    window.addEventListener('uuds_auth_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('uuds_auth_unauthorized', handleUnauthorized);
  }, []);

  const login = async (username, password) => {
    const res = await api.login(username, password);
    setAuthToken(res.token);
    setUser(res.user);
    localStorage.setItem('uuds_user', JSON.stringify(res.user));
    return res.user;
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('uuds_user');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
