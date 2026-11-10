import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '../tests/experiments',
  testMatch: '**/ab-smoke.spec.ts',
  timeout: 120000,
  expect: { timeout: 12000 },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/ab-web/html', open: 'never' }],
    ['junit', { outputFile: 'test-results/ab-web/junit.xml' }],
  ],
  outputDir: 'test-results/ab-web/traces',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4200',
    locale: 'es-PE',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run start -- --host 127.0.0.1 --port 4200',
    url: 'http://127.0.0.1:4200/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
