const AppError = require('./AppError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRIORITIES = ['high', 'medium', 'low'];
const STATUSES = ['draft', 'in_progress', 'ready'];

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function has(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function fail(fields) {
  throw new AppError(400, 'Проверьте поля формы', fields);
}

function validateRegistration(input = {}) {
  const fields = {};
  const name = text(input.name);
  const email = text(input.email).toLowerCase();
  const password = typeof input.password === 'string' ? input.password : '';

  if (name.length < 2 || name.length > 60) {
    fields.name = 'Имя должно содержать от 2 до 60 символов';
  }
  if (!EMAIL_RE.test(email) || email.length > 120) {
    fields.email = 'Укажите корректный e-mail';
  }
  if (password.length < 8 || password.length > 72) {
    fields.password = 'Пароль должен содержать от 8 до 72 символов';
  }

  if (Object.keys(fields).length > 0) fail(fields);
  return { name, email, password };
}

function validateLogin(input = {}) {
  const fields = {};
  const email = text(input.email).toLowerCase();
  const password = typeof input.password === 'string' ? input.password : '';

  if (!EMAIL_RE.test(email)) fields.email = 'Укажите корректный e-mail';
  if (!password) fields.password = 'Введите пароль';

  if (Object.keys(fields).length > 0) fail(fields);
  return { email, password };
}

function validateTestCase(input = {}, { partial = false } = {}) {
  const fields = {};
  const result = {};

  if (!partial || has(input, 'title')) {
    const title = text(input.title);
    if (title.length < 3 || title.length > 120) {
      fields.title = 'Название должно содержать от 3 до 120 символов';
    } else {
      result.title = title;
    }
  }

  if (!partial || has(input, 'module')) {
    const moduleName = text(input.module);
    if (moduleName.length < 2 || moduleName.length > 60) {
      fields.module = 'Модуль должен содержать от 2 до 60 символов';
    } else {
      result.module = moduleName;
    }
  }

  if (!partial || has(input, 'priority')) {
    const priority = text(input.priority);
    if (!PRIORITIES.includes(priority)) {
      fields.priority = 'Выберите приоритет: высокий, средний или низкий';
    } else {
      result.priority = priority;
    }
  }

  if (has(input, 'status')) {
    const status = text(input.status);
    if (!STATUSES.includes(status)) {
      fields.status = 'Выберите статус: черновик, в работе или готов';
    } else {
      result.status = status;
    }
  }

  if (!partial || has(input, 'steps')) {
    const steps = text(input.steps);
    if (steps.length < 5 || steps.length > 2000) {
      fields.steps = 'Шаги должны содержать от 5 до 2000 символов';
    } else {
      result.steps = steps;
    }
  }

  if (Object.keys(fields).length > 0) fail(fields);
  if (!partial && !has(input, 'status')) result.status = 'draft';
  return result;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  EMAIL_RE,
  PRIORITIES,
  STATUSES,
  validateRegistration,
  validateLogin,
  validateTestCase,
  escapeRegex
};
