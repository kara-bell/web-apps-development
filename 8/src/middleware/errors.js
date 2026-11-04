function notFound(req, res) {
  res.status(404).json({ message: 'Маршрут не найден' });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let status = err.status || err.statusCode || 500;
  let message =
    status === 500 ? 'Внутренняя ошибка сервера' : err.message;
  let errors;

  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Проверьте заполнение полей';
    errors = Object.fromEntries(
      Object.entries(err.errors).map(([field, error]) => [
        field,
        error.message,
      ]),
    );
  } else if (err.code === 11000) {
    status = 409;
    message = 'Пользователь с таким e-mail уже зарегистрирован';
    errors = { email: 'Этот e-mail уже занят' };
  } else if (err.name === 'MulterError') {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Файл больше 2 МБ'
        : 'Ошибка загрузки файла';
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Некорректный идентификатор';
  }

  if (status >= 500) {
    console.error(err);
  }

  const payload = { message };

  if (errors) {
    payload.errors = errors;
  }

  res.status(status).json(payload);
}

module.exports = { notFound, errorHandler };
