const path = require('path');
const express = require('express');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const testCaseRoutes = require('./routes/testCases');
const userRoutes = require('./routes/users');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();

app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get(['/users', '/users/'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'users.html'));
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: Math.round(process.uptime()) });
});

app.use('/api/auth', authRoutes);
app.use('/api/test-cases', testCaseRoutes);
app.use('/api/users', userRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
