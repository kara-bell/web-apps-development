'use strict';

function notFound(req, res) {
  res.status(404).json({ message: 'Маршрут не найден' });
}

function errorHandler(err, req, res, next) {
  const status = Number(err.status) || 500;

  if (status >= 500) {
    console.error(err);
  }

  const payload = {
    message: status >= 500 ? 'Внутренняя ошибка сервера' : err.message,
  };

  if (err.errors) {
    payload.errors = err.errors;
  }

  res.status(status).json(payload);
}

module.exports = { notFound, errorHandler };
