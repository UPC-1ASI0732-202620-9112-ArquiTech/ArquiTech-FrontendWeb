import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

const full = process.env.AB_FULL === '1';
const visitsPerCondition = full ? 200 : 2;
type Variant = 'A' | 'B';

interface Visit {
  id: string;
  variant: Variant;
  segment: string | null;
  status: 'passed' | 'failed';
  duration_ms: number;
  started_at: string;
  event_types: string[];
  error: string | null;
  screenshot: string | null;
}

for (const variant of ['A', 'B'] as Variant[]) {
  test('EC10: ' + variant + ' - route and visitor events', async ({ browser }, testInfo) => {
    const dir = join(process.cwd(), 'test-results/ab-landing/records');
    mkdirSync(dir, { recursive: true });
    const records: Visit[] = [];
    for (let i = 0; i < visitsPerCondition; i++) {
      const visitorId = 'ec10-' + variant.toLowerCase() + '-' + String(i + 1).padStart(3, '0');
      const context = await browser.newContext();
      const page = await context.newPage();
      await context.addInitScript((id) => {
        localStorage.setItem('arquitech-ec10-visitor-id', id);
      }, visitorId);

      let status: Visit['status'] = 'passed';
      let error: string | null = null;
      let screenshot: string | null = null;
      let eventTypes: string[] = [];
      const startedAt = new Date().toISOString();
      const start = performance.now();

      try {
        await page.goto('/experiment/ec10?testVariant=' + variant);
        if (variant === 'A') {
          await expect(page.locator('at-landing')).toBeVisible();
          await expect(page.locator('at-landing #home h1')).toBeVisible();
        } else {
          await expect(page.locator('.ec10-form')).toBeVisible();
          const segmentButton = i % 2 === 0 ? 'Soy supervisor' : 'Soy contratante';
          await page.getByRole('button', { name: segmentButton }).click();
          await expect(page.locator('.ec10-segments button.is-active')).toContainText(
            i % 2 === 0 ? 'supervisor' : 'contratante',
          );
          await expect(page.getByRole('button', { name: 'Preparar solicitud de demostración' })).toBeVisible();
        }
        const observed = await page.evaluate(() => ({
          id: localStorage.getItem('arquitech-ec10-visitor-id'),
          events: JSON.parse(sessionStorage.getItem('arquitech-ec10-events') ?? '[]') as {
            type: string; variant: string; visitorId: string;
          }[],
        }));
        expect(observed.id).toBe(visitorId);
        expect(observed.events.length).toBeGreaterThan(0);
        expect(observed.events[0]).toMatchObject({
          type: 'view', variant, visitorId,
        });
        eventTypes = observed.events.map((event) => event.type);

        // Persistence check for one visit per condition; not 200 fake conversions.
        if (i === 0) {
          await page.reload();
          await expect(page.locator(variant === 'A' ? 'at-landing' : '.ec10-form')).toBeVisible();
          const afterReload = await page.evaluate(() => localStorage.getItem('arquitech-ec10-visitor-id'));
          expect(afterReload).toBe(visitorId);
        }
      } catch (caught) {
        status = 'failed';
        error = String(caught);
      } finally {
        if (i < 2 || status === 'failed') {
          const filename = variant + '-' + visitorId + '.png';
          try {
            await page.screenshot({ path: join(dir, filename), fullPage: true, timeout: 5000 });
            screenshot = filename;
          } catch { /* preserve the error even if the page was closed */ }
        }
        records.push({
          id: visitorId, variant, status,
          segment: variant === 'B' ? (i % 2 === 0 ? 'supervisor' : 'contractor') : null,
          started_at: startedAt,
          duration_ms: Math.round(performance.now() - start),
          event_types: eventTypes, error, screenshot,
        });
        writeFileSync(join(dir, 'EC10-' + variant + '.json'), JSON.stringify({
          experiment: 'EC10',
          condition: variant,
          coverage: full ? '200 isolated browser visits' : '2 isolated browser visits',
          result_kind: 'automated-browser-technical-interactions',
          qualification: 'Opening a mailto draft is not a sent commercial lead. No actual conversion or acquisition cost is measured.',
          records,
        }, null, 2));
        await context.close();
      }
    }
    await testInfo.attach('EC10-' + variant + '-visits', {
      body: Buffer.from(JSON.stringify(records, null, 2)),
      contentType: 'application/json',
    });
    expect(records.filter((record) => record.status === 'failed')).toEqual([]);
    expect(records).toHaveLength(visitsPerCondition);
  });
}
