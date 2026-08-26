import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateApprovalGate } from '../src/approval-gate.mjs';

const base = {
  autonomy: 'auto_allow',
  evidenceComplete: true,
  approved: false,
  toolDeclared: true,
};

test('passes an evidenced auto-allow action with a declared tool', () => {
  assert.deepEqual(evaluateApprovalGate(base), {
    disposition: 'pass',
    reason: 'READY',
    canInvoke: true,
  });
});

test('waits for an unapproved approval-required action', () => {
  assert.deepEqual(evaluateApprovalGate({ ...base, autonomy: 'approval_required' }), {
    disposition: 'wait',
    reason: 'APPROVAL_REQUIRED',
    canInvoke: false,
  });
});

test('passes an approved approval-required action', () => {
  assert.deepEqual(
    evaluateApprovalGate({ ...base, autonomy: 'approval_required', approved: true }),
    { disposition: 'pass', reason: 'READY', canInvoke: true },
  );
});

test('stops blocked actions', () => {
  assert.deepEqual(evaluateApprovalGate({ ...base, autonomy: 'blocked' }), {
    disposition: 'stop',
    reason: 'BLOCKED',
    canInvoke: false,
  });
});

test('stops when evidence is incomplete', () => {
  assert.deepEqual(evaluateApprovalGate({ ...base, evidenceComplete: false }), {
    disposition: 'stop',
    reason: 'MISSING_EVIDENCE',
    canInvoke: false,
  });
});
