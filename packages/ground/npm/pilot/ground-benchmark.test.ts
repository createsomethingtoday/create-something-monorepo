import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';
import test from 'node:test';

import { runGroundBenchmark } from './benchmark.ts';
import { validateGroundBenchmarkReceipt } from './receipt.ts';

function findWorkspaceRoot(start: string): string {
  let current = resolve(start);
  const root = parse(current).root;
  while (current !== root) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) return current;
    current = dirname(current);
  }
  throw new Error(`Unable to find workspace root from ${start}`);
}

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
