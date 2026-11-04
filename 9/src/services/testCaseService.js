'use strict';

// Слой бизнес-логики.
// Отвечает за правила приложения и вызывает слой доступа к данным.
// Не знает про req/res и HTTP-коды.

const repository = require('../data/testCaseRepository');

async function list(filters = {}) {
  const items = await repository.readAll();

  // Фильтрация и сортировка будут добавлены на этапе 4.
  return items;
}

async function getById(id) {
  const item = await repository.findById(id);

  if (!item) {
    const error = new Error('Тест-кейс не найден');
    error.status = 404;
    throw error;
  }

  return item;
}

async function create(payload) {
  throw new Error('create будет реализован на этапе 4');
}

async function update(id, payload) {
  throw new Error('update будет реализован на этапе 4');
}

async function remove(id) {
  throw new Error('remove будет реализован на этапе 4');
}

async function stats() {
  throw new Error('stats будет реализован на этапе 4');
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  stats,
};
