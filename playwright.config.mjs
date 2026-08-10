import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 2,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'tests/e2e/report' }]],
  use: {
    baseURL: 'http://localhost:3888',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chromium'], launchOptions: { args: ['--no-sandbox'] } },
    },
  ],
});
