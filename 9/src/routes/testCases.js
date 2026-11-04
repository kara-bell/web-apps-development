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

// Маршрут /stats объявлен раньше /:id,
// иначе Express примет "stats" за идентификатор.
router.get('/stats', async (req, res, next) => {
  try {
    const summary = await testCaseService.stats();
    res.json(summary);
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

router.post('/', async (req, res, next) => {
  try {
    const item = await testCaseService.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const item = await testCaseService.update(req.params.id, req.body);
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await testCaseService.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
