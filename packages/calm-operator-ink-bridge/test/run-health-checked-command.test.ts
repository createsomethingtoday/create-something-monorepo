import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildCommandHealthPayload,
  parseArgs,
  runHealthCheckedCommand
} from '../scripts/run-health-checked-command.mjs';

test('parses wrapper args and command after separator', () => {
  const args = parseArgs([
    'node',
    'run-health-checked-command.mjs',
    '--name',
    'MCP review agent',
    '--registry-id',
    'agent.mcp-review',
    '--',
    'npm',
    'run',
    'mcp:review'
  ], {});

  assert.equal(args.name, 'MCP review agent');
  assert.equal(args.registryId, 'agent.mcp-review');
  assert.deepEqual(args.command, ['npm', 'run', 'mcp:review']);
});

test('builds successful command health without leaking command args', () => {
  const snapshot = buildCommandHealthPayload(
    {
      name: 'MCP review agent',
      source: 'test-wrapper',
      type: 'agent',
      registryId: 'agent.mcp-review',
      command: ['npm', 'run', 'mcp:review'],
      successStatus: 'healthy',
      failureStatus: 'failed'
    },
    { status: 0 },
    123,
    1000
  );

  assert.equal(snapshot.status, 'healthy');
  assert.equal(snapshot.severity, 0);
  assert.equal(snapshot.payload.command_name, 'npm');
  assert.equal(snapshot.payload.registry_id, 'agent.mcp-review');
  assert.doesNotMatch(JSON.stringify(snapshot), /mcp:review/);
});

test('builds failed command health with operator action', () => {
  const snapshot = buildCommandHealthPayload(
    {
      name: 'MCP review agent',
      source: 'test-wrapper',
      type: 'agent',
      registryId: 'agent.mcp-review',
      action: 'Inspect the registry review report',
      command: ['node', 'review.mjs'],
      successStatus: 'healthy',
      failureStatus: 'failed'
    },
    { status: 7 },
    200,
    1000
  );

  assert.equal(snapshot.status, 'failed');
  assert.equal(snapshot.severity, 80);
  assert.equal(snapshot.payload.exit_code, 7);
  assert.equal(snapshot.payload.action, 'Inspect the registry review report');
});

test('dry-run executes the command and skips posting', async () => {
  const result = await runHealthCheckedCommand({
    name: 'Dry Run Agent',
    source: 'test-wrapper',
    type: 'agent',
    origin: 'https://ink.example.test',
    successStatus: 'healthy',
    failureStatus: 'failed',
    dryRun: true,
    command: [process.execPath, '-e', 'process.exit(0)']
  }, { stdio: 'pipe' });

  assert.equal(result.ok, true);
  assert.equal(result.dry_run, true);
  assert.equal(result.command_exit_code, 0);
  assert.equal(result.snapshot.status, 'healthy');
});

test('posts failed health snapshots and preserves command exit code', async () => {
  let posted;
  const result = await runHealthCheckedCommand({
    name: 'Failing Agent',
    source: 'test-wrapper',
    type: 'agent',
    origin: 'https://ink.example.test',
    token: 'test-token',
    successStatus: 'healthy',
    failureStatus: 'failed',
    command: [process.execPath, '-e', 'process.exit(5)']
  }, {
    stdio: 'pipe',
    postHealthSnapshot: async (options) => {
      posted = options;
      return { ok: true };
    }
  });

  assert.equal(result.command_exit_code, 5);
  assert.equal(result.snapshot.status, 'failed');
  assert.equal(posted.url, 'https://ink.example.test/ink/health-snapshot');
  assert.equal(posted.token, 'test-token');
  assert.equal(posted.snapshot.payload.exit_code, 5);
});
