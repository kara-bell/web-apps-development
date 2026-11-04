const express = require('express');

const authService = require('../services/authService');
const authenticate = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const COOKIE_NAME = 'qualityhub10_token';
const COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000
};

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.cookie(COOKIE_NAME, result.token, COOKIE_OPTIONS);
    res.status(201).json(result);
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.cookie(COOKIE_NAME, result.token, COOKIE_OPTIONS);
    res.status(200).json(result);
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
  asyncHandler(async (req, res) => {
    await authService.deleteAccount(req.user._id);
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.status(204).end();
  })
);

module.exports = router;
