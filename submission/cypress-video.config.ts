import { defineConfig } from 'cypress';

export default defineConfig({
  video: true,
  videosFolder: 'submission/video/cypress',
  screenshotOnRunFailure: false,
  e2e: {
    baseUrl: 'https://webmcp-tda.pages.dev',
    specPattern: 'submission/demo-ui.cy.ts',
    supportFile: false,
    viewportWidth: 1440,
    viewportHeight: 900,
    defaultCommandTimeout: 15_000,
  },
});
