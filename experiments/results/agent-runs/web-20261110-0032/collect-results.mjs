import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const load = (name) => JSON.parse(readFileSync(join(root, name), 'utf8'));
const plan = load('../../../participants/plan.json');
const profiles = new Map(load('../../../participants/profiles.json').profiles.map((profile) => [profile.id, profile]));
const runner = load('playwright.json');
const traces = readdirSync(join(root, 'traces'), { recursive: true }).filter((path) => path.endsWith('trace.zip'));
const rows = [];
const summary = [];

for (const experiment of plan.experiments.filter(({ platform }) => platform === 'web')) {
  const id = experiment.id;
  const records = load(`records/${id}.json`).records;
  const expected = experiment.assignments.flatMap(({ participant_id, order, condition }) =>
    (condition ? [condition] : order.split('-')).map((variant) => `${participant_id}/${variant}`));
  const actual = records.map(({ profile, condition }) => `${profile}/${condition}`);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error(`Asignación u orden inesperado en ${id}`);
  const trace = traces.find((path) => path.includes(`-${id}-`));
  if (!trace) throw new Error(`Falta la traza de ${id}`);

  for (const record of records) {
    const evidence = record.screenshot ? `records/${record.screenshot}` : null;
    if (evidence && !existsSync(join(root, evidence))) throw new Error(`Falta ${evidence}`);
    if (record.role !== profiles.get(record.profile).role) throw new Error(`Rol inesperado en ${id}/${record.profile}`);
    rows.push({
      experiment_id: id,
      profile_id: record.profile,
      role: record.role,
      condition: record.condition,
      task_id: `${id}-technical-smoke`,
      objective: experiment.task,
      started_at: record.started_at,
      ended_at: record.ended_at,
      duration_seconds: record.duration_ms / 1000,
      duration_scope: record.duration_scope,
      outcome_correct: null,
      attempt_count: null,
      help_requested: null,
      technical_status: record.status,
      checks_observed: record.checks,
      model_decision: null,
      failure_reason: record.error,
      evidence_path: evidence,
      trace_path: `traces/${trace.replaceAll('\\', '/')}`,
    });
  }

  const conditions = Object.fromEntries(['A', 'B'].map((condition) => {
    const subset = records.filter((record) => record.condition === condition);
    return [condition, { recorded: subset.length, passed: subset.filter(({ status }) => status === 'passed').length }];
  }));
  summary.push({ experiment_id: id, conditions });
}

const columns = ['experiment_id', 'profile_id', 'role', 'condition', 'task_id', 'started_at', 'ended_at',
  'duration_seconds', 'outcome_correct', 'attempt_count', 'help_requested', 'technical_status', 'failure_reason',
  'evidence_path', 'trace_path'];
const csv = (value) => `"${String(value ?? 'not_measured').replaceAll('"', '""')}"`;
writeFileSync(join(root, 'outcomes.csv'), [columns.join(','), ...rows.map((row) =>
  columns.map((column) => csv(row[column])).join(','))].join('\n') + '\n');
writeFileSync(join(root, 'observations.jsonl'), rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
const result = {
  mode: 'scripted-playwright-browser-smoke',
  runner_stats: runner.stats,
  recorded: rows.length,
  passed: rows.filter(({ technical_status }) => technical_status === 'passed').length,
  failed: rows.filter(({ technical_status }) => technical_status === 'failed').length,
  screenshots: rows.filter(({ evidence_path }) => evidence_path).length,
  suite_traces: traces.length,
  experiments: summary,
};
writeFileSync(join(root, 'summary.json'), JSON.stringify(result, null, 2) + '\n');
console.log(result);
