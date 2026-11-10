import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readJson = (relativePath) =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

const profileDoc = readJson('../participants/profiles.json');
const plan = readJson('../participants/plan.json');
const profiles = profileDoc.profiles;
const byId = new Map(profiles.map((profile) => [profile.id, profile]));

assert.equal(profileDoc.evidence_class, 'synthetic-participants');
assert.equal(plan.evidence_class, 'synthetic-experiment-plan');
assert.equal(plan.status, 'configuration-only-not-executed');
assert.equal(plan.recorded_results, 0);
assert.equal(profiles.length, 28, '8 supervisores + 8 contratantes + 12 usuarios nuevos');
assert.equal(byId.size, profiles.length, 'Los identificadores deben ser únicos');
assert.equal(profiles.filter((p) => /^S\d{2}$/.test(p.id) && p.role === 'supervisor').length, 8);
assert.equal(profiles.filter((p) => /^C\d{2}$/.test(p.id) && p.role === 'contractor').length, 8);
assert.equal(profiles.filter((p) => /^N\d{2}$/.test(p.id)).length, 12);

const experiments = plan.experiments;
assert.equal(experiments.length, 10);
assert.equal(new Set(experiments.map((e) => e.id)).size, 10);
const expectedIds = Array.from({ length: 10 }, (_, index) => 'EC' + String(index + 1).padStart(2, '0'));
assert.deepEqual(experiments.map((e) => e.id).sort(), expectedIds);

for (const experiment of experiments) {
  assert.ok(experiment.platform && experiment.unit && experiment.task && experiment.metric_ids.length > 0,
    experiment.id + ': faltan campos fundamentales');

  if (experiment.design === 'within-subject' || experiment.design === 'alternating-periods') {
    const expectedCount = experiment.id === 'EC07' ? 12 : 8;
    assert.equal(experiment.assignments.length, expectedCount, experiment.id + ': tamaño del grupo');
    assert.equal(new Set(experiment.assignments.map((a) => a.participant_id)).size, expectedCount,
      experiment.id + ': participantes duplicados');
    const orders = experiment.assignments.map((a) => a.order);
    assert.equal(orders.filter((order) => order === 'A-B').length, expectedCount / 2,
      experiment.id + ': falta contrabalanceo A-B');
    assert.equal(orders.filter((order) => order === 'B-A').length, expectedCount / 2,
      experiment.id + ': falta contrabalanceo B-A');
    for (const assignment of experiment.assignments) {
      const profile = byId.get(assignment.participant_id);
      assert.ok(profile, experiment.id + ': perfil inexistente ' + assignment.participant_id);
      if (experiment.population === 'supervisor') assert.equal(profile.role, 'supervisor');
      if (experiment.population === 'contractor') assert.equal(profile.role, 'contractor');
    }
  } else if (experiment.id === 'EC09') {
    assert.equal(experiment.assignments.length, 12);
    assert.equal(new Set(experiment.assignments.map((a) => a.participant_id)).size, 12);
    for (const condition of ['A', 'B']) {
      const members = experiment.assignments.filter((a) => a.condition === condition);
      assert.equal(members.length, 6, 'EC09: seis agentes independientes por variante');
      assert.equal(members.filter((a) => byId.get(a.participant_id)?.role === 'supervisor').length, 3,
        'EC09: tres supervisores por variante');
      assert.equal(members.filter((a) => byId.get(a.participant_id)?.role === 'contractor').length, 3,
        'EC09: tres contratantes por variante');
    }
    assert.ok(experiment.assignments.every((a) => byId.has(a.participant_id) && /^N/.test(a.participant_id)));
  } else if (experiment.id === 'EC10') {
    assert.equal(experiment.visitors_per_condition.A, 200);
    assert.equal(experiment.visitors_per_condition.B, 200);
    assert.ok(profileDoc.visitor_templates.length >= 2);
  } else {
    throw new Error(experiment.id + ': diseño no reconocido ' + experiment.design);
  }
}
console.log('OK: 28 perfiles sintéticos y 10 experimentos configurados.');
console.log('OK: grupos A/B, roles, tamaños y contrabalanceo coherentes con el plan.');
console.log('IMPORTANTE: configuración validada; no se han ejecutado pruebas ni generado resultados.');
