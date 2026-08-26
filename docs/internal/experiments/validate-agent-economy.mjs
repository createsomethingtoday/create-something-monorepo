import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const judgeReceipt = JSON.parse(
  await readFile(
    new URL('./agent-economy-trial-2-judge-receipt-2026-08-26.json', import.meta.url),
    'utf8'
  )
);
const fixtureRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  'agent-economy-trial-2-fixture'
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
const internalReport = await readFile(
  new URL('./AGENT_ECONOMY_MODEL_ROUTING_2026-08-26.md', import.meta.url),
  'utf8'
);

assert.equal(results.schemaVersion, 'create_something_internal_experiment.v0.1');
assert.equal(results.status, 'inconclusive_quality_gate_failed');
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
  assert.deepEqual(subject.hidden, { passed: 2, total: 3 });
  assert.deepEqual(subject.mutants, { killed: 5, total: 5 });
  assert.equal('authorizedFilesOnly' in subject, false);
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
  'totalTokens',
  'startedAt',
  'completedAt',
  'elapsedSeconds'
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
    if ('elapsedSeconds' in session) {
      assert.equal(typeof session.startedAt, 'string');
      assert.equal(typeof session.completedAt, 'string');
      assert.ok(Number.isFinite(Date.parse(session.startedAt)));
      assert.ok(Number.isFinite(Date.parse(session.completedAt)));
      assert.equal(
        Number(
          ((Date.parse(session.completedAt) - Date.parse(session.startedAt)) / 1000).toFixed(3)
        ),
        session.elapsedSeconds
      );
    }
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
  assert.equal(
    Math.max(...sessions.map((session) => session.elapsedSeconds)),
    subject.criticalPathSeconds
  );
}

const sha256 = async (path) =>
  createHash('sha256')
    .update(await readFile(resolve(fixtureRoot, path)))
    .digest('hex');
assert.equal(await sha256('base/TASKS.md'), judgeReceipt.taskContractSha256);
assert.equal(await sha256('judge/hidden.test.mjs'), judgeReceipt.judgeArtifacts.hiddenTestSha256);
assert.equal(
  await sha256('judge/mutation-score.mjs'),
  judgeReceipt.judgeArtifacts.mutationRunnerSha256
);
for (const mutant of judgeReceipt.judgeArtifacts.mutants) {
  assert.equal(await sha256(`judge/mutants/${mutant.name}.mjs`), mutant.sha256);
}

const artifactPaths = [
  'src/approval-gate.mjs',
  'src/canonical-tool-name.mjs',
  'src/retry-after.mjs',
  'test/approval-gate.test.mjs',
  'test/canonical-tool-name.test.mjs',
  'test/retry-after.test.mjs'
];
for (const judged of judgeReceipt.subjects) {
  const subject = trial(judged.cohort);
  const directory =
    judged.cohort === 'trial-2-luna-high-fanout' ? 'luna' : judged.cohort.replace('trial-2-', '');
  assert.equal(judged.public.passed, subject.public.passed);
  assert.equal(judged.public.total, subject.public.total);
  assert.deepEqual(judged.hidden, subject.hidden);
  assert.deepEqual(judged.mutants, subject.mutants);
  assert.equal(judged.statusReceipt, 'not_captured');
  for (const [index, path] of artifactPaths.entries()) {
    const receiptPath =
      path === 'src/retry-after.mjs'
        ? `session-time/${directory}/retry-after.mjs`
        : `${directory}/${path}`;
    assert.equal(await sha256(receiptPath), judged.artifactSha256[index]);
  }
  const subjectRoot = resolve(fixtureRoot, directory);
  const publicOutput = execFileSync(process.execPath, ['--test', '--test-reporter=tap'], {
    cwd: subjectRoot,
    encoding: 'utf8'
  });
  assert.match(publicOutput, new RegExp(`# tests ${judged.public.total}\\b`, 'u'));
  const hiddenRun = spawnSync(
    process.execPath,
    ['--test-reporter=tap', resolve(fixtureRoot, 'judge/hidden.test.mjs')],
    {
      cwd: subjectRoot,
      env: {
        ...process.env,
        SUBJECT_ROOT: subjectRoot,
        RETRY_AFTER_PATH: resolve(fixtureRoot, `session-time/${directory}/retry-after.mjs`)
      },
      encoding: 'utf8'
    }
  );
  assert.equal(hiddenRun.status, 1);
  assert.match(hiddenRun.stdout, new RegExp(`# tests ${judged.hidden.total}\\b`, 'u'));
  assert.match(hiddenRun.stdout, new RegExp(`# pass ${judged.hidden.passed}\\b`, 'u'));
  const mutation = JSON.parse(
    execFileSync(
      process.execPath,
      [resolve(fixtureRoot, 'judge/mutation-score.mjs'), subjectRoot],
      { encoding: 'utf8' }
    )
  );
  assert.equal(mutation.killed, judged.mutants.killed);
  assert.equal(mutation.totalMutants, judged.mutants.total);
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
assert.equal(percentageReduction(solLowFast.elapsedSeconds, solLowDefault.elapsedSeconds), 57.86);
assert.equal(results.prospectiveReplicationGate.minimumRunsPerTaskFamilyPerCohort, 10);
assert.equal(results.prospectiveReplicationGate.randomizeCohortOrder, true);

const publicFacts = [
  'INCONCLUSIVE — QUALITY GATE FAILED',
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
  `${percentageReduction(luna.creditEquivalent, terra.creditEquivalent)}% fewer`,
  `${percentageReduction(luna.creditEquivalent, sol.creditEquivalent)}% fewer`,
  'Every reported model/effort cohort has one run.',
  'at least **10 trials per task family per cohort**',
  '[Dual-Agent Routing Experiment](/papers/dual-agent-routing-experiment)',
  'Token and credit economics and Trial 2 latency are recomputed from durable receipts',
  'the release gate reruns the session-time outputs against the checked-in public, hidden, and mutation judges'
];

const publicRows = [
  `| 3× Luna / High | 17/17 | 2/3 | 5/5 | ${luna.criticalPathSeconds.toFixed(3)} s | ${luna.totalTokens.toLocaleString('en-US')} | ${luna.creditEquivalent.toFixed(6)} |`,
  `| 1× Terra / High | 14/14 | 2/3 | 5/5 | ${terra.criticalPathSeconds.toFixed(3)} s | ${terra.totalTokens.toLocaleString('en-US')} | ${terra.creditEquivalent.toFixed(6)} |`,
  `| 1× Sol / High | 17/17 | 2/3 | 5/5 | ${sol.criticalPathSeconds.toFixed(3)} s | ${sol.totalTokens.toLocaleString('en-US')} | ${sol.creditEquivalent.toFixed(6)} |`
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
assert.ok(publicMetadata.includes('Session-time hidden: 2/3'));
assert.ok(publicMetadata.includes('INCONCLUSIVE — QUALITY GATE FAILED'));
assert.equal(publicMetadata.includes('Same hidden gates: 3/3'), false);
assert.equal(publicExperiment.includes('Authorized files only'), false);
assert.ok(internalReport.includes('INCONCLUSIVE — QUALITY GATE FAILED'));
assert.equal(internalReport.includes('SUPPORTED — NOT VALIDATED'), false);
assert.equal(internalReport.includes('Authorized files only'), false);
assert.equal(internalReport.includes('|    3/3 |'), false);
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
