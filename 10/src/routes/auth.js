const crypto = require('crypto');
const express = require('express');

const authService = require('../services/authService');
const authenticate = require('../middleware/auth');
const csrfProtection = require('../middleware/csrf');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimit');
const tokenRepository = require('../data/tokenRepository');
const { verifyToken } = require('../utils/jwt');
const {
  tokenFromRequest,
  setAuthCookies,
  clearAuthCookies
} = require('../utils/cookies');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post(
  '/register',
  registerLimiter,
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    const csrfToken = crypto.randomBytes(32).toString('hex');
    setAuthCookies(res, result.token, csrfToken);
    res.status(201).json({ ...result, csrfToken });
  })
);

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    const csrfToken = crypto.randomBytes(32).toString('hex');
    setAuthCookies(res, result.token, csrfToken);
    res.status(200).json({ ...result, csrfToken });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const { token } = tokenFromRequest(req);

    if (token) {
      try {
        const payload = verifyToken(token);
        if (payload.jti && payload.exp) {
          await tokenRepository.revoke(payload.jti, new Date(payload.exp * 1000));
        }
      } catch (error) {
        // Токен уже недействителен — достаточно очистить cookie.
      }
    }

    clearAuthCookies(res);
    res.status(204).end();
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.user._id);
    res.status(200).json({ user });
  })
);

router.delete(
  '/me',
  authenticate,
  csrfProtection,
  asyncHandler(async (req, res) => {
    if (req.authPayload && req.authPayload.jti && req.authPayload.exp) {
      await tokenRepository.revoke(
        req.authPayload.jti,
        new Date(req.authPayload.exp * 1000)
      );
    }

    await authService.deleteAccount(req.user._id);
    clearAuthCookies(res);
    res.status(204).end();
  })
);

module.exports = router;
