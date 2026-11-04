require('dotenv').config({ quiet: true });

const mongoose = require('mongoose');

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const TestCase = require('../src/models/TestCase');

async function cleanup() {
  await connectDB();

  const users = await User.find({ email: /^e2e_/i }).select('_id email');
  const ids = users.map((user) => user._id);

  const cases = await TestCase.deleteMany({ owner: { $in: ids } });
  const removedUsers = await User.deleteMany({ _id: { $in: ids } });

  console.log(
    `Удалено тестовых пользователей: ${removedUsers.deletedCount}, тест-кейсов: ${cases.deletedCount}`
  );

  await mongoose.disconnect();
}

cleanup().catch(async (error) => {
  console.error('Ошибка очистки тестовых данных:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
