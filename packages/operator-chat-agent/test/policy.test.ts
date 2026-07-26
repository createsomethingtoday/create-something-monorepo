import assert from 'node:assert/strict';
import { test } from 'node:test';

import { classifyTool, decideToolPolicy } from '../src/policy.js';

test('classifies known operator tools', () => {
  assert.equal(classifyTool('operator_status'), 'read');
  assert.equal(classifyTool('linear_open_issues'), 'read');
  assert.equal(classifyTool('request_paid_capability'), 'spend');
  assert.equal(classifyTool('unknown_tool'), 'write');
});

test('read only mode allows read tools', () => {
  const decision = decideToolPolicy({
    toolName: 'operator_status',
    accessMode: 'read_only',
    paidMode: 'handoff_only'
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.routeClass, 'read');
});

test('read only mode blocks unknown write tools', () => {
  const decision = decideToolPolicy({
    toolName: 'unknown_tool',
    accessMode: 'read_only',
    paidMode: 'handoff_only'
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.routeClass, 'write');
});

test('paid capability requests are allowed only when paid mode is enabled', () => {
  assert.equal(
    decideToolPolicy({
      toolName: 'request_paid_capability',
      accessMode: 'read_only',
      paidMode: 'handoff_only'
    }).allowed,
    true
  );

  assert.equal(
    decideToolPolicy({
      toolName: 'request_paid_capability',
      accessMode: 'read_only',
      paidMode: 'off'
    }).allowed,
    false
  );
});

test('off mode blocks all tools', () => {
  const decision = decideToolPolicy({
    toolName: 'operator_status',
    accessMode: 'off',
    paidMode: 'handoff_only'
  });

  assert.equal(decision.allowed, false);
});
