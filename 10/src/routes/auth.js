const express = require('express');

const authService = require('../services/authService');
const authenticate = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
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
    res.status(204).end();
  })
);

module.exports = router;
