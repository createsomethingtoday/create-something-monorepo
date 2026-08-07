import assert from 'node:assert/strict';
import { test } from 'node:test';

import { authRoleForInkRoute } from '../src/route-auth.js';

test('classifies device-readable routes as device authenticated', () => {
  assert.equal(authRoleForInkRoute('GET', '/ink/brief'), 'device');
  assert.equal(authRoleForInkRoute('GET', '/ink/clock'), 'device');
  assert.equal(authRoleForInkRoute('POST', '/ink/device-heartbeat'), 'device');
  assert.equal(authRoleForInkRoute('GET', '/ink/codex'), 'device');
  assert.equal(authRoleForInkRoute('POST', '/ink/codex/commands'), 'device');
  assert.equal(authRoleForInkRoute('GET', '/ink/codex/commands/request-1'), 'device');
});

test('classifies runner-only Codex routes without widening device access', () => {
  assert.equal(authRoleForInkRoute('POST', '/ink/codex/snapshot'), 'runner');
  assert.equal(authRoleForInkRoute('GET', '/ink/codex/commands/next'), 'runner');
  assert.equal(authRoleForInkRoute('POST', '/ink/codex/commands/request-1/claim'), 'runner');
  assert.equal(authRoleForInkRoute('POST', '/ink/codex/commands/request-1/receipt'), 'runner');
});

test('classifies clear endpoint as source authenticated', () => {
  assert.equal(authRoleForInkRoute('POST', '/ink/clear'), 'source');
});

test('leaves public routes unauthenticated', () => {
  assert.equal(authRoleForInkRoute('GET', '/healthz'), null);
});
