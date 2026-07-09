import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPlan, parseArgs } from '../operator-agent-repeat.mjs';

test('operator-agent repeat defaults to 100 no-write model-backed loops', () => {
  const options = parseArgs(['node', 'operator-agent-repeat.mjs']);
  assert.equal(options.count, 100);
  assert.equal(options.evalLimit, 1);
  assert.equal(options.noModel, false);
  assert.equal(options.noRevise, true);
  assert.equal(options.allowWrites, false);
  assert.equal(options.stopOnFailure, true);
});

test('operator-agent repeat parses bounded deterministic dry-run options', () => {
  const options = parseArgs([
    'node',
    'operator-agent-repeat.mjs',
    '--count',
    '3',
    '--run-id',
    'test-run',
    '--out-dir',
    '.tmp/operator-agent-repeat-test',
    '--eval-limit',
    '2',
    '--timeout-ms',
    '5000',
    '--no-model',
    '--continue-on-failure',
    '--dry-run',
    '--json',
  ]);
  assert.equal(options.count, 3);
  assert.equal(options.runId, 'test-run');
  assert.equal(options.outDir, '.tmp/operator-agent-repeat-test');
  assert.equal(options.evalLimit, 2);
  assert.equal(options.timeoutMs, 5000);
  assert.equal(options.noModel, true);
  assert.equal(options.stopOnFailure, false);
  assert.equal(options.dryRun, true);
  assert.equal(options.json, true);
});

test('operator-agent repeat plan shows resumable receipt paths and no-write guard', () => {
  const options = parseArgs([
    'node',
    'operator-agent-repeat.mjs',
    '--count',
    '5',
    '--run-id',
    'unit-repeat',
    '--out-dir',
    '.tmp/operator-agent-repeat-test-plan',
    '--no-model',
  ]);
  const plan = buildPlan(options);
  assert.equal(plan.mode, 'operator-agent-repeat-plan');
  assert.equal(plan.requestedCount, 5);
  assert.equal(plan.noWriteGuard, true);
  assert.match(plan.progressPath, /unit-repeat-progress\.jsonl$/);
  assert.match(plan.summaryPath, /unit-repeat-summary\.json$/);
  assert.match(plan.command, /operator-agent-schedule\.mjs once/);
  assert.match(plan.command, /--no-model/);
});

test('operator-agent repeat rejects unbounded counts and unsafe run ids', () => {
  assert.throws(() => parseArgs(['node', 'operator-agent-repeat.mjs', '--count', '0']), /--count/);
  assert.throws(() => parseArgs(['node', 'operator-agent-repeat.mjs', '--count', '501']), /--count/);
  assert.throws(() => parseArgs(['node', 'operator-agent-repeat.mjs', '--run-id', '../bad']), /--run-id/);
});
