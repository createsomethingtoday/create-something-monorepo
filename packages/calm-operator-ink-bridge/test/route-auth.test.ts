import assert from 'node:assert/strict';
import { test } from 'node:test';

import { authRoleForInkRoute } from '../src/route-auth.js';

test('classifies device-readable routes as device authenticated', () => {
  assert.equal(authRoleForInkRoute('GET', '/ink/brief'), 'device');
  assert.equal(authRoleForInkRoute('GET', '/ink/clock'), 'device');
  assert.equal(authRoleForInkRoute('GET', '/ink/agent-console'), 'device');
  assert.equal(authRoleForInkRoute('POST', '/ink/device-heartbeat'), 'device');
  assert.equal(authRoleForInkRoute('POST', '/ink/agent-decision'), 'device');
});

test('classifies agent progress and command delivery as relay authenticated', () => {
  assert.equal(authRoleForInkRoute('POST', '/ink/agent-progress'), 'relay');
  assert.equal(authRoleForInkRoute('POST', '/ink/agent-decisions/lease'), 'relay');
  assert.equal(authRoleForInkRoute('POST', '/ink/agent-decisions/decision-1/receipt'), 'relay');
});

test('classifies clear endpoint as source authenticated', () => {
  assert.equal(authRoleForInkRoute('POST', '/ink/clear'), 'source');
});

test('leaves public routes unauthenticated', () => {
  assert.equal(authRoleForInkRoute('GET', '/healthz'), null);
});
