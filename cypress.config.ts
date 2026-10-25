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
    setupNodeEvents(on) {
      // Give the headless window room for the 1440-px desktop viewport so screenshots are not scaled or cropped.
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'electron') {
          launchOptions.preferences.width = 1600;
          launchOptions.preferences.height = 1100;
        } else if (browser.family === 'chromium') {
          launchOptions.args.push('--window-size=1600,1100');
        }
        return launchOptions;
      });
    },
  },
});
