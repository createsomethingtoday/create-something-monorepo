import test from 'node:test';
import assert from 'node:assert/strict';

import {
  __resetRateLimitBucketsForTests,
  applyRateLimit,
  resolveRateLimitPolicy,
} from '../dist/rate-limit.js';

function freshPolicy(overrides = {}) {
  return resolveRateLimitPolicy({
    HUB_RATE_LIMIT_MAX_CALLS_PER_WINDOW: '3',
    HUB_RATE_LIMIT_WINDOW_SECONDS: '60',
    HUB_RATE_LIMIT_SCOPE: 'account_server',
    ...overrides,
  });
}

test('rate-limit policy is disabled when max calls is 0 or missing', () => {
  const policy = resolveRateLimitPolicy({});
  assert.equal(policy.enabled, false);
  assert.equal(policy.maxCalls, 0);
});

test('rate-limit policy parses CSV exempt servers', () => {
  const policy = resolveRateLimitPolicy({
    HUB_RATE_LIMIT_MAX_CALLS_PER_WINDOW: '5',
    HUB_RATE_LIMIT_EXEMPT_SERVERS: 'foo-mcp, bar-mcp ,foo-mcp',
  });
  assert.deepEqual([...policy.exemptServers].sort(), ['bar-mcp', 'foo-mcp']);
});

test('rate-limit policy scope defaults to account when unrecognized', () => {
  const policy = resolveRateLimitPolicy({
    HUB_RATE_LIMIT_MAX_CALLS_PER_WINDOW: '5',
    HUB_RATE_LIMIT_SCOPE: 'something-weird',
  });
  assert.equal(policy.scope, 'account');
});

test('applyRateLimit allows up to maxCalls, then blocks until window resets', () => {
  __resetRateLimitBucketsForTests();
  const policy = freshPolicy();
  const route = { serverName: 'foo-mcp', downstreamToolName: 'tool_a' };

  const d1 = applyRateLimit(policy, 'acct', route);
  const d2 = applyRateLimit(policy, 'acct', route);
  const d3 = applyRateLimit(policy, 'acct', route);
  const d4 = applyRateLimit(policy, 'acct', route);

  assert.equal(d1.allowed, true);
  assert.equal(d2.allowed, true);
  assert.equal(d3.allowed, true);
  assert.equal(d4.allowed, false);
  assert.equal(d4.remaining, 0);
  assert.equal(d4.scope, 'account_server');
});

test('applyRateLimit isolates buckets by scope=account_server_tool', () => {
  __resetRateLimitBucketsForTests();
  const policy = resolveRateLimitPolicy({
    HUB_RATE_LIMIT_MAX_CALLS_PER_WINDOW: '1',
    HUB_RATE_LIMIT_WINDOW_SECONDS: '60',
    HUB_RATE_LIMIT_SCOPE: 'account_server_tool',
  });

  const routeA = { serverName: 'foo-mcp', downstreamToolName: 'tool_a' };
  const routeB = { serverName: 'foo-mcp', downstreamToolName: 'tool_b' };

  assert.equal(applyRateLimit(policy, 'acct', routeA).allowed, true);
  // Tool A is exhausted, but tool B should still pass.
  assert.equal(applyRateLimit(policy, 'acct', routeA).allowed, false);
  assert.equal(applyRateLimit(policy, 'acct', routeB).allowed, true);
});

test('applyRateLimit short-circuits for exempt servers', () => {
  __resetRateLimitBucketsForTests();
  const policy = resolveRateLimitPolicy({
    HUB_RATE_LIMIT_MAX_CALLS_PER_WINDOW: '1',
    HUB_RATE_LIMIT_EXEMPT_SERVERS: 'safe-mcp',
  });
  const route = { serverName: 'safe-mcp', downstreamToolName: 'tool' };

  for (let i = 0; i < 50; i += 1) {
    const decision = applyRateLimit(policy, 'acct', route);
    assert.equal(decision.allowed, true, `call ${i} should be allowed for exempt server`);
  }
});

test('applyRateLimit is a no-op when the policy is disabled', () => {
  __resetRateLimitBucketsForTests();
  const policy = resolveRateLimitPolicy({});
  const route = { serverName: 'foo-mcp', downstreamToolName: 'tool' };

  const decision = applyRateLimit(policy, 'acct', route);
  assert.equal(decision.allowed, true);
  assert.equal(decision.key, 'disabled');
});
