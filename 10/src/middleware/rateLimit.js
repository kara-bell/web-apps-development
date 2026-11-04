const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

function keyByIpAndEmail(req) {
  const email = String((req.body && req.body.email) || '').toLowerCase();
  return `${ipKeyGenerator(req.ip)}:${email}`;
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  keyGenerator: keyByIpAndEmail,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много неудачных попыток входа. Попробуйте позже.' }
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  keyGenerator: keyByIpAndEmail,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток регистрации. Попробуйте позже.' }
});

module.exports = { loginLimiter, registerLimiter };
