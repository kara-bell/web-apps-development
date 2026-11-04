const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError(404, 'Маршрут не найден'));
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Внутренняя ошибка сервера';
  let fields = err.fields;

  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Проверьте поля формы';
    fields = Object.fromEntries(
      Object.entries(err.errors).map(([key, value]) => [key, value.message])
    );
  }

  if (err.name === 'CastError') {
    status = 400;
    message = 'Некорректный идентификатор';
  }

  if (err.code === 11000) {
    status = 409;
    message = 'Пользователь с таким e-mail уже зарегистрирован';
    fields = { email: 'E-mail уже занят' };
  }

  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Некорректный JSON в запросе';
  }

  if (err.type === 'entity.too.large') {
    status = 413;
    message = 'Слишком большой запрос';
  }

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    error: message,
    ...(fields ? { fields } : {})
  });
}

module.exports = { notFound, errorHandler };
