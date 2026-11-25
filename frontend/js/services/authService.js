/* ==========================================================================
   IDS Colleges Student Services Queue — Authentication API Service
   ========================================================================== */
(function (window) {
  'use strict';

  const SESSION_USER_KEY = 'ids-staff-user';
  const AUTH_TOKEN_KEY = 'ids-auth-token';

  const { API_CONFIG, get, post } = window.IDSApi;

  function getSession() {
    try {
      const raw = window.sessionStorage.getItem(SESSION_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function saveSession(user, token) {
    try {
      if (user) {
        window.sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
      }
      if (token) {
        window.sessionStorage.setItem(AUTH_TOKEN_KEY, String(token));
      }
    } catch (err) {
      // Ignore storage availability errors
    }
  }

  function clearSession() {
    try {
      window.sessionStorage.removeItem(SESSION_USER_KEY);
      window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (err) {
      // Ignore storage availability errors
    }
  }

  async function login(credentials) {
    const result = await post(API_CONFIG.endpoints.authLogin, credentials);
    if (result.ok && result.data) {
      saveSession(result.data.user || result.data, result.data.token || '');
    }
    return result;
  }

  async function logout() {
    const result = await post(API_CONFIG.endpoints.authLogout, {});
    clearSession();
    return result;
  }

  function fetchCurrentSession() {
    return get(API_CONFIG.endpoints.authSession);
  }

  window.IDSAuthService = {
    getSession,
    saveSession,
    clearSession,
    login,
    logout,
    fetchCurrentSession,
  };
})(window);
