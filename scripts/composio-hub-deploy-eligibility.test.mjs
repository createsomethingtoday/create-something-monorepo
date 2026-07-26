import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { evaluateComposioDeployEligibility } from './composio-hub-deploy-eligibility.mjs';

test('manual dispatch is the only event that does not require an owned source change', () => {
  assert.deepEqual(
    evaluateComposioDeployEligibility({ eventName: 'workflow_dispatch', changedPaths: [] }),
    { eligible: true, reason: 'manual workflow dispatch' }
  );

  assert.deepEqual(
    evaluateComposioDeployEligibility({ eventName: 'pull_request', changedPaths: [] }),
    { eligible: false, reason: 'unsupported event: pull_request' }
  );
});

test('generic workspace files stay build-only', () => {
  assert.deepEqual(
    evaluateComposioDeployEligibility({
      eventName: 'push',
      changedPaths: ['pnpm-lock.yaml', 'packages/operator-chat-agent/package.json']
    }),
    { eligible: false, reason: 'no Composio hub source change; build-only guard' }
  );

  assert.deepEqual(
    evaluateComposioDeployEligibility({
      eventName: 'push',
      changedPaths: ['package.json', '.github/workflows/composio-hub-deploy.yml']
    }),
    { eligible: false, reason: 'no Composio hub source change; build-only guard' }
  );
});

test('owned Composio and hub source changes are deploy-eligible', () => {
  for (const changedPath of [
    'config/mcp-hub/registry.json',
    'packages/composio-toolkit-mcp/src/index.ts',
    'packages/cs-mcp-hub-remote/src/index.ts',
    'scripts/cs-hub-fleet-deploy.sh',
    'scripts/cs-hub-fleet-verify.sh'
  ]) {
    assert.deepEqual(
      evaluateComposioDeployEligibility({ eventName: 'push', changedPaths: [changedPath] }),
      { eligible: true, reason: `Composio hub source changed: ${changedPath}` }
    );
  }
});

test('a failed Git comparison emits valid fail-closed GitHub outputs', () => {
  const result = spawnSync(
    process.execPath,
    [
      new URL('./composio-hub-deploy-eligibility.mjs', import.meta.url).pathname,
      '--event',
      'push',
      '--before',
      '1111111111111111111111111111111111111111',
      '--after',
      '2222222222222222222222222222222222222222'
    ],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 0);
  const outputLines = result.stdout.trim().split('\n');
  assert.equal(outputLines.length, 2);
  assert.equal(outputLines[0], 'eligible=false');
  assert.match(
    outputLines[1],
    /^reason=unable to determine changed paths; build-only guard \(.+\)$/
  );
});

test('workflow gates every live mutation and verification step', async () => {
  const workflow = await readFile(
    new URL('../.github/workflows/composio-hub-deploy.yml', import.meta.url),
    'utf8'
  );

  assert.match(workflow, /fetch-depth:\s*2/);
  assert.match(workflow, /name: Resolve deploy eligibility/);
  assert.match(workflow, /name: Skip Composio hub deploy/);
  assert.equal(
    workflow.match(/scripts\/composio-hub-deploy-eligibility\.mjs/g)?.length,
    2,
    'the eligibility policy must trigger and execute its own workflow'
  );

  for (const stepName of [
    'Deploy Composio toolkit gateway',
    'Deploy remote MCP hub fleet',
    'Verify remote MCP hub fleet',
    'Verify Policy OS live gating'
  ]) {
    const escapedName = stepName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(
      workflow,
      new RegExp(`name: ${escapedName}\\n\\s+if: .*steps\\.deploy\\.outputs\\.eligible == 'true'`)
    );
  }
});
