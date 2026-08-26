import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const results = JSON.parse(
  await readFile(new URL('./agent-economy-model-routing-2026-08-26.json', import.meta.url), 'utf8'),
);

assert.equal(results.schemaVersion, 'create_something_internal_experiment.v0.1');
assert.equal(results.status, 'supported_not_validated');
assert.equal(results.trials.length, 7);

const trial = (id) => {
  const value = results.trials.find((entry) => entry.id === id);
  assert.ok(value, `missing trial: ${id}`);
  return value;
};

const luna = trial('trial-2-luna-high-fanout');
const terra = trial('trial-2-terra-high');
const sol = trial('trial-2-sol-high');
const terraUltra = trial('trial-1-terra-ultra-exact');
const solLowDefault = trial('trial-1-sol-low-default');
const solLowFast = trial('trial-1-sol-low-fast');

for (const subject of [luna, terra, sol]) {
  assert.deepEqual(subject.hidden, { passed: 3, total: 3 });
  assert.deepEqual(subject.mutants, { killed: 5, total: 5 });
  assert.equal(subject.authorizedFilesOnly, true);
}

const percentageReduction = (candidate, baseline) =>
  Number((100 * (1 - candidate / baseline)).toFixed(2));

assert.equal(percentageReduction(luna.creditEquivalent, terra.creditEquivalent), 73.34);
assert.equal(percentageReduction(luna.creditEquivalent, sol.creditEquivalent), 90.57);
assert.equal(
  Number((100 * (luna.criticalPathSeconds / terra.criticalPathSeconds - 1)).toFixed(2)),
  25.66,
);
assert.equal(percentageReduction(luna.criticalPathSeconds, sol.criticalPathSeconds), 23.52);

assert.equal(terraUltra.promptChanged, false);
assert.equal(solLowDefault.quality.startsWith('Fully correct'), true);
assert.equal(solLowFast.quality.startsWith('Fully correct'), true);
assert.equal(percentageReduction(solLowFast.elapsedSeconds, solLowDefault.elapsedSeconds), 57.86);
assert.equal(
  results.prospectiveReplicationGate.minimumRunsPerTaskFamilyPerCohort,
  10,
);
assert.equal(results.prospectiveReplicationGate.randomizeCohortOrder, true);

console.log(
  `Agent economy experiment OK: ${results.trials.length} trials, status ${results.status}.`,
);
