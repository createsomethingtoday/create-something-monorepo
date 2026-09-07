import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { findWorkspaceRoot } from './workspace-root.ts';

import {
  GroundNativeClientError,
  parseGroundAnalysisToolResult,
  runGroundAnalysis
} from './ground-native-client.ts';

const workspace = findWorkspaceRoot(process.cwd());
const binaryPath =
  process.env.GROUND_MCP_BINARY ?? resolve(workspace, 'packages/ground/target/release/ground-mcp');
const fixtureDirectory = resolve(
  workspace,
  'packages/ground/npm/pilot/fixtures/duplicate-analysis'
);
const silentServer = resolve(workspace, 'packages/ground/npm/pilot/fixtures/silent-mcp-server.mjs');

test('TypeScript caller discovers and invokes ground_analyze through the real Rust MCP binary', async () => {
  assert.equal(
    existsSync(binaryPath),
    true,
    `Build the release binary before this test: ${binaryPath}`
  );

  const result = await runGroundAnalysis({
    binaryPath,
    workspace,
    directory: fixtureDirectory,
    checks: ['duplicates'],
    timeoutMs: 15_000
  });

  assert.equal(result.server.name, 'ground');
  assert.equal(result.toolDiscovered, true);
  assert.deepEqual(result.analysis.checks_run, ['duplicates']);
  assert.equal(result.analysis.summary.total_issues, 1);
  assert.equal(result.analysis.findings.duplicates.length, 1);
  assert.equal(result.analysis.findings.duplicates[0].function, 'normalizeCustomerId');
  assert.equal(result.analysis.findings.duplicates[0].type, 'duplicate_function');
  assert.ok(result.timings.connectMs >= 0);
  assert.ok(result.timings.analysisMs >= 0);
  assert.ok(result.timings.totalMs >= result.timings.analysisMs);
  assert.ok((result.timings.peakRssBytes ?? 0) > 0);
  assert.match(result.process.stderr, /MCP server started/);
});

test('TypeScript caller reports a missing binary without hanging or falling back', async () => {
  const missingBinary = resolve(workspace, 'packages/ground/target/release/missing-ground-mcp');

  await assert.rejects(
    runGroundAnalysis({
      binaryPath: missingBinary,
      workspace,
      directory: fixtureDirectory,
      checks: ['duplicates'],
      timeoutMs: 250
    }),
    (error: unknown) => {
      assert.ok(error instanceof GroundNativeClientError);
      assert.equal(error.code, 'GROUND_BINARY_NOT_FOUND');
      assert.match(error.message, /Ground MCP binary not found/);
      return true;
    }
  );
});

test('TypeScript caller rejects malformed Ground tool content', () => {
  assert.throws(
    () =>
      parseGroundAnalysisToolResult({
        content: [{ type: 'text', text: '{"summary":' }]
      }),
    (error: unknown) => {
      assert.ok(error instanceof GroundNativeClientError);
      assert.equal(error.code, 'GROUND_MALFORMED_RESULT');
      assert.match(error.message, /not valid JSON/);
      return true;
    }
  );
});

test('TypeScript caller times out and terminates an unresponsive MCP process', async () => {
  const startedAt = performance.now();
  await assert.rejects(
    runGroundAnalysis({
      binaryPath: silentServer,
      workspace,
      directory: fixtureDirectory,
      checks: ['duplicates'],
      timeoutMs: 100
    }),
    (error: unknown) => {
      assert.ok(error instanceof GroundNativeClientError);
      assert.equal(error.code, 'GROUND_CONNECT_FAILED');
      assert.match(error.message, /timed out|timeout/i);
      return true;
    }
  );
  assert.ok(performance.now() - startedAt < 2_000, 'timeout path must not hang');
});

test('TypeScript caller retains stderr when the spawned process exits during initialization', async () => {
  const envBinary = '/usr/bin/env';
  assert.equal(existsSync(envBinary), true);

  await assert.rejects(
    runGroundAnalysis({
      binaryPath: envBinary,
      workspace,
      directory: fixtureDirectory,
      checks: ['duplicates'],
      timeoutMs: 500
    }),
    (error: unknown) => {
      assert.ok(error instanceof GroundNativeClientError);
      assert.equal(error.code, 'GROUND_CONNECT_FAILED');
      assert.match(error.message, /Ground stderr:/);
      assert.match(error.message, /illegal option|workspace/i);
      return true;
    }
  );
});
