import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const command = resolve('node_modules', '.bin', process.platform === 'win32' ? 'playwright.cmd' : 'playwright');
const args = ['test', '--config', 'experiments/playwright.config.ts'];
const result = spawnSync(command, args, {
  stdio: 'inherit',
  env: { ...process.env, AB_FULL: '1' },
});
if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
