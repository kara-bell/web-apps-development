'use strict';

const path = require('node:path');
const express = require('express');
const testCasesRouter = require('./routes/testCases');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();
const publicDir = path.join(__dirname, '..', 'public');

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
  });
});

app.use('/api/test-cases', testCasesRouter);

app.use('/api', notFound);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
