const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { verifyToken } = require('../utils/jwt');
const userRepository = require('../data/userRepository');

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new AppError(401, 'Требуется авторизация');
  }

  let payload;
  try {
    payload = verifyToken(match[1]);
  } catch (error) {
    throw new AppError(401, 'Сессия истекла или токен недействителен');
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

  req.user = user;
  next();
});

module.exports = authenticate;
