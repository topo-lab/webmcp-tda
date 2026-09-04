import { defineConfig } from 'cypress';

export default defineConfig({
  allowCypressEnv: false,
  e2e: {
    baseUrl: 'http://127.0.0.1:5180',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: false,
    viewportWidth: 1440,
    viewportHeight: 1000,
    defaultCommandTimeout: 15_000,
    video: false,
    screenshotOnRunFailure: true,
  },
});
