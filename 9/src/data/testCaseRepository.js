'use strict';

// Слой доступа к данным.
// Отвечает только за чтение и запись JSON-файла.
// Не знает про HTTP, Express и бизнес-правила.

const path = require('node:path');
const fs = require('node:fs/promises');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'test-cases.json');

async function readAll() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    const items = JSON.parse(raw);

    if (!Array.isArray(items)) {
      throw new Error('Файл данных должен содержать массив тест-кейсов');
    }

    return items;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }

    throw err;
  }
}

async function findById(id) {
  const items = await readAll();
  return items.find((item) => item.id === id) || null;
}

async function insert(item) {
  throw new Error('insert будет реализован на этапе 5');
}

async function update(id, changes) {
  throw new Error('update будет реализован на этапе 5');
}

async function remove(id) {
  throw new Error('remove будет реализован на этапе 5');
}

module.exports = {
  readAll,
  findById,
  insert,
  update,
  remove,
};
