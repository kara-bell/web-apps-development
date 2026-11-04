'use strict';

// Слой маршрутизации.
// Отвечает только за HTTP: параметры запроса, вызов сервиса и ответ.
// Не работает с файлами и не содержит бизнес-правил.

const express = require('express');
const testCaseService = require('../services/testCaseService');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const items = await testCaseService.list(req.query);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await testCaseService.getById(req.params.id);
    res.json(item);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
