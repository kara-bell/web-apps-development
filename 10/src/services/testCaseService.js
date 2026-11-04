const mongoose = require('mongoose');

const testCaseRepository = require('../data/testCaseRepository');
const AppError = require('../utils/AppError');
const {
  PRIORITIES,
  STATUSES,
  validateTestCase,
  escapeRegex
} = require('../utils/validation');

function assertId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(404, 'Тест-кейс не найден');
  }
}

function buildFilter(query = {}) {
  const filter = {};

  const search = typeof query.search === 'string' ? query.search.trim() : '';
  if (search) {
    if (search.length > 100) {
      throw new AppError(400, 'Поисковый запрос слишком длинный');
    }
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: regex }, { module: regex }, { steps: regex }];
  }

  if (query.priority) {
    if (!PRIORITIES.includes(query.priority)) {
      throw new AppError(400, 'Недопустимый приоритет в фильтре');
    }
    filter.priority = query.priority;
  }

  if (query.status) {
    if (!STATUSES.includes(query.status)) {
      throw new AppError(400, 'Недопустимый статус в фильтре');
    }
    filter.status = query.status;
  }

  return filter;
}

async function list(query) {
  return testCaseRepository.findAll(buildFilter(query));
}

async function stats() {
  return testCaseRepository.stats();
}

async function create(ownerId, input) {
  const data = validateTestCase(input);
  const testCase = await testCaseRepository.create({ ...data, owner: ownerId });
  await testCase.populate('owner', 'name');
  return testCase;
}

async function get(id) {
  assertId(id);
  const testCase = await testCaseRepository.findByIdDetailed(id);
  if (!testCase) throw new AppError(404, 'Тест-кейс не найден');
  return testCase;
}

async function update(ownerId, id, input) {
  assertId(id);

  const existing = await testCaseRepository.findById(id);
  if (!existing) throw new AppError(404, 'Тест-кейс не найден');
  if (String(existing.owner) !== String(ownerId)) {
    throw new AppError(403, 'Изменять можно только свои тест-кейсы');
  }

  const data = validateTestCase(input, { partial: true });
  if (Object.keys(data).length === 0) {
    throw new AppError(400, 'Нет полей для обновления');
  }

  const testCase = await testCaseRepository.updateByIdAndOwner(id, ownerId, data);
  if (!testCase) throw new AppError(404, 'Тест-кейс не найден');
  return testCase;
}

async function remove(ownerId, id) {
  assertId(id);

  const existing = await testCaseRepository.findById(id);
  if (!existing) throw new AppError(404, 'Тест-кейс не найден');
  if (String(existing.owner) !== String(ownerId)) {
    throw new AppError(403, 'Удалять можно только свои тест-кейсы');
  }

  await testCaseRepository.deleteByIdAndOwner(id, ownerId);
}

module.exports = { list, stats, create, get, update, remove };
