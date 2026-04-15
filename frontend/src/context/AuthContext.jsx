import { createContext, useContext, useMemo, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import apiClient from '../api/client';

const TOKEN_KEY = 'ddh_access_token';
const USER_KEY = 'ddh_user';

const AuthContext = createContext(null);

const readStoredAuth = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);

  if (!token || !userRaw) {
    return { token: null, user: null };
  }

  try {
    const user = JSON.parse(userRaw);
    return { token, user };
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return { token: null, user: null };
  }
};

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);

  const persistAuth = (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setAuth({ token, user });
  };

  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuth({ token: null, user: null });
  };

  const login = async (credentials) => {
    const { data } = await apiClient.post('/auth/login', credentials);
    persistAuth(data.token, data.user);
    return data.user;
  };

  const register = async (payload) => {
    const { data } = await apiClient.post('/auth/register', payload);
    persistAuth(data.token, data.user);
    return data.user;
  };

  const logout = () => {
    clearAuth();
  };

  const hasRole = (...roles) => {
    if (!auth.user) {
      return false;
    }
    return auth.user.roles.some((role) => roles.includes(role));
  };

  const decodedToken = useMemo(() => {
    if (!auth.token) {
      return null;
    }

    try {
      return jwtDecode(auth.token);
    } catch {
      return null;
    }
  }, [auth.token]);

  const value = {
    token: auth.token,
    user: auth.user,
    isAuthenticated: Boolean(auth.token),
    decodedToken,
    login,
    register,
    logout,
    hasRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
