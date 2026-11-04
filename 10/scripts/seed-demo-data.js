require('dotenv').config({ quiet: true });

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const TestCase = require('../src/models/TestCase');

const DEMO_PASSWORD = 'Demo12345!';

const demoUsers = [
  { name: 'Анна Смирнова', email: 'anna@test.ru' },
  { name: 'Иван Петров', email: 'ivan@test.ru' },
  { name: 'Мария Кузнецова', email: 'maria@test.ru' }
];

const demoCases = [
  {
    ownerEmail: 'petr@test.ru',
    title: 'Вход с корректными данными',
    module: 'Авторизация',
    priority: 'high',
    status: 'ready',
    steps: 'Открыть страницу входа\nВвести корректный e-mail и пароль\nНажать «Войти»\nПроверить открытие реестра тест-кейсов'
  },
  {
    ownerEmail: 'petr@test.ru',
    title: 'Вход с неверным паролем',
    module: 'Авторизация',
    priority: 'medium',
    status: 'in_progress',
    steps: 'Открыть страницу входа\nВвести корректный e-mail и неверный пароль\nНажать «Войти»\nПроверить сообщение об ошибке'
  },
  {
    ownerEmail: 'anna@test.ru',
    title: 'Поиск тест-кейса по названию',
    module: 'Реестр',
    priority: 'medium',
    status: 'ready',
    steps: 'Открыть реестр тест-кейсов\nВвести часть названия в поле поиска\nПроверить, что остались только подходящие записи'
  },
  {
    ownerEmail: 'ivan@test.ru',
    title: 'Фильтр по высокому приоритету',
    module: 'Реестр',
    priority: 'high',
    status: 'draft',
    steps: 'Открыть реестр тест-кейсов\nВыбрать приоритет «Высокий»\nПроверить список и активную плашку сводки'
  },
  {
    ownerEmail: 'maria@test.ru',
    title: 'Просмотр чужого тест-кейса',
    module: 'Права доступа',
    priority: 'high',
    status: 'ready',
    steps: 'Войти под другим пользователем\nОткрыть чужой тест-кейс\nУбедиться, что поля доступны только для чтения, а кнопок изменения и удаления нет'
  }
];

async function seed() {
  await connectDB();

  const petr = await User.findOne({ email: 'petr@test.ru' });
  if (!petr) {
    throw new Error('Пользователь petr@test.ru не найден. Создайте его в приложении и повторите запуск.');
  }

  const owners = { 'petr@test.ru': petr };

  for (const data of demoUsers) {
    let user = await User.findOne({ email: data.email });
    if (user) {
      console.log(`Пользователь уже существует: ${data.email}`);
    } else {
      const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
      user = await User.create({ ...data, passwordHash });
      console.log(`Создан пользователь: ${data.email}`);
    }
    owners[data.email] = user;
  }

  for (const data of demoCases) {
    const owner = owners[data.ownerEmail];
    const existing = await TestCase.findOne({ owner: owner._id, title: data.title });
    if (existing) {
      console.log(`Тест-кейс уже существует: «${data.title}» (${data.ownerEmail})`);
      continue;
    }

    await TestCase.create({
      owner: owner._id,
      title: data.title,
      module: data.module,
      priority: data.priority,
      status: data.status,
      steps: data.steps
    });
    console.log(`Создан тест-кейс: «${data.title}» (${data.ownerEmail})`);
  }

  const users = await User.countDocuments({});
  const cases = await TestCase.countDocuments({});
  console.log(`\nИтого: пользователей — ${users}, тест-кейсов — ${cases}.`);
  console.log(`Пароль демонстрационных пользователей: ${DEMO_PASSWORD}`);

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error('Ошибка заполнения данных:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
