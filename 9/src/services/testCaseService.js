'use strict';

// Слой бизнес-логики.
// Отвечает за правила приложения и вызывает слой доступа к данным.
// Не знает про req/res и HTTP-коды.

const { randomUUID } = require('node:crypto');
const repository = require('../data/testCaseRepository');

const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['draft', 'in_progress', 'ready'];
const DEFAULT_PRIORITY = 'medium';
const DEFAULT_STATUS = 'draft';
const EDITABLE_FIELDS = ['title', 'module', 'steps', 'priority', 'status'];

function httpError(status, message, errors) {
  const error = new Error(message);
  error.status = status;

  if (errors) {
    error.errors = errors;
  }

  return error;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateTitle(value, errors) {
  const text = normalizeText(value);

  if (!text) {
    errors.title = 'Укажите название тест-кейса';
    return undefined;
  }

  if (text.length < 3) {
    errors.title = 'Название должно содержать минимум 3 символа';
    return undefined;
  }

  if (text.length > 120) {
    errors.title = 'Название должно содержать не более 120 символов';
    return undefined;
  }

  return text;
}

function validateModule(value, errors) {
  const text = normalizeText(value);

  if (!text) {
    errors.module = 'Укажите модуль';
    return undefined;
  }

  if (text.length < 2) {
    errors.module = 'Модуль должен содержать минимум 2 символа';
    return undefined;
  }

  if (text.length > 60) {
    errors.module = 'Модуль должен содержать не более 60 символов';
    return undefined;
  }

  return text;
}

function validateSteps(value, errors) {
  const text = normalizeText(value);

  if (!text) {
    errors.steps = 'Укажите шаги сценария';
    return undefined;
  }

  if (text.length < 10) {
    errors.steps = 'Шаги должны содержать минимум 10 символов';
    return undefined;
  }

  if (text.length > 2000) {
    errors.steps = 'Шаги должны содержать не более 2000 символов';
    return undefined;
  }

  return text;
}

function validateEnum(value, allowed, field, message, errors) {
  if (!allowed.includes(value)) {
    errors[field] = message;
    return undefined;
  }

  return value;
}

function throwValidationErrors(errors) {
  if (Object.keys(errors).length > 0) {
    throw httpError(400, 'Проверьте заполнение полей', errors);
  }
}

function normalizeFilters(filters) {
  if (!isPlainObject(filters)) {
    return { search: '', priority: '', status: '' };
  }

  const errors = {};
  const search = typeof filters.search === 'string' ? filters.search.trim() : '';
  let priority = '';
  let status = '';

  if (filters.priority !== undefined && filters.priority !== '') {
    priority = validateEnum(
      filters.priority,
      PRIORITIES,
      'priority',
      'Недопустимый приоритет',
      errors,
    );
  }

  if (filters.status !== undefined && filters.status !== '') {
    status = validateEnum(
      filters.status,
      STATUSES,
      'status',
      'Недопустимый статус',
      errors,
    );
  }

  throwValidationErrors(errors);

  return { search, priority, status };
}

async function list(filters = {}) {
  const normalized = normalizeFilters(filters);
  const items = await repository.readAll();
  let result = items;

  if (normalized.search) {
    const needle = normalized.search.toLowerCase();
    result = result.filter((item) =>
      [item.title, item.module, item.steps].some(
        (value) => typeof value === 'string' && value.toLowerCase().includes(needle),
      ),
    );
  }

  if (normalized.priority) {
    result = result.filter((item) => item.priority === normalized.priority);
  }

  if (normalized.status) {
    result = result.filter((item) => item.status === normalized.status);
  }

  return result.sort((a, b) =>
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')),
  );
}

async function getById(id) {
  const item = await repository.findById(id);

  if (!item) {
    throw httpError(404, 'Тест-кейс не найден');
  }

  return item;
}

async function create(payload) {
  if (!isPlainObject(payload)) {
    throw httpError(400, 'Тело запроса должно быть объектом');
  }

  const errors = {};
  const title = validateTitle(payload.title, errors);
  const module = validateModule(payload.module, errors);
  const steps = validateSteps(payload.steps, errors);
  const priority =
    payload.priority === undefined
      ? DEFAULT_PRIORITY
      : validateEnum(
          payload.priority,
          PRIORITIES,
          'priority',
          'Недопустимый приоритет',
          errors,
        );
  const status =
    payload.status === undefined
      ? DEFAULT_STATUS
      : validateEnum(
          payload.status,
          STATUSES,
          'status',
          'Недопустимый статус',
          errors,
        );

  throwValidationErrors(errors);

  const now = new Date().toISOString();
  const item = {
    id: randomUUID(),
    title,
    module,
    steps,
    priority,
    status,
    createdAt: now,
    updatedAt: now,
  };

  return repository.insert(item);
}

async function update(id, payload) {
  if (!isPlainObject(payload)) {
    throw httpError(400, 'Тело запроса должно быть объектом');
  }

  const hasEditableField = EDITABLE_FIELDS.some(
    (field) => payload[field] !== undefined,
  );

  if (!hasEditableField) {
    throw httpError(400, 'Нет полей для обновления');
  }

  const errors = {};
  const changes = {};

  if (payload.title !== undefined) {
    changes.title = validateTitle(payload.title, errors);
  }

  if (payload.module !== undefined) {
    changes.module = validateModule(payload.module, errors);
  }

  if (payload.steps !== undefined) {
    changes.steps = validateSteps(payload.steps, errors);
  }

  if (payload.priority !== undefined) {
    changes.priority = validateEnum(
      payload.priority,
      PRIORITIES,
      'priority',
      'Недопустимый приоритет',
      errors,
    );
  }

  if (payload.status !== undefined) {
    changes.status = validateEnum(
      payload.status,
      STATUSES,
      'status',
      'Недопустимый статус',
      errors,
    );
  }

  throwValidationErrors(errors);

  const existing = await repository.findById(id);

  if (!existing) {
    throw httpError(404, 'Тест-кейс не найден');
  }

  changes.updatedAt = new Date().toISOString();

  const updated = await repository.update(id, changes);

  if (!updated) {
    throw httpError(404, 'Тест-кейс не найден');
  }

  return updated;
}

async function remove(id) {
  const existing = await repository.findById(id);

  if (!existing) {
    throw httpError(404, 'Тест-кейс не найден');
  }

  const removed = await repository.remove(id);

  if (!removed) {
    throw httpError(404, 'Тест-кейс не найден');
  }
}

async function stats() {
  const items = await repository.readAll();
  const summary = {
    total: items.length,
    draft: 0,
    in_progress: 0,
    ready: 0,
    high: 0,
  };

  for (const item of items) {
    if (STATUSES.includes(item.status)) {
      summary[item.status] += 1;
    }

    if (item.priority === 'high') {
      summary.high += 1;
    }
  }

  return summary;
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  stats,
};
