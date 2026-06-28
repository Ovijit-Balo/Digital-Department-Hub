import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback
} from 'react';
import { jwtDecode } from 'jwt-decode';
import apiClient, {
  registerLogoutHandler,
  clearLogoutHandler,
  registerTokenUpdateHandler,
  clearTokenUpdateHandler,
  refreshAccessToken,
  isProtectedPath
} from '../api/client';
import { authApi } from '../api/modules';
import {
  TOKEN_KEY,
  SESSION_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  SESSION_REFRESH_TOKEN_KEY,
  USER_KEY,
  SESSION_USER_KEY,
  REMEMBER_KEY,
  clearAllAuthStorage
} from '../constants/authStorage';

const LOGIN_PATH = '/login';

const AuthContext = createContext(null);

const readStoredAuth = () => {
  const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(SESSION_USER_KEY);

  if (!token || !userRaw) {
    return { token: null, user: null };
  }

  try {
    const user = JSON.parse(userRaw);
    return { token, user };
  } catch {
    clearAllAuthStorage();
    return { token: null, user: null };
  }
};

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStoredAuth);

  const persistAuth = (token, user, refreshToken = null, rememberMe = true) => {
    if (rememberMe) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(REMEMBER_KEY, '1');
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        sessionStorage.removeItem(SESSION_REFRESH_TOKEN_KEY);
      }
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_USER_KEY);
    } else {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      localStorage.removeItem(REMEMBER_KEY);
      if (refreshToken) {
        sessionStorage.setItem(SESSION_REFRESH_TOKEN_KEY, refreshToken);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    setAuth({ token, user });
  };

  const setToken = useCallback((token) => {
    const remember = localStorage.getItem(REMEMBER_KEY);
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    } else {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }

    setAuth((prev) => ({ token, user: prev.user }));
  }, []);

  const clearAuth = useCallback(() => {
    clearAllAuthStorage();
    setAuth({ token: null, user: null });
  }, []);

  const persistUser = useCallback((user) => {
    const remember = localStorage.getItem(REMEMBER_KEY);
    if (remember) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    }
    setAuth((prev) => ({ ...prev, user }));
  }, []);

  const refreshUser = useCallback(async () => {
    if (!auth.token) {
      return null;
    }

    try {
      const { data } = await authApi.me();
      if (data?.user) {
        persistUser(data.user);
        return data.user;
      }
    } catch {
      /* keep cached profile until next successful refresh */
    }

    return null;
  }, [auth.token, persistUser]);

  const login = async (credentials, options = {}) => {
    const { data } = await apiClient.post('/auth/login', credentials);
    persistAuth(data.token, data.user, data.refreshToken, options.rememberMe !== false);
    return data.user;
  };

  const register = async (payload, options = {}) => {
    const { data } = await apiClient.post('/auth/register', payload);
    persistAuth(data.token, data.user, data.refreshToken, options.rememberMe !== false);
    return data.user;
  };

  const logout = () => {
    clearAuth();
  };

  const hasRole = (...roles) => {
    if (!auth.user || !Array.isArray(auth.user.roles)) {
      return false;
    }

    if (!roles.length) {
      return auth.user.roles.length > 0;
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

  const refreshTimerRef = useRef(null);

  useEffect(() => {
    registerLogoutHandler(() => {
      clearAuth();
      if (isProtectedPath()) {
        try {
          window.location.href = LOGIN_PATH;
        } catch {
          /* ignore */
        }
      }
    });

    registerTokenUpdateHandler(async (newToken) => {
      if (newToken) {
        setToken(newToken);
        try {
          const { data } = await authApi.me();
          if (data?.user) {
            persistUser(data.user);
          }
        } catch {
          /* ignore */
        }
      }
    });

    return () => {
      clearLogoutHandler();
      clearTokenUpdateHandler();
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [clearAuth, persistUser, setToken]);

  useEffect(() => {
    if (!auth.token) {
      return undefined;
    }

    refreshUser();

    return undefined;
  }, [auth.token, refreshUser]);

  useEffect(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!decodedToken?.exp) return undefined;

    const refreshToken =
      localStorage.getItem(REFRESH_TOKEN_KEY) ||
      sessionStorage.getItem(SESSION_REFRESH_TOKEN_KEY);
    if (!refreshToken) return undefined;

    const expiryMs = decodedToken.exp * 1000;
    const now = Date.now();
    const msUntilRefresh = Math.max(0, expiryMs - now - 60_000);

    refreshTimerRef.current = setTimeout(async () => {
      try {
        await refreshAccessToken();
      } catch {
        /* next API call will trigger interceptor refresh or logout */
      }
    }, msUntilRefresh);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [decodedToken]);

  const value = {
    token: auth.token,
    user: auth.user,
    isAuthenticated: Boolean(auth.token),
    decodedToken,
    login,
    register,
    logout,
    hasRole,
    refreshUser
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
