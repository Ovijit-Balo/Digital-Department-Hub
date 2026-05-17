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
  clearTokenUpdateHandler
} from '../api/client';

const TOKEN_KEY = 'ddh_access_token';
const SESSION_TOKEN_KEY = 'ddh_session_access_token';
const REFRESH_TOKEN_KEY = 'ddh_refresh_token';
const SESSION_REFRESH_TOKEN_KEY = 'ddh_session_refresh_token';
const USER_KEY = 'ddh_user';
const SESSION_USER_KEY = 'ddh_session_user';
const REMEMBER_KEY = 'ddh_token_remember';

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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
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
    // persist new token according to remember flag
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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
    sessionStorage.removeItem(SESSION_REFRESH_TOKEN_KEY);
    setAuth({ token: null, user: null });
  }, []);

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

  // Auto-logout on token expiry and register logout handler for API client
  const expiryTimerRef = useRef(null);

  useEffect(() => {
    // register logout handler so api client can trigger it on 401
    registerLogoutHandler(() => {
      clearAuth();
      // redirect to login page
      try {
        window.location.href = '/auth/login';
      } catch {
        // ignore
      }
    });

    registerTokenUpdateHandler((newToken) => {
      if (newToken) setToken(newToken);
    });

    return () => {
      clearLogoutHandler();
      clearTokenUpdateHandler();
      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
      }
    };
  }, [clearAuth, setToken]);

  useEffect(() => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }

    if (!decodedToken || !decodedToken.exp) return undefined;

    const expiryMs = decodedToken.exp * 1000;
    const now = Date.now();

    if (expiryMs <= now) {
      // token already expired
      clearAuth();
      try {
        window.location.href = '/auth/login';
      } catch {
        // ignore
      }
      return undefined;
    }

    // schedule logout a few seconds before actual expiry
    const msUntilExpiry = Math.max(0, expiryMs - now - 2000);
    expiryTimerRef.current = setTimeout(() => {
      clearAuth();
      try {
        window.location.href = '/auth/login';
      } catch {
        // ignore
      }
    }, msUntilExpiry);

    return () => {
      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
      }
    };
  }, [clearAuth, decodedToken]);

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
