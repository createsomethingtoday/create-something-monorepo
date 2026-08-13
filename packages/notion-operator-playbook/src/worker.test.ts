import assert from 'node:assert/strict';
import test from 'node:test';
import type { InstantiateRunbookResult } from './contracts.js';
import worker from './index.js';

test('worker manifest exposes the bounded reference capabilities', () => {
  const manifest = worker.manifest;
  assert.deepEqual(
    manifest.capabilities.map((capability) => [capability._tag, capability.key]),
    [
      ['sync', 'demoEvidenceSync'],
      ['tool', 'inspectRunbookReadiness'],
      ['tool', 'instantiateRunbook'],
      ['webhook', 'runbookEvidenceWebhook']
    ]
  );
  const readiness = manifest.capabilities.find(
    (capability) => capability.key === 'inspectRunbookReadiness'
  );
  assert.deepEqual((readiness?.config as Record<string, unknown>).hints, {
    readOnlyHint: true
  });
});

test('manual demo sync returns only sanitized evidence fixtures', async () => {
  const result = (await worker.run('demoEvidenceSync', undefined, {
    concreteOutput: true
  })) as {
    changes: Array<{ key: string }>;
    hasMore: boolean;
  };
  assert.equal(result.hasMore, false);
  assert.deepEqual(
    result.changes.map((change) => change.key),
    ['evidence-demo-map', 'evidence-demo-smoke', 'evidence-demo-approval']
  );
});

test('readiness tool executes locally without a Notion token', async () => {
  const result = (await worker.run(
    'inspectRunbookReadiness',
    {
      runbookId: 'runbook-demo',
      title: 'Demo handoff',
      owner: 'Demo Operator',
      approvalStatus: 'approved',
      rollbackPlan: 'Restore prior reviewed state.',
      evidenceCount: 2,
      stepCount: 3
    },
    { concreteOutput: true }
  )) as { ready: boolean };
  assert.equal(result.ready, true);
});

test('instantiation tool previews locally without a Notion token', async () => {
  const result = (await worker.run(
    'instantiateRunbook',
    {
      playbookId: 'playbook-operator-handoff',
      playbookVersion: '1.0.0',
      runbookTitle: 'Demo operator handoff',
      owner: 'Demo Operator',
      approved: true,
      dryRun: true,
      targetDataSourceId: null,
      steps: ['Confirm scope.', 'Run the smoke.', 'Attach evidence.']
    },
    { concreteOutput: true }
  )) as InstantiateRunbookResult;
  const repeated = (await worker.run(
    'instantiateRunbook',
    {
      playbookId: 'playbook-operator-handoff',
      playbookVersion: '1.0.0',
      runbookTitle: 'Demo operator handoff',
      owner: 'Demo Operator',
      approved: true,
      dryRun: true,
      targetDataSourceId: null,
      steps: ['Confirm scope.', 'Run the smoke.', 'Attach evidence.']
    },
    { concreteOutput: true }
  )) as InstantiateRunbookResult;
  assert.deepEqual(
    { ...result, receiptId: '<stable>' },
    {
      status: 'preview',
      created: false,
      reason: 'Dry run only; no Notion page was created.',
      receiptId: '<stable>',
      pageId: null,
      runbookTitle: 'Demo operator handoff',
      stepCount: 3,
      dryRun: true
    }
  );
  assert.equal(result.receiptId, repeated.receiptId);
});
