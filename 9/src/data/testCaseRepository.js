'use strict';

// Слой доступа к данным.
// Отвечает только за чтение и запись JSON-файла.
// Не знает про HTTP, Express и бизнес-правила.

const path = require('node:path');
const fs = require('node:fs/promises');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'test-cases.json');

async function writeAll(items) {
  if (!Array.isArray(items)) {
    throw new Error('Файл данных должен содержать массив тест-кейсов');
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
}

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
  const items = await readAll();
  items.push(item);
  await writeAll(items);
  return item;
}

async function update(id, changes) {
  const items = await readAll();
  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  items[index] = { ...items[index], ...changes };
  await writeAll(items);
  return items[index];
}

async function remove(id) {
  const items = await readAll();
  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    return false;
  }

  items.splice(index, 1);
  await writeAll(items);
  return true;
}

module.exports = {
  readAll,
  findById,
  insert,
  update,
  remove,
};
