import assert from 'node:assert/strict';
import test from 'node:test';

import { dormantHealthPayload, isActiveLifecycle, retiredRouteResponse } from '../lifecycle.js';

test('the worker fails closed unless active lifecycle is explicit', () => {
  assert.equal(isActiveLifecycle({}), false);
  assert.equal(isActiveLifecycle({ LIFECYCLE: 'dormant' }), false);
  assert.equal(isActiveLifecycle({ LIFECYCLE: 'active' }), true);
});

test('retired operational routes return Gone while health remains inspectable', async () => {
  const retired = retiredRouteResponse(new URL('https://gmail.example/mcp'));
  assert.equal(retired?.status, 410);
  assert.deepEqual(await retired?.json(), {
    error: 'This retired Gmail sync service is not available.'
  });

  assert.equal(retiredRouteResponse(new URL('https://gmail.example/health')), null);
  assert.equal(retiredRouteResponse(new URL('https://gmail.example/')), null);
});

test('dormant health payloads do not expose account data or operational endpoints', () => {
  assert.deepEqual(dormantHealthPayload(), {
    name: 'halfdozen-gmail-sync-mcp',
    version: '4.0.0',
    lifecycle: 'dormant'
  });
});
