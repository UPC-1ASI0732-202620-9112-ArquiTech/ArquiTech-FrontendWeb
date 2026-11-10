import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

interface Assignment { participant_id: string; order?: string; condition?: 'A' | 'B' }
interface Plan { experiments: Array<{ id: string; assignments?: Assignment[] }> }
interface Profile { id: string; role: 'supervisor' | 'contractor'; digital_experience: string }
interface Profiles { profiles: Profile[] }
interface Observation {
  experiment: string;
  profile: string;
  role: string;
  condition: 'A' | 'B';
  started_at: string;
  ended_at: string;
  duration_ms: number;
  duration_scope: string;
  status: 'passed' | 'failed';
  checks: string[];
  error: string | null;
  screenshot: string | null;
  execution_kind: string;
}
const plan = JSON.parse(readFileSync(join(process.cwd(), 'experiments/participants/plan.json'), 'utf8')) as Plan;
const profiles = JSON.parse(readFileSync(join(process.cwd(), 'experiments/participants/profiles.json'), 'utf8')) as Profiles;
const allProfiles = new Map(profiles.profiles.map((p) => [p.id, p]));
const FULL = process.env.AB_FULL === '1';

const cases: Record<string, { baseline: string; expected: string }> = {
  EC01: { baseline: '/projects/1/materials', expected: 'Stock y límites de movimiento' },
  EC02: { baseline: '/projects/1/attendance', expected: 'Asistencia y completitud' },
  EC03: { baseline: '/projects/1/tasks', expected: 'Priorización de tareas' },
  EC04: { baseline: '/projects/1/reports', expected: 'Consulta del estado y reporte' },
  EC05: { baseline: '/projects/1/materials/movements', expected: 'Fecha y responsable del movimiento' },
  EC06: { baseline: '/projects/1/reports', expected: 'Informe y campos obligatorios' },
  EC07: { baseline: '/projects/1/incidents', expected: 'Incidencias críticas abiertas' },
  EC09: { baseline: '/projects/1/materials', expected: 'Guía de incorporación por rol' },
};

async function loginDemo(page: Page, role: Profile['role']): Promise<void> {
  await page.goto('/login');
  const email = role === 'supervisor' ? 'supervisor@arquitech.demo' : 'contratante@arquitech.demo';
  // The demo login is present ONLY when Angular runs with its isolated in-browser mock.
  const account = page.locator('.demo__account').filter({ hasText: email });
  await expect(account, 'Se requiere el backend mock local; nunca iniciar sesión en producción.').toBeVisible();
  await account.click();
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/projects(?:$|\?)/);
}

async function inspect(page: Page, id: string, condition: 'A' | 'B'): Promise<string[]> {
  const assertions: string[] = [];
  const baseline = cases[id].baseline;
  await page.goto(condition === 'A' ? baseline : '/projects/1/experiments/' + id);
  await expect(page.locator('.page-heading .page-title')).toBeVisible();
  assertions.push('ruta disponible y vista principal cargada');

  if (condition === 'A') {
    switch (id) {
      case 'EC01':
        await expect(page.getByRole('row', { name: /Fierro corrugado/ })).toBeVisible();
        assertions.push('inventario de referencia visible');
        break;
      case 'EC02':
        await expect(page.locator('app-attendance-list')).toBeVisible();
        assertions.push('formulario de asistencia disponible');
        break;
      case 'EC03':
        await expect(page.locator('app-task-list tbody tr').first()).toBeVisible();
        assertions.push('listado de tareas disponible');
        break;
      case 'EC04':
      case 'EC06':
        await expect(page.locator('.report-grid').first()).toBeVisible();
        assertions.push('reporte semanal actual visible');
        break;
      case 'EC05':
        await expect(page.locator('app-material-movements tbody tr').first()).toBeVisible();
        assertions.push('historial de movimientos disponible');
        break;
      case 'EC07':
        await expect(page.locator('app-incident-list tbody tr').first()).toBeVisible();
        assertions.push('listado de incidencias disponible');
        break;
      case 'EC09':
        await expect(page.locator('app-material-list tbody tr').first()).toBeVisible();
        assertions.push('módulo de primera tarea accesible sin guía');
        break;
    }
    return assertions;
  }

  switch (id) {
    case 'EC01': {
      const material = page.locator('.experiment-field select').first();
      await expect(material).toBeVisible();
      await material.selectOption('4');
      const quantity = page.locator('.experiment-field input[type="number"]');
      await quantity.fill('50');
      await expect(page.getByText(/El uso supera el stock disponible/)).toBeVisible();
      await expect(page.getByTestId('ec01-save')).toBeDisabled();
      assertions.push('se bloquea un uso que excede las existencias');
      await quantity.fill('10');
      await expect(page.getByTestId('ec01-save')).toBeEnabled();
      await page.getByTestId('ec01-save').click();
      await expect(page.locator('.experiment-success')).toContainText('registrado');
      assertions.push('se registra un uso válido exclusivamente en el mock');
      break;
    }
    case 'EC02': {
      const rows = page.locator('.experiment-table tbody tr');
      await expect(rows).toHaveCount(12);
      await expect(page.getByRole('button', { name: 'Guardar asistencia de ensayo' })).toBeDisabled();
      for (let index = 0; index < 12; index++) {
        await rows.nth(index).locator('select').selectOption('PRESENT');
      }
      await expect(page.getByRole('button', { name: 'Guardar asistencia de ensayo' })).toBeEnabled();
      await page.getByRole('button', { name: 'Guardar asistencia de ensayo' }).click();
      await expect(page.locator('.experiment-success')).toContainText('12 registros nuevos');
      assertions.push('doce registros completos guardados en el mock');
      break;
    }
    case 'EC03':
      await expect(page.locator('.experiment-list li')).toHaveCount(5);
      await expect(page.getByRole('heading', { name: 'Tareas vencidas y próximas a vencer', exact: true })).toBeVisible();
      assertions.push('cinco tareas presentadas con jerarquía de prioridad');
      break;
    case 'EC04':
      await expect(page.getByTestId('ec04-status')).toHaveText('ACTIVE');
      await expect(page.getByTestId('ec04-progress')).toContainText('62');
      await page.getByTestId('ec04-weekly-report-link').click();
      await expect(page.locator('.report-grid').first()).toBeVisible();
      assertions.push('estado, avance y navegación al reporte verificados');
      break;
    case 'EC05':
      await expect(page.locator('.experiment-table tbody tr').first()).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Responsable' })).toBeVisible();
      await expect(page.getByRole('cell', { name: 'Carlos Mendoza' }).first()).toBeVisible();
      assertions.push('responsable y fecha expuestos en historial');
      break;
    case 'EC06':
      await expect(page.getByRole('heading', { name: /Reporte asistido/ })).toBeVisible();
      await expect(page.locator('.experiment-checklist li')).toHaveCount(9);
      await expect(page.getByRole('button', { name: /Generar PDF/ })).toBeEnabled();
      assertions.push('nueve campos de revisión y exportación disponible');
      break;
    case 'EC07':
      await expect(page.getByTestId('ec07-critical-count')).toContainText('1 alertas críticas');
      await page.getByRole('button', { name: 'Revisar detalle' }).first().click();
      await expect(page.locator('.experiment-alert strong')).toBeVisible();
      assertions.push('priorización y detalle de incidencia crítica');
      break;
    case 'EC09': {
      const checks = page.locator('.experiment-guide input[type="checkbox"]');
      await expect(checks).toHaveCount(3);
      await checks.first().check();
      await expect(page.getByText('Progreso de la guía: 1 de 3 pasos.')).toBeVisible();
      await page.reload();
      await expect(checks.first()).toBeChecked();
      assertions.push('guía por rol y persistencia del primer paso');
      break;
    }
  }
  return assertions;
}

