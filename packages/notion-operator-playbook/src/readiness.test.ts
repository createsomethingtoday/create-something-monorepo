import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectRunbookReadiness } from './readiness.js';

test('readiness is blocked with explicit missing requirements', () => {
  const result = inspectRunbookReadiness({
    runbookId: 'runbook-demo',
    title: 'Operator handoff',
    owner: '',
    approvalStatus: 'review',
    rollbackPlan: '',
    evidenceCount: 0,
    stepCount: 3
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.missingRequirements, [
    'Named owner',
    'Approved review state',
    'Rollback plan',
    'At least one evidence artifact'
  ]);
});

test('readiness produces a stable receipt for a ready Runbook', () => {
  const input = {
    runbookId: 'runbook-demo',
    title: 'Operator handoff',
    owner: 'Demo Operator',
    approvalStatus: 'approved' as const,
    rollbackPlan: 'Stop and restore the prior reviewed version.',
    evidenceCount: 2,
    stepCount: 3
  };
  const first = inspectRunbookReadiness(input);
  const second = inspectRunbookReadiness(input);
  assert.equal(first.ready, true);
  assert.equal(first.status, 'ready');
  assert.equal(first.receiptId, second.receiptId);
});
