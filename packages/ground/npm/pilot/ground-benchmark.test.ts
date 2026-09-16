import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';
import { findWorkspaceRoot } from './workspace-root.ts';

import { runGroundBenchmark } from './benchmark.ts';
import { validateGroundBenchmarkReceipt } from './receipt.ts';

const workspace = findWorkspaceRoot(process.cwd());

test('benchmark runner retains every real MCP sample in a valid receipt', async () => {
  const receipt = await runGroundBenchmark({
    workspace,
    binaryPath: resolve(workspace, 'packages/ground/target/release/ground-mcp'),
    targetDirectory: resolve(workspace, 'packages/ground/npm/pilot/fixtures/duplicate-analysis'),
    checks: ['duplicates'],
    samples: 2,
    warmupSamples: 0,
    timeoutMs: 15_000,
    includeTypescriptBaseline: false
  });

  assert.equal(receipt.nativeMcp.samples.length, 2);
  assert.equal(receipt.nativeMcp.summary.attempted, 2);
  assert.equal(receipt.nativeMcp.summary.failed, 0);
  assert.equal(receipt.nativeMcp.summary.resultConsistent, true);
  assert.equal(receipt.typescriptBaseline, null);
  assert.equal(validateGroundBenchmarkReceipt(receipt).valid, true);
});