for (const [id, scenario] of Object.entries(cases)) {
  test(id + ': smoke A/B - ' + scenario.expected, async ({ browser }, testInfo) => {
    test.setTimeout(FULL ? 900000 : 120000);
    const current = plan.experiments.find((experiment) => experiment.id === id);
    if (!current?.assignments) throw new Error('Falta asignación en el plan para ' + id);
    // Smoke: one assigned profile. Full: the complete cohort from the research plan.
    const selected = FULL ? current.assignments : id === 'EC09'
      ? [current.assignments.find((assignment) => assignment.condition === 'A')!,
         current.assignments.find((assignment) => assignment.condition === 'B')!]
      : current.assignments.slice(0, 1);
    const records: Observation[] = [];
    const destination = join(process.cwd(), 'test-results/ab-web/records');
    mkdirSync(destination, { recursive: true });

    for (const assignment of selected) {
      const profile = allProfiles.get(assignment.participant_id);
      if (!profile) throw new Error('Perfil no encontrado: ' + assignment.participant_id);
      const sequence = assignment.condition
        ? [assignment.condition]
        : assignment.order === 'B-A' ? ['B', 'A'] as const : ['A', 'B'] as const;

      for (const condition of sequence) {
        const ctx = await browser.newContext({
          viewport: { width: profile.digital_experience === 'beginner' ? 1100 : 1440, height: 900 },
        });
        const page = await ctx.newPage();
        let checks: string[] = [];
        let error: string | null = null;
        let status: Observation['status'] = 'passed';
        let image: string | null = null;
        let started = new Date().toISOString();
        let start = performance.now();
        try {
          await loginDemo(page, profile.role);
          started = new Date().toISOString();
          start = performance.now();
          checks = await inspect(page, id, condition);
        } catch (caught) {
          status = 'failed';
          error = String(caught);
        } finally {
          const finished = new Date().toISOString();
          const elapsed = Math.round(performance.now() - start);
          const file = id + '-' + assignment.participant_id + '-' + condition + '.png';
          try {
            await page.screenshot({ path: join(destination, file), fullPage: true, timeout: 5000 });
            image = file;
          } catch { /* The page may have crashed; retain failure as evidence. */ }
          records.push({
            experiment: id, profile: profile.id, role: profile.role, condition,
            started_at: started, ended_at: finished,
            duration_ms: elapsed, duration_scope: 'post-login route navigation and scripted task verification',
            status, checks, error, screenshot: image,
            execution_kind: 'playwright-scripted-browser-smoke',
          });
          writeFileSync(join(destination, id + '.json'), JSON.stringify({
            experiment: id, mode: FULL ? 'full scripted cohort' : 'one-profile smoke',
            baseline: 'existing A routes on evaluation branch',
            treatment: 'B routes on evaluation branch',
            source: 'real browser actions on isolated Angular mock',
            inferential_limits: 'Not human participant usability, time or financial KPIs',
            generated_at: new Date().toISOString(),
            records,
          }, null, 2));
          await ctx.close();
        }
      }
    }
    await testInfo.attach(id + '-observations', {
      body: Buffer.from(JSON.stringify(records, null, 2)),
      contentType: 'application/json',
    });
    expect(records.filter((record) => record.status === 'failed'),
      'Se detectaron recorridos fallidos; revisar sus registros y capturas.').toEqual([]);
  });
}
