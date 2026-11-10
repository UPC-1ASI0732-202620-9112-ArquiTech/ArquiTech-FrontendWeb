import { existsSync, readdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

const base = join(process.cwd(), 'test-results/ab-web');
const directory = join(base, 'records');
const files = existsSync(directory)
  ? readdirSync(directory).filter((file) => /^EC\d{2}\.json$/.test(file)).sort()
  : [];
const results = [];

function median(numbers) {
  if (!numbers.length) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

for (const file of files) {
  const document = JSON.parse(readFileSync(join(directory, file), 'utf8'));
  const records = Array.isArray(document.records) ? document.records : [];
  const variants = {};
  for (const variant of ['A', 'B']) {
    const rows = records.filter((r) => r.condition === variant);
    variants[variant] = {
      attempted: rows.length,
      passed: rows.filter((r) => r.status === 'passed').length,
      failed: rows.filter((r) => r.status === 'failed').length,
      median_automated_ms: median(rows.filter((r) => r.status === 'passed').map((r) => r.duration_ms)),
    };
  }
  results.push({ experiment: document.experiment, mode: document.mode, variants });
}

const lines = [
  '# Resultados técnicos de navegación A/B - ArquiTech',
  '',
  'Origen: Playwright con Chrome y backend de demostración aislado. Los tiempos son de ejecución automatizada tras iniciar sesión, no tiempos de participantes humanos.',
  '',
  '| Experimento | A aprobadas / ejecutadas | B aprobadas / ejecutadas | Mediana A (ms) | Mediana B (ms) |',
  '| --- | ---: | ---: | ---: | ---: |',
];
for (const item of results) {
  const a = item.variants.A, b = item.variants.B;
  lines.push('| ' + item.experiment + ' | ' + a.passed + '/' + a.attempted + ' | ' + b.passed + '/' + b.attempted +
    ' | ' + (a.median_automated_ms ?? 'N/D') + ' | ' + (b.median_automated_ms ?? 'N/D') + ' |');
}
lines.push('', 'La aprobación indica que las verificaciones técnicas del recorrido se ejecutaron correctamente. No confirma por sí misma los KPI M01–M11 ni F01–F03, ni demuestra significancia estadística.', '');
if (!files.length) lines.push('No se encontraron archivos de resultados de navegador.', '');
const markdown = lines.join('\n');
writeFileSync(join(base, 'summary.md'), markdown);
writeFileSync(join(base, 'summary.json'), JSON.stringify({
  generated_at: new Date().toISOString(),
  evidence_kind: 'scripted-playwright-browser-evaluation',
  kpi_conclusion: 'not-estimated',
  results,
}, null, 2));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + '\n');
console.log(markdown);
