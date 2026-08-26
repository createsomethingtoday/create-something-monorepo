import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const results = JSON.parse(
  await readFile(new URL('./agent-economy-model-routing-2026-08-26.json', import.meta.url), 'utf8')
);
const trial2Telemetry = JSON.parse(
  await readFile(
    new URL('./agent-economy-trial-2-telemetry-2026-08-26.json', import.meta.url),
    'utf8'
  )
);
const trial1Telemetry = JSON.parse(
  await readFile(
    new URL('./agent-economy-trial-1-telemetry-2026-08-26.json', import.meta.url),
    'utf8'
  )
);
const telemetryReceipts = [trial1Telemetry, trial2Telemetry];
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
const terraHigh = trial('trial-1-terra-high');
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

const calculateCredits = (receipt, session) => {
  const rates = receipt.rateCard.models[session.model];
  assert.ok(rates, `missing rate card for ${session.model}`);
  const uncachedInputTokens = session.inputTokens - session.cachedInputTokens;
  return (
    (uncachedInputTokens * rates.uncachedInput +
      session.cachedInputTokens * rates.cachedInput +
      session.outputTokens * rates.output) /
    1_000_000
  );
};

const allowedReceiptKeys = new Set([
  'schemaVersion',
  'experimentId',
  'trial',
  'capturedAt',
  'rateCard',
  'version',
  'source',
  'unit',
  'formula',
  'models',
  'luna',
  'terra',
  'sol',
  'uncachedInput',
  'cachedInput',
  'output',
  'sessions',
  'receiptId',
  'cohort',
  'model',
  'effort',
  'role',
  'servingTier',
  'inputTokens',
  'cachedInputTokens',
  'outputTokens',
  'reasoningOutputTokens',
  'totalTokens'
]);

const validateReceiptShape = (value) => {
  if (Array.isArray(value)) {
    for (const entry of value) validateReceiptShape(entry);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    assert.ok(allowedReceiptKeys.has(key), `disallowed telemetry receipt field: ${key}`);
    validateReceiptShape(entry);
  }
};

for (const receipt of telemetryReceipts) {
  validateReceiptShape(receipt);
  assert.equal(receipt.schemaVersion, 'create_something_agent_telemetry_receipt.v0.1');
  const serialized = JSON.stringify(receipt);
  assert.equal(serialized.includes('/Users/'), false);
  assert.equal(
    /(?:api[_-]?key|authorization|bearer|password|private[_-]?key|transcript|prompt)/iu.test(
      serialized
    ),
    false
  );
  for (const session of receipt.sessions) {
    assert.equal(session.inputTokens + session.outputTokens, session.totalTokens);
    assert.ok(session.cachedInputTokens <= session.inputTokens);
    assert.match(session.receiptId, /^[0-9a-f-]{36}$/u);
  }
}

for (const subject of [luna, terra, sol]) {
  const sessions = trial2Telemetry.sessions.filter((session) => session.cohort === subject.id);
  assert.equal(sessions.length, subject.agentCount);
  assert.equal(
    sessions.reduce((total, session) => total + session.totalTokens, 0),
    subject.totalTokens
  );
  assert.equal(
    Number(
      sessions
        .reduce((total, session) => total + calculateCredits(trial2Telemetry, session), 0)
        .toFixed(6)
    ),
    Number(subject.creditEquivalent.toFixed(6))
  );
}

