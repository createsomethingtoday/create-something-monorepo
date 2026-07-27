import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'agent-harness-ablation.mjs');

function makeWorkspace(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'agent-harness-ablation-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function writeJson(root, relPath, value) {
  const filePath = path.join(root, relPath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
  return filePath;
}

function manifest(overrides = {}) {
  return {
    schemaVersion: 'harness-ablation-manifest.v1',
    experimentId: 'agent-guidance-v1',
    environment: 'isolated',
    hypothesis: 'Repository guidance and validation hooks improve reliable task completion.',
    repetitions: 3,
    randomizationSeed: 'agent-guidance-v1-seed',
    components: [
      {
        id: 'root-instructions',
        kind: 'instruction',
        artifact: 'AGENTS.md',
        expectedContribution: 'Route the agent to repo-owned workflow and validation commands.',
        safetyCritical: false,
        deterministicAlternativeAvailable: false
      },
      {
        id: 'validation-hook',
        kind: 'hook',
        artifact: '.claude/hooks/typecheck-stop.sh',
        expectedContribution: 'Prevent completion when validation is red.',
        safetyCritical: true,
        deterministicAlternativeAvailable: false
      }
    ],
    tasks: [
      {
        id: 'package-change',
        description: 'Make one bounded package change and report direct validation evidence.'
      }
    ],
    metrics: {
      taskSuccess: { direction: 'maximize', weight: 0.5, scale: 1 },
      policyViolations: { direction: 'minimize', weight: 0.2, scale: 2 },
      humanCorrectionMinutes: { direction: 'minimize', weight: 0.1, scale: 30 },
      totalTokens: { direction: 'minimize', weight: 0.05, scale: 100000 },
      costUsd: { direction: 'minimize', weight: 0.05, scale: 10 },
      latencyMs: { direction: 'minimize', weight: 0.05, scale: 600000 },
      escalationQuality: { direction: 'maximize', weight: 0.05, scale: 1 }
    },
    decisionPolicy: {
      materialContribution: 0.03,
      materialRegression: -0.03,
      overheadTolerance: 0.03,
      movePolicyViolationDelta: 0.25,
      moveTaskSuccessDeltaCeiling: 0.02
    },
    ...overrides
  };
}

function run(args, cwd) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd,
    encoding: 'utf8'
  });
}

