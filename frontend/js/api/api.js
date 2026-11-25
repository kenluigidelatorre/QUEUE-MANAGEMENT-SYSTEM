/* ==========================================================================
   IDS Colleges Student Services Queue — Configurable API Client (fetch)
   ========================================================================== */
(function (window) {
  'use strict';

  /**
   * Configure your backend API base URL and endpoint paths here.
   * Leave baseUrl empty until the backend server is connected.
   */
  const API_CONFIG = {
    baseUrl: '',
    timeoutMs: 10000,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    endpoints: {
      queueSummary: '',
      tickets: '',
      ticketById: '',
      callNext: '',
      authLogin: '',
      authLogout: '',
      authSession: '',
    },
  };

  function getAuthToken() {
    try {
      return window.sessionStorage.getItem('ids-auth-token') || '';
    } catch (err) {
      return '';
    }
  }

  function isConfigured(endpoint) {
    return Boolean(API_CONFIG.baseUrl && endpoint);
  }

  function buildUrl(endpoint, params) {
    const base = API_CONFIG.baseUrl.replace(/\/+$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = new URL(`${base}${path}`, window.location.origin);

    if (params && typeof params === 'object') {
      Object.keys(params).forEach((key) => {
        const val = params[key];
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.set(key, String(val));
        }
      });
    }

    return url.toString();
  }

  async function request(method, endpoint, options = {}) {
    if (!isConfigured(endpoint)) {
      return {
        ok: false,
        notConfigured: true,
        status: 0,
        data: null,
        error: 'Backend API endpoint is not configured.',
      };
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);

    const headers = { ...API_CONFIG.headers, ...(options.headers || {}) };
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const fetchOptions = {
      method,
      headers,
      signal: controller.signal,
    };

    if (options.body !== undefined && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const url = buildUrl(endpoint, options.params);
      const response = await window.fetch(url, fetchOptions);
      const contentType = response.headers.get('content-type') || '';
      const payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        const msg =
          (payload && typeof payload === 'object' && (payload.message || payload.error)) ||
          `Request failed with status ${response.status}.`;
        return {
          ok: false,
          notConfigured: false,
          status: response.status,
          data: null,
          error: msg,
        };
      }

      return {
        ok: true,
        notConfigured: false,
        status: response.status,
        data: payload,
        error: null,
      };
    } catch (err) {
      return {
        ok: false,
        notConfigured: false,
        status: 0,
        data: null,
        error:
          err && err.name === 'AbortError'
            ? 'Request timed out while waiting for the server.'
            : 'Unable to reach the backend API server.',
      };
    } finally {
      window.clearTimeout(timer);
    }
  }

  function get(endpoint, params) {
    return request('GET', endpoint, { params });
  }

  function post(endpoint, body) {
    return request('POST', endpoint, { body });
  }

  function put(endpoint, body) {
    return request('PUT', endpoint, { body });
  }

  function del(endpoint) {
    return request('DELETE', endpoint);
  }

  window.IDSApi = {
    API_CONFIG,
    isConfigured,
    get,
    post,
    put,
    del,
  };
})(window);
