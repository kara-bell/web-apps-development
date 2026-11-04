const crypto = require('crypto');

const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { verifyToken } = require('../utils/jwt');
const {
  TOKEN_COOKIE,
  CSRF_COOKIE,
  tokenFromRequest,
  readCookie,
  cookieOptions,
  setCsrfCookie
} = require('../utils/cookies');
const tokenRepository = require('../data/tokenRepository');
const userRepository = require('../data/userRepository');

const authenticate = asyncHandler(async (req, res, next) => {
  const { token, method } = tokenFromRequest(req);

  if (!token) {
    throw new AppError(401, 'Требуется авторизация');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (error) {
    throw new AppError(401, 'Сессия истекла или токен недействителен');
  }

  if (await tokenRepository.isRevoked(payload.jti)) {
    throw new AppError(401, 'Сессия завершена. Войдите снова.');
  }

  let user;
  try {
    user = await userRepository.findById(payload.sub);
  } catch (error) {
    throw new AppError(401, 'Сессия недействительна. Войдите снова.');
  }

  if (!user) {
    throw new AppError(401, 'Сессия недействительна. Войдите снова.');
  }

  if (method === 'cookie') {
    // Обновляем cookie как HttpOnly и выдаём CSRF-токен старым сессиям.
    res.cookie(TOKEN_COOKIE, token, cookieOptions({ httpOnly: true }));
    if (!readCookie(req, CSRF_COOKIE)) {
      setCsrfCookie(res, crypto.randomBytes(32).toString('hex'));
    }
  }

  req.user = user;
  req.authMethod = method;
  req.authPayload = payload;
  next();
});

module.exports = authenticate;
