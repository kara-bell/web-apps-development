const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('Не задан MONGO_URI в файле .env');
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log(`MongoDB подключена: ${mongoose.connection.name}`);

  return mongoose.connection;
}

module.exports = connectDB;
