(function () {
  'use strict';

  const TOKEN_KEY = 'qualityhub10_token';

  class ApiError extends Error {
    constructor(message, status, fields) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.fields = fields || null;
    }
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  async function request(path, options = {}) {
    const { method = 'GET', body, auth = true } = options;
    const headers = {};

    if (auth && getToken()) {
      headers.Authorization = `Bearer ${getToken()}`;
    }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let response;
    try {
      response = await fetch(path, {
        method,
        headers,
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
    return request('/api/auth/register', { method: 'POST', body: payload, auth: false });
  }

  function login(payload) {
    return request('/api/auth/login', { method: 'POST', body: payload, auth: false });
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
    getToken,
    setToken,
    clearToken,
    register,
    login,
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
