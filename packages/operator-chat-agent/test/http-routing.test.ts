import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveOperatorRoute } from '../src/http-routing.js';

test('direct Agents SDK routes are not public operator ingress', () => {
  const request = new Request('https://operator.example.test/agents/operator-chat-agent/default');

  assert.equal(resolveOperatorRoute(request), 'not_found');
});
