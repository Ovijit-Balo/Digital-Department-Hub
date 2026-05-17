import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 10000
});

let _logoutHandler = null;
let _tokenUpdateHandler = null;
let _refreshInProgress = false;
let _refreshPromise = null;
let _requestQueue = [];

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

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ddh_access_token');

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
      // If no refresh token present, immediately logout
      const refreshToken =
        localStorage.getItem('ddh_refresh_token') || sessionStorage.getItem('ddh_refresh_token');
      if (!refreshToken) {
        if (typeof _logoutHandler === 'function') _logoutHandler();
        return Promise.reject(err);
      }

      // If a refresh is already in progress, queue the request
      if (_refreshInProgress) {
        return new Promise((resolve, reject) => {
          _requestQueue.push({ resolve, reject, originalRequest });
        });
      }

      _refreshInProgress = true;

      // Use raw axios to call refresh endpoint to avoid interceptors
      _refreshPromise = axios
        .post(`${apiClient.defaults.baseURL}/auth/refresh`, { refreshToken })
        .then((r) => {
          const newToken = r?.data?.token;
          const newRefresh = r?.data?.refreshToken;

          if (newToken) {
            // persist tokens in same storage where refreshToken was found
            if (localStorage.getItem('ddh_refresh_token')) {
              localStorage.setItem('ddh_access_token', newToken);
              if (newRefresh) localStorage.setItem('ddh_refresh_token', newRefresh);
            } else {
              sessionStorage.setItem('ddh_access_token', newToken);
              if (newRefresh) sessionStorage.setItem('ddh_refresh_token', newRefresh);
            }

            if (typeof _tokenUpdateHandler === 'function') {
              try {
                _tokenUpdateHandler(newToken);
              } catch {
                /* ignore */
              }
            }

            // retry original request
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            const retry = axios(originalRequest);

            // drain queue
            _requestQueue.forEach(({ resolve, originalRequest: req }) => {
              req.headers = req.headers || {};
              req.headers.Authorization = `Bearer ${newToken}`;
              resolve(axios(req));
            });
            _requestQueue = [];

            return retry;
          }

          // no token in refresh response -> logout
          if (typeof _logoutHandler === 'function') _logoutHandler();
          return Promise.reject(err);
        })
        .catch((refreshErr) => {
          if (typeof _logoutHandler === 'function') _logoutHandler();
          _requestQueue.forEach(({ reject }) => reject(refreshErr));
          _requestQueue = [];
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
