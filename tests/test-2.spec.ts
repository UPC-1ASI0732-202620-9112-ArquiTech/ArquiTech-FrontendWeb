import { test, expect } from '@playwright/test';

test('supervisor cannot register machinery with a repeated serial number in the same project', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'English' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('supervisor@arquitech.demo');
  await page.getByRole('textbox', { name: 'Password' }).fill('Supervisor2026!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByText('Torre Residencial Norte').click();
  await page.getByRole('link', { name: 'Machinery' }).click();
  await expect(page.getByRole('cell', { name: 'MIX123' })).toBeVisible();
  await page.getByRole('button', { name: 'Add machinery' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Name or type' }).fill('Mezcladora nueva');
  await dialog.getByRole('textbox', { name: 'Plate or serial number' }).fill('MIX123');
  await dialog.getByRole('button', { name: 'Register machinery' }).click();
  await expect(dialog.getByText('A machine with that plate already exists on this site.')).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Plate or serial number' }).fill('MIX999');
  await dialog.getByRole('button', { name: 'Register machinery' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('cell', { name: 'MIX999' })).toBeVisible();
});