import assert from 'node:assert/strict';
import { test } from 'node:test';

import { paidCapabilityMaxUsd, paidCapabilityMode, toolAccessMode } from '../src/env.js';

test('tool access defaults to read only', () => {
  assert.equal(toolAccessMode({}), 'read_only');
  assert.equal(toolAccessMode({ OPERATOR_TOOL_ACCESS_MODE: 'normal' }), 'normal');
  assert.equal(toolAccessMode({ OPERATOR_TOOL_ACCESS_MODE: 'off' }), 'off');
  assert.equal(toolAccessMode({ OPERATOR_TOOL_ACCESS_MODE: 'nonsense' }), 'read_only');
});

test('paid capability mode defaults to handoff only', () => {
  assert.equal(paidCapabilityMode({}), 'handoff_only');
  assert.equal(paidCapabilityMode({ PAID_CAPABILITY_MODE: 'live' }), 'live');
  assert.equal(paidCapabilityMode({ PAID_CAPABILITY_MODE: 'off' }), 'off');
});

test('paid capability max has bounded fallback', () => {
  assert.equal(paidCapabilityMaxUsd({}), 25);
  assert.equal(paidCapabilityMaxUsd({ PAID_CAPABILITY_MAX_USD: '40' }), 40);
  assert.equal(paidCapabilityMaxUsd({ PAID_CAPABILITY_MAX_USD: '-5' }), 25);
  assert.equal(paidCapabilityMaxUsd({ PAID_CAPABILITY_MAX_USD: '500' }), 250);
});
