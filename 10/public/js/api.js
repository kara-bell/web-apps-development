(function () {
  'use strict';

  const CSRF_COOKIE = 'qualityhub10_csrf';

  class ApiError extends Error {
    constructor(message, status, fields) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.fields = fields || null;
    }
  }

  function getCookie(name) {
    const prefix = `${name}=`;
    const entry = document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix));
    return entry ? decodeURIComponent(entry.slice(prefix.length)) : null;
  }

  async function request(path, options = {}) {
    const { method = 'GET', body } = options;
    const headers = {};

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const csrfToken = getCookie(CSRF_COOKIE);
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
    }

    let response;
    try {
      response = await fetch(path, {
        method,
        headers,
        credentials: 'same-origin',
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (error) {
      throw new ApiError('Сервер недоступен. Попробуйте позже.', 0);
    }

    const raw = await response.text();
    let data = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch (error) {
        data = null;
      }
    }

    if (!response.ok) {
      throw new ApiError(
        (data && data.error) || 'Не удалось выполнить запрос',
        response.status,
        data && data.fields
      );
    }

    return data;
  }

  function register(payload) {
    return request('/api/auth/register', { method: 'POST', body: payload });
  }

  function login(payload) {
    return request('/api/auth/login', { method: 'POST', body: payload });
  }

  function logout() {
    return request('/api/auth/logout', { method: 'POST' });
  }

  function getMe() {
    return request('/api/auth/me');
  }

  function deleteAccount() {
    return request('/api/auth/me', { method: 'DELETE' });
  }

  function listCases(filters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.status) params.set('status', filters.status);
    const query = params.toString();
    return request(`/api/test-cases${query ? `?${query}` : ''}`);
  }

  function getStats() {
    return request('/api/test-cases/stats');
  }

  function listUsers() {
    return request('/api/users');
  }

  function createCase(payload) {
    return request('/api/test-cases', { method: 'POST', body: payload });
  }

  function updateCase(id, payload) {
    return request(`/api/test-cases/${id}`, { method: 'PATCH', body: payload });
  }

  function deleteCase(id) {
    return request(`/api/test-cases/${id}`, { method: 'DELETE' });
  }

  window.QHApi = {
    ApiError,
    register,
    login,
    logout,
    getMe,
    deleteAccount,
    listCases,
    getStats,
    listUsers,
    createCase,
    updateCase,
    deleteCase
  };
})();
