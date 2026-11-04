const jwt = require('jsonwebtoken');

function getSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('Не задан JWT_SECRET в файле .env');
  }

  return secret;
}

function signToken(userId) {
  return jwt.sign({ sub: userId.toString() }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
}

function verifyToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { signToken, verifyToken };
