import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, role: 'supervisor' | 'contractor' = 'supervisor') {
  await page.goto('/login');
  const email = role === 'supervisor' ? 'supervisor@arquitech.demo' : 'contratante@arquitech.demo';
  const account = page.locator('.demo__account').filter({ hasText: email });
  await expect(account).toBeVisible();
  await account.click();
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/projects(?:$|\?)/);
}

const cases = [
  { id: 'EC01', route: '/projects/1/materials', role: 'supervisor' },
  { id: 'EC02', route: '/projects/1/attendance', role: 'supervisor' },
  { id: 'EC03', route: '/projects/1/tasks', role: 'supervisor' },
  { id: 'EC04', route: '/projects/1/reports', role: 'contractor' },
  { id: 'EC05', route: '/projects/1/materials/movements', role: 'supervisor' },
  { id: 'EC06', route: '/projects/1/reports', role: 'supervisor' },
  { id: 'EC07', route: '/projects/1/incidents', role: 'supervisor' },
  { id: 'EC09', route: '/projects', role: 'supervisor' },
] as const;

for (const { id, route, role } of cases) {
  test(id + ' - B integrada en el módulo original; A permanece disponible', async ({ page }) => {
    await login(page, role);
    await page.goto(route);
    const panel = page.locator('app-experiment-module-panel');
    await expect(panel).toBeVisible();
    const improvement = panel.getByRole('button', { name: new RegExp('^' + id) });
    await expect(improvement).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.locator('app-experiment-workbench')).toBeVisible();
    await panel.getByRole('button', { name: /Versión A/ }).click();
    await expect(panel.locator('app-experiment-workbench')).toHaveCount(0);
    await expect(page.locator('.page-heading .page-title')).toBeVisible();
    await improvement.click();
    await expect(panel.locator('app-experiment-workbench')).toBeVisible();
  });
}

test('EC01 recarga materiales al navegar desde el resumen experimental', async ({ page }) => {
  await login(page);
  await page.goto('/projects/1/experiments/overview');
  await expect(page.getByRole('heading', { name: /Laboratorio experimental/ })).toBeVisible();
  await page.getByRole('link', { name: /Registro guiado de materiales/ }).click();
  await expect(page).toHaveURL(/\/projects\/1\/experiments\/EC01/);
  const materials = page.locator('.experiment-field select').first();
  await expect(materials.locator('option')).toHaveCount(5);
  await materials.selectOption('4');
  await expect(page.getByText(/Stock disponible/)).toBeVisible();
});

test('EC01 utiliza los materiales reales del mock también dentro de Inventario', async ({ page }) => {
  await login(page);
  await page.goto('/projects/1/materials');
  const panel = page.locator('app-experiment-module-panel');
  const materials = panel.locator('.experiment-field select').first();
  await expect(materials.locator('option')).toHaveCount(5);
  await expect(page.getByRole('row', { name: /Fierro corrugado/ })).toBeVisible();
  await materials.selectOption('4');
  await panel.getByRole('spinbutton', { name: 'Cantidad' }).fill('50');
  await expect(panel.getByText(/El uso supera el stock disponible/)).toBeVisible();
  await expect(panel.getByTestId('ec01-save')).toBeDisabled();
});
