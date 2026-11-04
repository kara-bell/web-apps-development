require('dotenv').config({ quiet: true });

const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = Number(process.env.PORT || 3010);

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`QualityHub · Реестр тест-кейсов: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Не удалось запустить сервер:', error.message);
    process.exit(1);
  }
}

start();
