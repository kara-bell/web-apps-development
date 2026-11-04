const express = require('express');

const testCaseService = require('../services/testCaseService');
const authenticate = require('../middleware/auth');
const csrfProtection = require('../middleware/csrf');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate, csrfProtection);

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const stats = await testCaseService.stats();
    res.status(200).json(stats);
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const testCases = await testCaseService.list(req.query);
    res.status(200).json({ items: testCases });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const testCase = await testCaseService.create(req.user._id, req.body);
    res.status(201).json(testCase);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const testCase = await testCaseService.get(req.params.id);
    res.status(200).json(testCase);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const testCase = await testCaseService.update(req.user._id, req.params.id, req.body);
    res.status(200).json(testCase);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await testCaseService.remove(req.user._id, req.params.id);
    res.status(204).end();
  })
);

module.exports = router;
