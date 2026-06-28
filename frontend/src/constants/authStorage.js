export const TOKEN_KEY = 'ddh_access_token';
export const SESSION_TOKEN_KEY = 'ddh_session_access_token';
export const REFRESH_TOKEN_KEY = 'ddh_refresh_token';
export const SESSION_REFRESH_TOKEN_KEY = 'ddh_session_refresh_token';
export const USER_KEY = 'ddh_user';
export const SESSION_USER_KEY = 'ddh_session_user';
export const REMEMBER_KEY = 'ddh_token_remember';

export function isRememberedSession() {
  return Boolean(localStorage.getItem(REFRESH_TOKEN_KEY));
}

export function getAccessToken() {
  if (localStorage.getItem(REFRESH_TOKEN_KEY)) {
    return localStorage.getItem(TOKEN_KEY);
  }
  if (sessionStorage.getItem(SESSION_REFRESH_TOKEN_KEY)) {
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
  }
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY);
}

export function getRefreshToken() {
  if (localStorage.getItem(REFRESH_TOKEN_KEY)) {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }
  if (sessionStorage.getItem(SESSION_REFRESH_TOKEN_KEY)) {
    return sessionStorage.getItem(SESSION_REFRESH_TOKEN_KEY);
  }
  return null;
}

export function persistTokens(accessToken, refreshToken) {
  if (isRememberedSession()) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_REFRESH_TOKEN_KEY);
  } else {
    sessionStorage.setItem(SESSION_TOKEN_KEY, accessToken);
    if (refreshToken) sessionStorage.setItem(SESSION_REFRESH_TOKEN_KEY, refreshToken);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearAllAuthStorage() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(REMEMBER_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_USER_KEY);
  sessionStorage.removeItem(SESSION_REFRESH_TOKEN_KEY);
}
