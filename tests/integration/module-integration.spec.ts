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
  { id: 'EC01', route: '/projects/1/materials', role: 'supervisor', english: '1. Select a material' },
  { id: 'EC02', route: '/projects/1/attendance', role: 'supervisor', english: 'Quick daily attendance' },
  { id: 'EC03', route: '/projects/1/tasks', role: 'supervisor', english: 'Overdue and upcoming tasks' },
  { id: 'EC04', route: '/projects/1/reports', role: 'contractor', english: 'Contracted project' },
  { id: 'EC05', route: '/projects/1/materials/movements', role: 'supervisor', english: 'Traceable movement history' },
  { id: 'EC06', route: '/projects/1/reports', role: 'supervisor', english: 'Assisted report: completeness review' },
  { id: 'EC07', route: '/projects/1/incidents', role: 'supervisor', english: 'Prioritized project alerts' },
  { id: 'EC09', route: '/projects', role: 'supervisor', english: 'First steps for supervisor' },
] as const;

for (const { id, route, role, english } of cases) {
  test(id + ' - navbar switches original A and integrated B with ES/EN labels', async ({ page }) => {
    await login(page, role);
    await page.goto(route);
    const toggle = page.getByTestId('web-improvements-toggle');
    const panel = page.locator('app-experiment-module-panel');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle).toContainText('Vista original');
    await expect(panel.locator('app-experiment-workbench')).toHaveCount(0);
    await expect(page.locator('.page-heading .page-title')).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.locator('app-experiment-workbench')).toBeVisible();
    await expect(panel.locator('.experiment-card').first()).toBeVisible();

    await page.locator('.language__option[lang="en"]').click();
    await expect(toggle).toContainText('Enhanced view');
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to original view');
    await expect(panel.getByText(english, { exact: true })).toBeVisible();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle).toContainText('Original view');
    await expect(panel.locator('app-experiment-workbench')).toHaveCount(0);
    await expect(page.locator('.page-heading .page-title')).toBeVisible();
  });
}

test('Global preference persists between routes, reload and language changes', async ({ page }) => {
  await login(page);
  const toggle = page.getByTestId('web-improvements-toggle');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await page.goto('/projects/1/materials');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('app-experiment-workbench')).toBeVisible();
  await page.reload();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.language__option[lang="en"]').click();
  await expect(toggle).toContainText('Enhanced view');
  await expect(toggle).toHaveAttribute('aria-label', 'Switch to original view');
  await page.goto('/projects/1/attendance');
  await expect(page.locator('app-experiment-workbench')).toBeVisible();
  await toggle.click();
  await page.goto('/projects/1/materials');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('app-experiment-workbench')).toHaveCount(0);
});

test('EC01 reloads data when navigating from the experiment overview', async ({ page }) => {
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

test('EC01 keeps original inventory and validates mock materials in B', async ({ page }) => {
  await login(page);
  await page.goto('/projects/1/materials');
  await page.getByTestId('web-improvements-toggle').click();
  const panel = page.locator('app-experiment-module-panel');
  const materials = panel.locator('.experiment-field select').first();
  await expect(materials.locator('option')).toHaveCount(5);
  await expect(page.getByRole('row', { name: /Fierro corrugado/ })).toBeVisible();
  await materials.selectOption('4');
  await panel.getByRole('spinbutton', { name: 'Cantidad' }).fill('50');
  await expect(panel.getByText(/El uso supera el stock disponible/)).toBeVisible();
  await expect(panel.getByTestId('ec01-save')).toBeDisabled();
});
