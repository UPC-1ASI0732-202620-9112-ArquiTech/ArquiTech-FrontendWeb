import { test, expect } from '@playwright/test';

test('supervisor cannot register a material usage greater than the stock', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'English' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('supervisor@arquitech.demo');
  await page.getByRole('textbox', { name: 'Password' }).fill('Supervisor2026!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByText('Torre Residencial Norte').click();
  const steelStock = page.getByRole('row', { name: /Fierro corrugado/ }).getByRole('cell').nth(2);
  await expect(steelStock).toContainText('40');
  await page.getByRole('button', { name: 'Register usage' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Material', { exact: true }).selectOption({ label: 'Fierro corrugado 3/8" (varilla)' });
  await dialog.getByRole('spinbutton', { name: 'Quantity (varilla)' }).fill('50');
  await dialog.getByRole('button', { name: 'Register usage' }).click();
  await expect(dialog.getByText('The quantity exceeds the available stock (40).')).toBeVisible();
  await dialog.getByRole('spinbutton', { name: 'Quantity (varilla)' }).fill('10');
  await dialog.getByRole('button', { name: 'Register usage' }).click();
  await expect(dialog).toBeHidden();
  await expect(steelStock).toContainText('30');
});