'use strict';

const app = require('./src/app');

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`QualityHub · Реестр тест-кейсов: http://localhost:${PORT}`);
});
