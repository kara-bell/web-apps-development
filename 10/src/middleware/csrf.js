const AppError = require('../utils/AppError');
const { readCookie, CSRF_COOKIE } = require('../utils/cookies');

function csrfProtection(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (req.authMethod === 'bearer') {
    return next();
  }

  const cookieToken = readCookie(req, CSRF_COOKIE);
  const headerToken = req.get('X-CSRF-Token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new AppError(403, 'CSRF-токен недействителен'));
  }

  return next();
}

module.exports = csrfProtection;
