const TOKEN_COOKIE = 'qualityhub10_token';
const CSRF_COOKIE = 'qualityhub10_csrf';
const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000;

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  const entry = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

function tokenFromRequest(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (match) return { token: match[1], method: 'bearer' };

  const cookie = readCookie(req, TOKEN_COOKIE);
  if (cookie) return { token: cookie, method: 'cookie' };

  return { token: null, method: null };
}

function cookieOptions(extra = {}) {
  return {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    ...extra
  };
}

function setCsrfCookie(res, csrfToken) {
  res.cookie(CSRF_COOKIE, csrfToken, cookieOptions({ httpOnly: false }));
}

function setAuthCookies(res, token, csrfToken) {
  res.cookie(TOKEN_COOKIE, token, cookieOptions({ httpOnly: true }));
  setCsrfCookie(res, csrfToken);
}

function clearAuthCookies(res) {
  res.clearCookie(TOKEN_COOKIE, { path: '/' });
  res.clearCookie(CSRF_COOKIE, { path: '/' });
}

module.exports = {
  TOKEN_COOKIE,
  CSRF_COOKIE,
  COOKIE_MAX_AGE,
  readCookie,
  tokenFromRequest,
  cookieOptions,
  setCsrfCookie,
  setAuthCookies,
  clearAuthCookies
};
