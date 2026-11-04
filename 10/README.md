# QualityHub · Реестр тест-кейсов

Учебное трёхзвенное web-приложение на Node.js, Express и MongoDB. Объединяет личный кабинет из задания 8 и реестр тест-кейсов из задания 9.

**Курс:** «Разработка веб-приложений»
**Задание:** тестирование функциональности и пользовательского интерфейса web-приложения.

## Возможности

- регистрация по имени, e-mail и паролю;
- вход, выход и восстановление сессии по JWT;
- просмотр профиля и удаление аккаунта;
- отдельная страница `/users` со списком пользователей и просмотром их профилей;
- общий реестр тест-кейсов для всех авторизованных пользователей;
- создание тест-кейса с автором;
- просмотр любой записи;
- редактирование, смена статуса и удаление только своих записей;
- поиск по названию, модулю и шагам;
- фильтры по приоритету и статусу;
- сводка по статусам и высокому приоритету;
- модальные окна и адаптивная вёрстка.

Неаутентифицированный пользователь не видит тест-кейсы и список пользователей. Чужие тест-кейсы и профили доступны только для просмотра.

## Стек

| Слой | Технология |
|---|---|
| Клиент | HTML5, CSS3, JavaScript, Fetch API |
| Сервер | Node.js 20+, Express 5 |
| База данных | MongoDB |
| ODM | Mongoose 9 |
| Аутентификация | JSON Web Token |
| Пароли | bcryptjs |
| Безопасность | helmet |

Все данные, включая тест-кейсы, хранятся в MongoDB. Коллекции: `users` и `testcases`.

## Запуск

Требования: Node.js 20+, npm, запущенная MongoDB на `127.0.0.1:27017`.

```powershell
cd 10
Copy-Item .env.example .env
npm install
npm start
```

Приложение откроется по адресу `http://localhost:3000`.

Переменные окружения:

```text
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/qualityhub10
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=24h
```

## Проверка

```powershell
npm run smoke          # API smoke-тест, создаёт и удаляет временные данные
npm run cleanup:test   # удаляет пользователей с e-mail, начинающимся на e2e_
npm run seed:demo      # добавляет демонстрационных пользователей и тест-кейсы
npm run test:e2e       # все автотесты Cypress
npm run test:e2e:open  # интерактивный режим Cypress
```

Для Cypress приложение должно быть запущено на `http://localhost:3000`.

Дополнительные браузеры:

```powershell
npm run test:e2e:chrome
npm run test:e2e:edge
npm run test:e2e:firefox
```

## Демонстрационные данные

Скрипт `seed:demo` создаёт пользователей `anna@test.ru`, `ivan@test.ru`, `maria@test.ru` и пять тест-кейсов. Пароль этих пользователей: `Demo12345!`. Пользователь `petr@test.ru` должен существовать заранее.

Повторный запуск скрипта безопасен: существующие записи не дублируются.

Smoke-тест требует запущенного сервера. Адрес можно переопределить:

```powershell
$env:BASE_URL='http://127.0.0.1:3000'; npm run smoke
```

## API

| Метод | Маршрут | Доступ | Назначение |
|---|---|---|---|
| POST | `/api/auth/register` | гость | регистрация |
| POST | `/api/auth/login` | гость | вход |
| GET | `/api/auth/me` | JWT | профиль |
| DELETE | `/api/auth/me` | JWT | удаление аккаунта и своих тест-кейсов |
| GET | `/api/users` | JWT | список пользователей без приватных полей |
| GET | `/api/test-cases` | JWT | все тест-кейсы с автором |
| GET | `/api/test-cases/stats` | JWT | сводка |
| POST | `/api/test-cases` | JWT | создание |
| GET | `/api/test-cases/:id` | JWT | просмотр любой записи |
| PATCH | `/api/test-cases/:id` | JWT, автор | изменение |
| DELETE | `/api/test-cases/:id` | JWT, автор | удаление |
| GET | `/api/health` | без auth | проверка сервера |

## Структура

```text
10/
├── server.js
├── src/
│   ├── app.js
│   ├── config/db.js
│   ├── models/
│   ├── data/
│   ├── services/
│   ├── routes/
│   ├── middleware/
│   └── utils/
├── public/
│   ├── index.html
│   ├── users.html
│   ├── css/style.css
│   └── js/api.js, js/app.js, js/users.js
├── scripts/
│   ├── smoke.js
│   ├── seed-demo-data.js
│   └── cleanup-test-data.js
├── cypress/
│   ├── e2e/              # auth, test-cases, users, ui
│   └── support/
├── cypress.config.js
└── docs/                 # документы тестирования, не коммитятся
```

## Ограничения

- нет ролей и административной панели;
- нет загрузки файлов и аватаров;
- нет подтверждения e-mail и восстановления пароля;
- нет refresh-токенов и rate limiting;
- JWT хранится в `localStorage`;
- приложение рассчитано на локальный учебный запуск.