for (const subject of [terraHigh, terraUltra, solLowDefault, solLowFast]) {
  const sessions = trial1Telemetry.sessions.filter((session) => session.cohort === subject.id);
  assert.equal(sessions.length, 1);
  const [session] = sessions;
  if ('totalTokens' in subject) assert.equal(session.totalTokens, subject.totalTokens);
  if ('inputTokens' in subject) assert.equal(session.inputTokens, subject.inputTokens);
  if ('cachedInputTokens' in subject)
    assert.equal(session.cachedInputTokens, subject.cachedInputTokens);
  if ('outputTokens' in subject) assert.equal(session.outputTokens, subject.outputTokens);
  if ('reasoningOutputTokens' in subject)
    assert.equal(session.reasoningOutputTokens, subject.reasoningOutputTokens);
  assert.equal(
    Number(calculateCredits(trial1Telemetry, session).toFixed(6)),
    Number((subject.creditEquivalent ?? subject.baseRateCreditEquivalent).toFixed(6))
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
  `${luna.criticalPathSeconds.toFixed(3)} s`,
  `${terra.criticalPathSeconds.toFixed(3)} s`,
  `${sol.criticalPathSeconds.toFixed(3)} s`,
  `${terraHigh.elapsedSeconds.toFixed(3)} s`,
  terraHigh.totalTokens.toLocaleString('en-US'),
  terraHigh.creditEquivalent.toFixed(6),
  `${terraUltra.elapsedSeconds.toFixed(3)} s`,
  terraUltra.totalTokens.toLocaleString('en-US'),
  terraUltra.creditEquivalent.toFixed(6),
  `${solLowDefault.elapsedSeconds} s`,
  solLowDefault.inputTokens.toLocaleString('en-US'),
  solLowDefault.cachedInputTokens.toLocaleString('en-US'),
  solLowDefault.outputTokens.toLocaleString('en-US'),
  solLowDefault.reasoningOutputTokens.toLocaleString('en-US'),
  `${solLowFast.elapsedSeconds} s`,
  solLowFast.inputTokens.toLocaleString('en-US'),
  solLowFast.cachedInputTokens.toLocaleString('en-US'),
  solLowFast.outputTokens.toLocaleString('en-US'),
  solLowFast.reasoningOutputTokens.toLocaleString('en-US'),
  `${percentageReduction(luna.creditEquivalent, terra.creditEquivalent)}% fewer`,
  `${percentageReduction(luna.creditEquivalent, sol.creditEquivalent)}% fewer`,
  `${percentageReduction(solLowFast.elapsedSeconds, solLowDefault.elapsedSeconds)}% sooner`,
  'Every reported model/effort cohort has one run.',
  'at least **10 trials per task family per cohort**',
  '[Dual-Agent Routing Experiment](/papers/dual-agent-routing-experiment)',
  'Token and credit economics are recomputed from the durable receipts',
  'latency observations are reconciled exactly against the durable ledger'
];

const publicRows = [
  `| 3× Luna / High | 17/17 | 3/3 | 5/5 | yes | ${luna.criticalPathSeconds.toFixed(3)} s | ${luna.totalTokens.toLocaleString('en-US')} | ${luna.creditEquivalent.toFixed(6)} |`,
  `| 1× Terra / High | 14/14 | 3/3 | 5/5 | yes | ${terra.criticalPathSeconds.toFixed(3)} s | ${terra.totalTokens.toLocaleString('en-US')} | ${terra.creditEquivalent.toFixed(6)} |`,
  `| 1× Sol / High | 17/17 | 3/3 | 5/5 | yes | ${sol.criticalPathSeconds.toFixed(3)} s | ${sol.totalTokens.toLocaleString('en-US')} | ${sol.creditEquivalent.toFixed(6)} |`,
  `| High | Core facts correct; incomplete export list; two judgment errors | ${terraHigh.elapsedSeconds.toFixed(3)} s | ${terraHigh.totalTokens.toLocaleString('en-US')} | ${terraHigh.creditEquivalent.toFixed(6)} |`,
  `| Ultra, exact prompt | Complete export list; same two judgment errors | ${terraUltra.elapsedSeconds.toFixed(3)} s | ${terraUltra.totalTokens.toLocaleString('en-US')} | ${terraUltra.creditEquivalent.toFixed(6)} |`,
  `| Default | Fully correct | ${solLowDefault.elapsedSeconds} s | ${solLowDefault.inputTokens.toLocaleString('en-US')} | ${solLowDefault.cachedInputTokens.toLocaleString('en-US')} | ${solLowDefault.outputTokens.toLocaleString('en-US')} | ${solLowDefault.reasoningOutputTokens.toLocaleString('en-US')} |`,
  `| Fast | Fully correct | ${solLowFast.elapsedSeconds} s | ${solLowFast.inputTokens.toLocaleString('en-US')} | ${solLowFast.cachedInputTokens.toLocaleString('en-US')} | ${solLowFast.outputTokens.toLocaleString('en-US')} | ${solLowFast.reasoningOutputTokens.toLocaleString('en-US')} |`
];

for (const fact of publicFacts) {
  assert.ok(
    publicExperiment.includes(fact),
    `public experiment is missing reconciled fact: ${fact}`
  );
}
const normalizeTableRow = (row) =>
  row
    .split('|')
    .map((cell) => cell.trim())
    .join('|');
const normalizedPublicLines = new Set(publicExperiment.split('\n').map(normalizeTableRow));

for (const row of publicRows) {
  assert.ok(
    normalizedPublicLines.has(normalizeTableRow(row)),
    `public experiment has a mismatched row: ${row}`
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
