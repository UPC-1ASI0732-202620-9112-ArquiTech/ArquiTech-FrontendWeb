import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

export default defineConfig({
  testDir: '../tests/integration',
  testMatch: '**/module-integration.spec.ts',
  timeout: 120000,
  expect: { timeout: 15000 },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['junit', { outputFile: resolve(process.cwd(), 'test-results/integrated-web/junit.xml') }],
  ],
  outputDir: resolve(process.cwd(), 'test-results/integrated-web/traces'),
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4201',
    locale: 'es-PE',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run start -- --host 127.0.0.1 --port 4201',
    url: 'http://127.0.0.1:4201/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
