require('dotenv').config({ quiet: true });

const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('Не задан JWT_SECRET в файле .env');
    }

    await connectDB();

    app.listen(PORT, () => {
      console.log(`QualityHub · Личный кабинет: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Не удалось запустить сервер:', error.message);
    process.exit(1);
  }
}

start();
