export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const headers = {};
  let payload;

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(path, { method, headers, body: payload });
  } catch {
    throw new ApiError(
      0,
      'Сервер недоступен. Проверьте, запущено ли приложение.',
    );
  }

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data && data.message ? data.message : 'Не удалось выполнить запрос',
      data && data.errors ? data.errors : undefined,
    );
  }

  return data;
}

export function getTestCases({ search = '', priority = '', status = '' } = {}) {
  const params = new URLSearchParams();

  if (search) params.set('search', search);
  if (priority) params.set('priority', priority);
  if (status) params.set('status', status);

  const query = params.toString();
  return apiRequest(`/api/test-cases${query ? `?${query}` : ''}`);
}

export function getStats() {
  return apiRequest('/api/test-cases/stats');
}

export function createTestCase(payload) {
  return apiRequest('/api/test-cases', { method: 'POST', body: payload });
}

export function updateTestCase(id, payload) {
  return apiRequest(`/api/test-cases/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: payload,
  });
}

export function deleteTestCase(id) {
  return apiRequest(`/api/test-cases/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
