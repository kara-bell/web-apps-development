const bcrypt = require('bcryptjs');

const userRepository = require('../data/userRepository');
const testCaseRepository = require('../data/testCaseRepository');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/jwt');
const { validateRegistration, validateLogin } = require('../utils/validation');

async function register(input) {
  const { name, email, password } = validateRegistration(input);

  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new AppError(409, 'Пользователь с таким e-mail уже зарегистрирован', {
      email: 'E-mail уже занят'
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userRepository.create({ name, email, passwordHash });

  return { token: signToken(user), user: user.toJSON() };
}

async function login(input) {
  const { email, password } = validateLogin(input);

  const user = await userRepository.findByEmail(email, { withPassword: true });
  if (!user) {
    throw new AppError(401, 'Неверный e-mail или пароль');
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw new AppError(401, 'Неверный e-mail или пароль');
  }

  return { token: signToken(user), user: user.toJSON() };
}

async function getProfile(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError(401, 'Сессия недействительна. Войдите снова.');
  }
  return user.toJSON();
}

async function deleteAccount(userId) {
  await testCaseRepository.deleteByOwner(userId);
  await userRepository.deleteById(userId);
}

module.exports = { register, login, getProfile, deleteAccount };