function parseJson(result) {
  assert.doesNotThrow(() => JSON.parse(result.stdout), result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function observation(armId, repetition, metrics) {
  return {
    armId,
    taskId: 'package-change',
    repetition,
    metrics
  };
}

const GOOD = {
  taskSuccess: 1,
  policyViolations: 0,
  humanCorrectionMinutes: 0,
  totalTokens: 20000,
  costUsd: 1,
  latencyMs: 120000,
  escalationQuality: 1
};

test('plan emits stable control, full, and leave-one-out arms', (t) => {
  const root = makeWorkspace(t);
  const manifestPath = writeJson(root, 'manifest.json', manifest());

  const first = run(['plan', '--manifest', manifestPath, '--format', 'json'], root);
  const second = run(['plan', '--manifest', manifestPath, '--format', 'json'], root);

  assert.equal(first.status, 0, first.stderr);
  assert.equal(second.status, 0, second.stderr);
  const payload = parseJson(first);
  assert.equal(payload.schemaVersion, 'harness-ablation-plan.v1');
  assert.equal(payload.planHash, parseJson(second).planHash);
  assert.deepEqual(
    payload.arms.map((arm) => arm.id),
    ['control', 'full', 'without-root-instructions', 'without-validation-hook']
  );
  assert.deepEqual(payload.arms[0].enabledComponents, []);
  assert.deepEqual(payload.arms[1].enabledComponents, ['root-instructions', 'validation-hook']);
  assert.equal(payload.arms[3].requiresIsolatedExecution, true);
  assert.equal(payload.expectedRunCount, 12);
  assert.equal(payload.schedule.length, 12);
  assert.deepEqual(payload.schedule, parseJson(second).schedule);
  assert.deepEqual(
    [...payload.schedule]
      .sort((left, right) => left.key.localeCompare(right.key))
      .map((item) => item.key),
    [
      'control::package-change::1',
      'control::package-change::2',
      'control::package-change::3',
      'full::package-change::1',
      'full::package-change::2',
      'full::package-change::3',
      'without-root-instructions::package-change::1',
      'without-root-instructions::package-change::2',
      'without-root-instructions::package-change::3',
      'without-validation-hook::package-change::1',
      'without-validation-hook::package-change::2',
      'without-validation-hook::package-change::3'
    ]
  );
});

test('plan refuses to ablate a safety-critical component outside isolated or shadow evaluation', (t) => {
  const root = makeWorkspace(t);
  const manifestPath = writeJson(root, 'manifest.json', manifest({ environment: 'production' }));

  const result = run(['plan', '--manifest', manifestPath, '--format', 'json'], root);

  assert.equal(result.status, 1);
  const payload = parseJson(result);
  assert.equal(payload.passed, false);
  assert.match(payload.error, /isolated or shadow/i);
});

test('compare classifies helpful and harmful components from complete repeated evidence', (t) => {
  const root = makeWorkspace(t);
  const manifestValue = manifest();
  const manifestPath = writeJson(root, 'manifest.json', manifestValue);
  const planResult = run(['plan', '--manifest', manifestPath, '--format', 'json'], root);
  assert.equal(planResult.status, 0, planResult.stderr);
  const plan = parseJson(planResult);

  const runs = [];
  for (let repetition = 1; repetition <= 3; repetition += 1) {
    runs.push(
      observation('control', repetition, { ...GOOD, taskSuccess: 0, escalationQuality: 0 })
    );
    runs.push(observation('full', repetition, GOOD));
    runs.push(
      observation('without-root-instructions', repetition, {
        ...GOOD,
        taskSuccess: 0,
        humanCorrectionMinutes: 20,
        escalationQuality: 0
      })
    );
    runs.push(
      observation('without-validation-hook', repetition, {
        ...GOOD,
        totalTokens: 10000,
        costUsd: 0.5,
        latencyMs: 60000
      })
    );
  }

  const resultsPath = writeJson(root, 'results.json', {
    schemaVersion: 'harness-ablation-results.v1',
    experimentId: manifestValue.experimentId,
    planHash: plan.planHash,
    provenance: 'synthetic-test-fixture',
    runs
  });

  const result = run(
    ['compare', '--manifest', manifestPath, '--results', resultsPath, '--format', 'json'],
    root
  );

  assert.equal(result.status, 0, result.stderr);
  const comparison = parseJson(result);
  assert.equal(comparison.schemaVersion, 'harness-ablation-comparison.v1');
  assert.equal(comparison.passed, true);
  assert.equal(
    comparison.decisions.find((item) => item.componentId === 'root-instructions').decision,
    'retain'
  );
  assert.equal(
    comparison.decisions.find((item) => item.componentId === 'validation-hook').decision,
    'remove'
  );
  assert.equal(comparison.controlToFull.taskSuccessDelta, 1);
  assert.equal(comparison.evidence.runCount, 12);
});

test('compare refuses incomplete result matrices instead of inferring causality', (t) => {
  const root = makeWorkspace(t);
  const manifestValue = manifest();
  const manifestPath = writeJson(root, 'manifest.json', manifestValue);
  const planResult = run(['plan', '--manifest', manifestPath, '--format', 'json'], root);
  const plan = parseJson(planResult);
  const resultsPath = writeJson(root, 'results.json', {
    schemaVersion: 'harness-ablation-results.v1',
    experimentId: manifestValue.experimentId,
    planHash: plan.planHash,
    provenance: 'synthetic-test-fixture',
    runs: [observation('full', 1, GOOD)]
  });

  const result = run(
    ['compare', '--manifest', manifestPath, '--results', resultsPath, '--format', 'json'],
    root
  );

  assert.equal(result.status, 1);
  const payload = parseJson(result);
  assert.equal(payload.passed, false);
  assert.match(payload.error, /missing 11 required run/i);
});

test('compare distinguishes move, rewrite, and unresolved recommendations', (t) => {
  const root = makeWorkspace(t);
  const components = [
    {
      id: 'policy-instruction',
      kind: 'instruction',
      artifact: 'AGENTS.md',
      expectedContribution: 'Prevent policy violations that a deterministic check could block.',
      safetyCritical: false,
      deterministicAlternativeAvailable: true
    },
    {
      id: 'workflow-skill',
      kind: 'skill',
      artifact: 'skills/workflow/SKILL.md',
      expectedContribution:
        'Improve task completion enough to justify its context and runtime overhead.',
      safetyCritical: false,
      deterministicAlternativeAvailable: false
    },
    {
      id: 'review-layer',
      kind: 'review',
      artifact: 'docs/review.md',
      expectedContribution: 'Improve outcomes without measurable overhead.',
      safetyCritical: false,
      deterministicAlternativeAvailable: false
    }
  ];
  const manifestValue = manifest({
    repetitions: 2,
    components,
    decisionPolicy: {
      materialContribution: 0.2,
      materialRegression: -0.2,
      overheadTolerance: 0.1,
      movePolicyViolationDelta: 0.25,
      moveTaskSuccessDeltaCeiling: 0.02
    }
  });
  const manifestPath = writeJson(root, 'manifest.json', manifestValue);
  const plan = parseJson(run(['plan', '--manifest', manifestPath, '--format', 'json'], root));
  const full = {
    taskSuccess: 1,
    policyViolations: 0,
    humanCorrectionMinutes: 0,
    totalTokens: 100000,
    costUsd: 10,
    latencyMs: 600000,
    escalationQuality: 1
  };
  const armMetrics = {
    control: full,
    full,
    'without-policy-instruction': { ...full, policyViolations: 1 },
    'without-workflow-skill': {
      ...full,
      taskSuccess: 0.6,
      totalTokens: 0,
      costUsd: 0,
      latencyMs: 0,
      escalationQuality: 0
    },
    'without-review-layer': full
  };
  const runs = [];
  for (const [armId, metrics] of Object.entries(armMetrics)) {
    for (let repetition = 1; repetition <= 2; repetition += 1) {
      runs.push(observation(armId, repetition, metrics));
    }
  }
  const resultsPath = writeJson(root, 'results.json', {
    schemaVersion: 'harness-ablation-results.v1',
    experimentId: manifestValue.experimentId,
    planHash: plan.planHash,
    provenance: 'synthetic-test-fixture',
    runs
  });

  const result = run(
    ['compare', '--manifest', manifestPath, '--results', resultsPath, '--format', 'json'],
    root
  );

  assert.equal(result.status, 0, result.stderr);
  const comparison = parseJson(result);
  assert.equal(
    comparison.decisions.find((item) => item.componentId === 'policy-instruction').decision,
    'move'
  );
  assert.equal(
    comparison.decisions.find((item) => item.componentId === 'workflow-skill').decision,
    'rewrite'
  );
  assert.equal(
    comparison.decisions.find((item) => item.componentId === 'review-layer').decision,
    'unresolved'
  );
});
