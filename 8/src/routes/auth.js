const express = require('express');
const bcrypt = require('bcryptjs');

const { User, ROLES } = require('../models/User');
const { signToken } = require('../utils/jwt');

const router = express.Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sendValidationError(res, errors) {
  return res.status(400).json({
    message: 'Проверьте заполнение полей',
    errors,
  });
}

router.post('/register', async (req, res) => {
  const body = req.body || {};
  const name = normalizeText(body.name);
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  const role = body.role === undefined || body.role === '' ? 'tester' : body.role;

  const errors = {};

  if (name.length < 2 || name.length > 60) {
    errors.name = 'Имя должно содержать от 2 до 60 символов';
  }

  if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Укажите корректный e-mail';
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Пароль должен быть не короче ${PASSWORD_MIN_LENGTH} символов`;
  } else if (password.length > PASSWORD_MAX_LENGTH) {
    errors.password = `Пароль должен быть не длиннее ${PASSWORD_MAX_LENGTH} символов`;
  }

  if (!ROLES.includes(role)) {
    errors.role = 'Недопустимая роль';
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, errors);
  }

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return res.status(409).json({
      message: 'Пользователь с таким e-mail уже зарегистрирован',
      errors: { email: 'Этот e-mail уже занят' },
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
  });

  const token = signToken(user._id);

  return res.status(201).json({
    token,
    user: user.toJSON(),
  });
});

router.post('/login', async (req, res) => {
  const body = req.body || {};
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  const errors = {};

  if (!email) {
    errors.email = 'Укажите e-mail';
  }

  if (!password) {
    errors.password = 'Укажите пароль';
  }

  if (Object.keys(errors).length > 0) {
    return sendValidationError(res, errors);
  }

  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    return res.status(401).json({ message: 'Неверный e-mail или пароль' });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    return res.status(401).json({ message: 'Неверный e-mail или пароль' });
  }

  const token = signToken(user._id);

  return res.json({
    token,
    user: user.toJSON(),
  });
});

module.exports = router;
