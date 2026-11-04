const { defineConfig } = require('cypress');
const jwt = require('jsonwebtoken');

require('dotenv').config({ quiet: true });

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://127.0.0.1:3000',
    viewportWidth: 1280,
    viewportHeight: 900,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    setupNodeEvents(on) {
      on('task', {
        expiredToken({ sub }) {
          return jwt.sign({ sub }, process.env.JWT_SECRET, { expiresIn: -10 });
        }
      });
    }
  }
});
