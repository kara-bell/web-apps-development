const TOKEN_KEY = 'qh_token';

export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Хранилище может быть недоступно в приватном режиме.
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Хранилище может быть недоступно в приватном режиме.
  }
}

export async function apiRequest(
  path,
  { method = 'GET', body, auth = true } = {},
) {
  const headers = {};
  let payload;

  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const token = getToken();

  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(path, {
      method,
      headers,
      body: payload,
    });
  } catch {
    throw new ApiError(
      0,
      'Сервер недоступен. Проверьте подключение и попробуйте ещё раз.',
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
    if ([502, 503, 504].includes(response.status)) {
      throw new ApiError(
        response.status,
        'Сервер недоступен. Попробуйте позже.',
      );
    }

    throw new ApiError(
      response.status,
      data && data.message ? data.message : 'Не удалось выполнить запрос',
      data && data.errors ? data.errors : undefined,
    );
  }

  return data;
}
