const { User } = require('../models/User');
const { verifyToken } = require('../utils/jwt');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Требуется авторизация' });
  }

  let payload;

  try {
    payload = verifyToken(token);
  } catch {
    return res
      .status(401)
      .json({ message: 'Недействительный или просроченный токен' });
  }

  let user;

  try {
    user = await User.findById(payload.sub);
  } catch {
    return res.status(401).json({ message: 'Недействительный токен' });
  }

  if (!user) {
    return res.status(401).json({ message: 'Пользователь не найден' });
  }

  req.user = user;
  req.token = token;

  return next();
}

module.exports = { requireAuth };
