import axios from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  persistTokens
} from '../constants/authStorage';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 10000
});

const PROTECTED_PATH_PREFIXES = ['/admin', '/profile', '/student'];

let _logoutHandler = null;
let _tokenUpdateHandler = null;
let _refreshInProgress = false;
let _refreshPromise = null;
let _requestQueue = [];

export function isProtectedPath(pathname = window.location.pathname) {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function registerLogoutHandler(fn) {
  _logoutHandler = fn;
}

export function clearLogoutHandler() {
  _logoutHandler = null;
}

export function registerTokenUpdateHandler(fn) {
  _tokenUpdateHandler = fn;
}

export function clearTokenUpdateHandler() {
  _tokenUpdateHandler = null;
}

function notifyTokenUpdate(newToken) {
  if (typeof _tokenUpdateHandler === 'function') {
    try {
      _tokenUpdateHandler(newToken);
    } catch {
      /* ignore */
    }
  }
}

function triggerLogout() {
  if (typeof _logoutHandler === 'function') {
    _logoutHandler();
  }
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const response = await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`, {
    refreshToken
  });
  const newToken = response?.data?.token;
  const newRefresh = response?.data?.refreshToken;

  if (!newToken) {
    return null;
  }

  persistTokens(newToken, newRefresh);
  notifyTokenUpdate(newToken);
  return newToken;
}

function drainRefreshQueue(newToken, refreshErr) {
  if (newToken) {
    _requestQueue.forEach(({ resolve, originalRequest: req }) => {
      req.headers = req.headers || {};
      req.headers.Authorization = `Bearer ${newToken}`;
      resolve(axios(req));
    });
  } else {
    _requestQueue.forEach(({ reject }) => reject(refreshErr));
  }
  _requestQueue = [];
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const originalRequest = err.config;

    if (status === 401) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        triggerLogout();
        return Promise.reject(err);
      }

      if (_refreshInProgress) {
        return new Promise((resolve, reject) => {
          _requestQueue.push({ resolve, reject, originalRequest });
        });
      }

      _refreshInProgress = true;

      _refreshPromise = refreshAccessToken()
        .then((newToken) => {
          if (newToken) {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            const retry = axios(originalRequest);
            drainRefreshQueue(newToken);
            return retry;
          }

          triggerLogout();
          return Promise.reject(err);
        })
        .catch((refreshErr) => {
          triggerLogout();
          drainRefreshQueue(null, refreshErr);
          return Promise.reject(refreshErr);
        })
        .finally(() => {
          _refreshInProgress = false;
          _refreshPromise = null;
        });

      return _refreshPromise;
    }

    return Promise.reject(err);
  }
);

export default apiClient;
