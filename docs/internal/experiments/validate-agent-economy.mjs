import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const results = JSON.parse(
  await readFile(new URL('./agent-economy-model-routing-2026-08-26.json', import.meta.url), 'utf8')
);
const telemetry = JSON.parse(
  await readFile(
    new URL('./agent-economy-trial-2-telemetry-2026-08-26.json', import.meta.url),
    'utf8'
  )
);
const publicExperiment = await readFile(
  new URL(
    '../../../packages/io/content/experiments/governed-codex-model-routing.md',
    import.meta.url
  ),
  'utf8'
);
const publicMetadata = await readFile(
  new URL('../../../packages/io/src/lib/config/fileBasedExperiments.ts', import.meta.url),
  'utf8'
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

const calculateCredits = (session) => {
  const rates = telemetry.rateCard.models[session.model];
  assert.ok(rates, `missing rate card for ${session.model}`);
  const uncachedInputTokens = session.inputTokens - session.cachedInputTokens;
  return (
    (uncachedInputTokens * rates.uncachedInput +
      session.cachedInputTokens * rates.cachedInput +
      session.outputTokens * rates.output) /
    1_000_000
  );
};

for (const session of telemetry.sessions) {
  assert.equal(session.inputTokens + session.outputTokens, session.totalTokens);
  assert.ok(session.cachedInputTokens <= session.inputTokens);
  assert.match(session.receiptId, /^[0-9a-f-]{36}$/u);
}

for (const subject of [luna, terra, sol]) {
  const sessions = telemetry.sessions.filter((session) => session.cohort === subject.id);
  assert.equal(sessions.length, subject.agentCount);
  assert.equal(
    sessions.reduce((total, session) => total + session.totalTokens, 0),
    subject.totalTokens
  );
  assert.equal(
    Number(sessions.reduce((total, session) => total + calculateCredits(session), 0).toFixed(6)),
    Number(subject.creditEquivalent.toFixed(6))
  );
}

assert.equal(percentageReduction(luna.creditEquivalent, terra.creditEquivalent), 73.34);
assert.equal(percentageReduction(luna.creditEquivalent, sol.creditEquivalent), 90.57);
assert.equal(
  Number((100 * (luna.criticalPathSeconds / terra.criticalPathSeconds - 1)).toFixed(2)),
  25.66
);
assert.equal(percentageReduction(luna.criticalPathSeconds, sol.criticalPathSeconds), 23.52);

assert.equal(terraUltra.promptChanged, false);
assert.equal(solLowDefault.quality.startsWith('Fully correct'), true);
assert.equal(solLowFast.quality.startsWith('Fully correct'), true);
assert.equal(percentageReduction(solLowFast.elapsedSeconds, solLowDefault.elapsedSeconds), 57.86);
assert.equal(results.prospectiveReplicationGate.minimumRunsPerTaskFamilyPerCohort, 10);
assert.equal(results.prospectiveReplicationGate.randomizeCohortOrder, true);

const publicFacts = [
  'SUPPORTED — NOT VALIDATED',
  `${luna.public.passed}/${luna.public.total}`,
  `${terra.public.passed}/${terra.public.total}`,
  `${sol.public.passed}/${sol.public.total}`,
  `${luna.hidden.passed}/${luna.hidden.total}`,
  `${luna.mutants.killed}/${luna.mutants.total}`,
  luna.creditEquivalent.toFixed(6),
  terra.creditEquivalent.toFixed(6),
  sol.creditEquivalent.toFixed(6),
  `${percentageReduction(luna.creditEquivalent, terra.creditEquivalent)}% fewer`,
  `${percentageReduction(luna.creditEquivalent, sol.creditEquivalent)}% fewer`,
  `${percentageReduction(solLowFast.elapsedSeconds, solLowDefault.elapsedSeconds)}% sooner`,
  'Every reported model/effort cohort has one run.',
  'at least **10 trials per task family per cohort**',
  '[Dual-Agent Routing Experiment](/papers/dual-agent-routing-experiment)'
];

for (const fact of publicFacts) {
  assert.ok(
    publicExperiment.includes(fact),
    `public experiment is missing reconciled fact: ${fact}`
  );
}

assert.ok(publicMetadata.includes("slug: 'governed-codex-model-routing'"));
assert.ok(publicMetadata.includes("created_at: '2026-08-26T12:00:00Z'"));
assert.ok(publicMetadata.includes("'file-governed-codex-model-routing': defineArtifactVisuals"));
assert.equal(
  publicExperiment.includes('/Users/'),
  false,
  'public experiment leaks a private local path'
);
assert.equal(
  JSON.stringify(results).includes('/Users/'),
  false,
  'ledger leaks a private local path'
);
for (const overclaim of ['the result is validated', 'the result is statistically significant']) {
  assert.equal(
    publicExperiment.toLowerCase().includes(overclaim),
    false,
    `public overclaim: ${overclaim}`
  );
}

console.log(
  `Agent economy experiment OK: ${results.trials.length} trials, status ${results.status}, public projection reconciled.`
);
