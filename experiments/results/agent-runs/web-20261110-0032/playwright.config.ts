import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import base from '../../../playwright.config';

export default defineConfig({
  ...base,
  testDir: resolve(process.cwd(), 'tests/experiments'),
  fullyParallel: true,
  workers: 2,
  retries: 0,
  outputDir: resolve(__dirname, 'traces'),
  reporter: [
    ['list'],
    ['html', { outputFolder: resolve(__dirname, 'html'), open: 'never' }],
    ['junit', { outputFile: resolve(__dirname, 'junit.xml') }],
    ['json', { outputFile: resolve(__dirname, 'playwright.json') }],
  ],
  use: {
    ...base.use,
    trace: 'on',
    launchOptions: { args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1'] },
  },
  webServer: {
    command: 'npm run start -- --configuration development --host 127.0.0.1 --port 4200',
    url: 'http://127.0.0.1:4200/login',
    reuseExistingServer: false,
    timeout: 180000,
  },
});


