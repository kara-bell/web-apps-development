const express = require('express');

const userService = require('../services/userService');
const authenticate = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const users = await userService.list();
    res.status(200).json({ items: users });
  })
);

module.exports = router;
