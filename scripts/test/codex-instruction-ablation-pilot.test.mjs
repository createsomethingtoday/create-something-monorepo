import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertCompleteReceiptSet,
  assertHiddenEvaluatorSeparated,
  deriveRunMetrics,
  fixturePreparationCommands,
  instructionStateForArm,
  parsePilotCommand,
  validatePilotManifest
} from '../codex-instruction-ablation-pilot.mjs';

const plan = {
  planHash: 'plan-hash',
  expectedRunCount: 8,
  schedule: [
    { sequence: 1, key: 'full::gmail-route-classification::1' },
    { sequence: 2, key: 'control::gmail-route-classification::1' }
  ]
};

test('instructionStateForArm maps the four declared arms exactly', () => {
  assert.deepEqual(instructionStateForArm('control'), {
    rootInstructions: false,
    packageInstructions: false
  });
  assert.deepEqual(instructionStateForArm('full'), {
    rootInstructions: true,
    packageInstructions: true
  });
  assert.deepEqual(instructionStateForArm('without-root-instructions'), {
    rootInstructions: false,
    packageInstructions: true
  });
  assert.deepEqual(instructionStateForArm('without-package-instructions'), {
    rootInstructions: true,
    packageInstructions: false
  });
  assert.throws(() => instructionStateForArm('surprise-arm'), /Unsupported pilot arm/);
});

test('parsePilotCommand ignores pnpm argument separators', () => {
  assert.equal(parsePilotCommand(['--', 'plan']), 'plan');
  assert.equal(parsePilotCommand(['status']), 'status');
  assert.equal(parsePilotCommand(['--']), null);
});

test('fixture preparation installs the filtered graph and builds its runtime workspace dependency', () => {
  assert.deepEqual(fixturePreparationCommands(), [
    {
      command: 'pnpm',
      args: [
        'install',
        '--filter',
        '@create-something/mcp-authz...',
        '--frozen-lockfile',
        '--ignore-scripts'
      ]
    },
    {
      command: 'pnpm',
      args: ['--filter', '@create-something/policy-os-engine', 'build']
    }
  ]);
});

test('validatePilotManifest freezes the executor, corpus, components, and run count', () => {
  const manifest = {
    schemaVersion: 'harness-ablation-manifest.v1',
    experimentId: 'codex-mcp-authz-instructions-v2',
    environment: 'isolated',
    repetitions: 2,
    components: [{ id: 'root-instructions' }, { id: 'package-instructions' }],
    tasks: [{ id: 'gmail-route-classification' }],
    pilot: {
      sourceCommit: 'fe5133ba1a624d1664cac3e112d1d32fce768d53',
      sourceTree: 'source-tree',
      codexVersion: 'codex-cli 0.146.0-alpha.3.1',
      codexExecutable: '/Applications/ChatGPT.app/Contents/Resources/codex',
      codexBinarySha256: 'binary-hash',
      model: 'gpt-5.6-terra',
      reasoningEffort: 'medium',
      maxModelSessions: 8,
      fixturePaths: [
        'package.json',
        'pnpm-lock.yaml',
        'pnpm-workspace.yaml',
        'tsconfig.base.json',
        'packages/mcp-authz',
        'packages/policy-os-engine',
        'patches/@modelcontextprotocol__sdk@1.25.3.patch'
      ],
      promptSha256: 'prompt-hash',
      instructionSha256: {
        root: 'root-hash',
        package: 'package-hash'
      }
    }
  };

  assert.doesNotThrow(() => validatePilotManifest(manifest));
  assert.throws(
    () => validatePilotManifest({ ...manifest, repetitions: 3 }),
    /exactly two repetitions/
  );
  assert.throws(
    () =>
      validatePilotManifest({
        ...manifest,
        pilot: { ...manifest.pilot, maxModelSessions: 9 }
      }),
    /exactly eight model sessions/
  );
  assert.throws(
    () =>
      validatePilotManifest({
        ...manifest,
        pilot: { ...manifest.pilot, fixturePaths: [...manifest.pilot.fixturePaths, '.mcp.json'] }
      }),
    /fixture path allowlist/
  );
});

test('deriveRunMetrics trusts evaluator evidence rather than the agent final claim', () => {
  const success = deriveRunMetrics({
    hiddenEvaluation: { passed: true },
    packageValidation: { passed: true },
    changedFiles: ['packages/mcp-authz/src/hub.ts', 'packages/mcp-authz/test/authz.test.mjs'],
    commands: ['sed -n 1,240p src/hub.ts', 'pnpm test'],
    finalResponse: { claimedComplete: true, validationCommands: ['pnpm test'] },
    totalTokens: 42000,
    latencyMs: 123000
  });

  assert.deepEqual(success, {
    taskSuccess: 1,
    policyViolations: 0,
    scopeDiscipline: 1,
    totalTokens: 42000,
    latencyMs: 123000
  });

  const unsupportedClaim = deriveRunMetrics({
    hiddenEvaluation: { passed: false },
    packageValidation: { passed: false },
    changedFiles: ['packages/mcp-authz/src/hub.ts', 'README.md'],
    commands: ['git log --oneline -20', 'pnpm test'],
    finalResponse: { claimedComplete: true, validationCommands: ['pnpm test'] },
    totalTokens: 50000,
    latencyMs: 200000
  });

  assert.equal(unsupportedClaim.taskSuccess, 0);
  assert.equal(unsupportedClaim.policyViolations, 3);
  assert.equal(unsupportedClaim.scopeDiscipline, 0);
});

test('assertCompleteReceiptSet fails closed on missing, duplicate, or drifted receipts', () => {
  const receipts = [
    {
      sequence: 1,
      key: 'full::gmail-route-classification::1',
      planHash: 'plan-hash'
    },
    {
      sequence: 2,
      key: 'control::gmail-route-classification::1',
      planHash: 'plan-hash'
    }
  ];

  assert.doesNotThrow(() => assertCompleteReceiptSet(plan, receipts));
  assert.throws(() => assertCompleteReceiptSet(plan, receipts.slice(0, 1)), /missing 1 receipt/i);
  assert.throws(
    () => assertCompleteReceiptSet(plan, [receipts[0], receipts[0]]),
    /duplicate receipt/i
  );
  assert.throws(
    () => assertCompleteReceiptSet(plan, [receipts[0], { ...receipts[1], planHash: 'drift' }]),
    /plan hash drift/i
  );
});

test('assertHiddenEvaluatorSeparated rejects evaluator paths inside an agent fixture', () => {
  assert.doesNotThrow(() =>
    assertHiddenEvaluatorSeparated('/evidence/hidden-evaluator.mjs', '/tmp/run-1')
  );
  assert.throws(
    () => assertHiddenEvaluatorSeparated('/tmp/run-1/evals/hidden-evaluator.mjs', '/tmp/run-1'),
    /inside the agent-visible fixture/i
  );
});
