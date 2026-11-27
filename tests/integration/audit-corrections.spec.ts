import { test, expect, type Page } from '@playwright/test';

/**
 * System tests for the corrections of the received UX audit (section 6.4.2.4).
 * They run against the local mock backend only.
 */
async function login(page: Page) {
  await page.goto('/login');
  const account = page.locator('.demo__account').filter({ hasText: 'supervisor@arquitech.demo' });
  await expect(account).toBeVisible();
  await account.click();
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/projects(?:$|\?)/);
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

test('#5 #19 recovery help gives a support mailto and the password has no fake placeholder', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('#password')).not.toHaveAttribute('placeholder', /•/);
  await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
  const help = page.getByTestId('recovery-help');
  await expect(help).toContainText('contacto@arquitech.com');
  await expect(help.getByRole('link')).toHaveAttribute(
    'href',
    'mailto:contacto@arquitech.com?subject=Restablecer%20contrase%C3%B1a',
  );
  await expect(page.getByTestId('support-link')).toHaveAttribute('href', /^mailto:contacto@arquitech\.com\?subject=/);
});

test('#25 the hint sits under Proyectos and the row action says "Abrir proyecto"', async ({ page }) => {
  await login(page);
  const hint = page.getByTestId('nav-select-project-hint');
  await expect(hint).toHaveText(/Selecciona un proyecto para ver sus módulos/);
  const projects = page.locator('.nav__list > li').first();
  const projectsBox = (await projects.boundingBox())!;
  const hintBox = (await hint.boundingBox())!;
  expect(hintBox.y).toBeGreaterThan(projectsBox.y);
  expect(hintBox.y - (projectsBox.y + projectsBox.height)).toBeLessThan(20);
  await expect(page.getByRole('link', { name: /Abrir proyecto/ }).first()).toBeVisible();
});

test('#3 attendance shows the "hoy" chip, its own empty state and previous days', async ({ page }) => {
  await login(page);
  await page.goto('/projects/1/attendance');
  const chip = page.getByTestId('attendance-today-chip');
  await expect(chip).toContainText('Mostrando: hoy');
  await expect(page.getByText('No hay resultados para tu búsqueda')).toHaveCount(0);
  await expect(page.getByText('Aún no se registra asistencia hoy')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver días anteriores' })).toBeVisible();
  await chip.getByRole('button').click();
  await expect(chip).toHaveCount(0);
  // Without the default date filter the whole history (empty in the mock seed) is shown.
  await expect(page.getByText('Aún no se registra asistencia hoy')).toHaveCount(0);
  await expect(page.getByText('No hay resultados para tu búsqueda')).toHaveCount(0);
});

test('#17 #18 #19 #24 material form marks required fields, lists units and uses the primary button', async ({ page }) => {
  await login(page);
  await page.goto('/projects/1/materials');
  await page.getByRole('button', { name: 'Añadir material' }).first().click();
  const dialog = page.locator('form.dialog');
  await expect(dialog.locator('.form-legend')).toContainText('Campo obligatorio');
  const nameLabel = dialog.locator('label[for="material-name"]');
  expect(await nameLabel.evaluate((el) => getComputedStyle(el, '::after').content)).toContain('*');
  const unit = dialog.locator('select#material-unit');
  await expect(unit.locator('option')).toContainText(['kg', 't', 'm', 'm²', 'm³', 'unidad', 'bolsa', 'varilla', 'litro', 'galón']);
  await unit.selectOption({ label: 'Otra' });
  await expect(dialog.locator('#material-unit-other')).toBeVisible();
  await expect(dialog.locator('#material-ruc')).toHaveAttribute('placeholder', '11 dígitos');
  const submit = dialog.locator('button[type="submit"]');
  await expect(submit).toHaveClass(/btn--primary/);
  const color = await submit.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(color).toBe('rgb(196, 53, 8)');
});

test('#20 #26 inventory columns explain their values and the inactive tab has enough contrast', async ({ page }) => {
  await login(page);
  await page.goto('/projects/1/materials');
  for (const name of ['Ingresado', 'Disponible', 'Último movimiento']) {
    await expect(page.getByRole('columnheader', { name })).toBeVisible();
  }
  const inactive = page.locator('.tabs__link:not(.is-active)').first();
  const color = await inactive.evaluate((el) => getComputedStyle(el).color);
  expect(color).toBe('rgb(95, 90, 85)');
});

test('#23 the weekly report adapts plurals and uses "Incidentes"', async ({ page }) => {
  await login(page);
  await page.goto('/projects/1/reports');
  const kpis = page.locator('.kpi__context');
  await expect(kpis.first()).toBeVisible();
  const text = (await page.locator('app-weekly-report').innerText()).replace(/\s+/g, ' ');
  expect(text).not.toMatch(/\b1 (entradas|salidas|tareas|materiales)\b/);
  expect(text).not.toContain('material(es)');
  expect(text).not.toMatch(/Incidencias/);
});

for (const width of [360, 390, 414]) {
  test(`#4 #12 at ${width}px the topbar fits and tables become cards with visible actions`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await login(page);
    await page.getByTestId('web-improvements-toggle').click();
    await page.goto('/projects/1/materials');
    await expect(page.locator('app-material-list tbody tr').first()).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

    const avatar = (await page.locator('.user').boundingBox())!;
    expect(avatar.x + avatar.width).toBeLessThanOrEqual(width);

    const row = page.locator('app-material-list tbody tr').first();
    const rowBox = (await row.boundingBox())!;
    expect(rowBox.width).toBeLessThanOrEqual(width);
    const actions = row.locator('td.cell-actions button');
    await expect(actions).toBeVisible();
    const actionBox = (await actions.boundingBox())!;
    expect(actionBox.x + actionBox.width).toBeLessThanOrEqual(width);
    await expect(row.locator('td[data-label="Disponible"]')).toBeVisible();

    for (const route of ['/projects', '/projects/1/tasks', '/projects/1/workers', '/projects/1/incidents', '/projects/1/attendance']) {
      await page.goto(route);
      await expect(page.locator('.page-heading .page-title')).toBeVisible();
      expect(await horizontalOverflow(page), route).toBeLessThanOrEqual(0);
    }
  });
}
