import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: '../tests/experiments',
  testMatch: '**/ec10-browser.spec.ts',
  timeout: 900000,
  expect: { timeout: 12000 },
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [
    ['list'],
    ['html', { outputFolder: resolve(process.cwd(), 'test-results/ab-landing/html'), open: 'never' }],
    ['junit', { outputFile: resolve(process.cwd(), 'test-results/ab-landing/junit.xml') }],
  ],
  outputDir: resolve(process.cwd(), 'test-results/ab-landing/traces'),
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4300',
    locale: 'es-PE',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run start -- --host 127.0.0.1 --port 4300',
    cwd: resolve(process.cwd(), 'landing'),
    url: 'http://127.0.0.1:4300/experiment/ec10',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});
