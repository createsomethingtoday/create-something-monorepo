import assert from 'node:assert/strict';
import { test } from 'node:test';

import { authRoleForOperatorRoute, canonicalOperatorPath } from '../src/route-auth.js';

test('classifies device-readable routes as device authenticated', () => {
  assert.equal(authRoleForOperatorRoute('GET', '/operator/brief'), 'device');
  assert.equal(authRoleForOperatorRoute('GET', '/operator/clock'), 'device');
  assert.equal(authRoleForOperatorRoute('GET', '/operator/agent-console'), 'device');
  assert.equal(
    authRoleForOperatorRoute('GET', '/operator/agent-decisions/decision-1'),
    'device'
  );
  assert.equal(authRoleForOperatorRoute('POST', '/operator/device-heartbeat'), 'device');
  assert.equal(authRoleForOperatorRoute('POST', '/operator/agent-decision'), 'device');
  assert.equal(authRoleForOperatorRoute('POST', '/operator/voice-command'), 'device');
  assert.equal(authRoleForOperatorRoute('GET', '/operator/voice-command/voice-1'), 'device');
  assert.equal(
    authRoleForOperatorRoute('POST', '/operator/voice-command/voice-1/confirm'),
    'device'
  );
});

test('classifies agent progress and command delivery as relay authenticated', () => {
  assert.equal(authRoleForOperatorRoute('POST', '/operator/agent-progress'), 'relay');
  assert.equal(authRoleForOperatorRoute('POST', '/operator/agent-decisions/lease'), 'relay');
  assert.equal(
    authRoleForOperatorRoute('POST', '/operator/agent-decisions/decision-1/receipt'),
    'relay'
  );
  assert.equal(authRoleForOperatorRoute('POST', '/operator/voice-commands/lease'), 'relay');
  assert.equal(
    authRoleForOperatorRoute('POST', '/operator/voice-command/voice-1/transcript'),
    'relay'
  );
});

test('classifies clear endpoint as source authenticated', () => {
  assert.equal(authRoleForOperatorRoute('POST', '/operator/clear'), 'source');
});

test('leaves public routes unauthenticated', () => {
  assert.equal(authRoleForOperatorRoute('GET', '/healthz'), null);
});

test('keeps legacy Ink routes as canonical compatibility aliases', () => {
  assert.equal(canonicalOperatorPath('/operator/brief'), '/ink/brief');
  assert.equal(
    canonicalOperatorPath('/operator/agent-decisions/d1/receipt'),
    '/ink/agent-decisions/d1/receipt'
  );
  assert.equal(canonicalOperatorPath('/ink/brief'), '/ink/brief');
  assert.equal(canonicalOperatorPath('/healthz'), '/healthz');
});
