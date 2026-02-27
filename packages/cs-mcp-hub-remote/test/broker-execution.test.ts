import assert from 'node:assert/strict';
import test from 'node:test';

import { executeProxyRoute } from '../index.ts';

const disabledRateLimitPolicy = {
  enabled: false,
  maxCalls: 0,
  windowMs: 60_000,
  windowSeconds: 60,
  scope: 'account' as const,
  exemptServers: new Set<string>(),
};

const disabledQuotaPolicy = {
  enabled: false,
  maxCallsPerPeriod: 0,
  exemptServers: new Set<string>(),
};

const trace = {
  requestId: 'req_1',
  correlationId: 'corr_1',
  transportRequestId: 'req_1',
};

test('executeProxyRoute executes visible route and returns downstream payload', async () => {
  let callCount = 0;
  let capturedArgs: Record<string, unknown> | null = null;
  const route = {
    proxyToolName: 'server_a__alpha',
    serverName: 'server_a',
    downstreamToolName: 'alpha',
    call: async (args: Record<string, unknown>) => {
      callCount += 1;
      capturedArgs = args;
      return {
        content: [{ type: 'text', text: 'ok' }],
        structuredContent: { ok: true },
      };
    },
  };

  const result = await executeProxyRoute({
    env: {} as any,
    route,
    executionArgs: { foo: 'bar' },
    trace,
    accountContext: {
      accountId: 'acct_1',
      tenantId: null,
      userId: null,
      sessionId: null,
      allowedToolPrefixes: null,
      identitySource: 'fallback',
    },
    accountId: 'acct_1',
    toolName: 'hub_execute_proxy_tool',
    startedAt: Date.now(),
    rateLimitPolicy: disabledRateLimitPolicy,
    quotaPolicy: disabledQuotaPolicy,
    entrypoint: 'hub_execute_proxy_tool',
    entryProxyToolName: route.proxyToolName,
  });

  assert.equal(callCount, 1);
  assert.deepEqual(capturedArgs, { foo: 'bar' });
  assert.equal((result as any).isError, undefined);
});

test('executeProxyRoute blocks calls outside session scope', async () => {
  let called = false;
  const route = {
    proxyToolName: 'server_b__gamma',
    serverName: 'server_b',
    downstreamToolName: 'gamma',
    call: async () => {
      called = true;
      return { ok: true };
    },
  };

  const result = await executeProxyRoute({
    env: {} as any,
    route,
    executionArgs: {},
    trace,
    accountContext: {
      accountId: 'acct_1',
      tenantId: null,
      userId: null,
      sessionId: 'session_1',
      allowedToolPrefixes: [],
      identitySource: 'session',
    },
    accountId: 'acct_1',
    toolName: 'hub_execute_proxy_tool',
    startedAt: Date.now(),
    rateLimitPolicy: disabledRateLimitPolicy,
    quotaPolicy: disabledQuotaPolicy,
    entrypoint: 'hub_execute_proxy_tool',
    entryProxyToolName: route.proxyToolName,
  });

  assert.equal(called, false);
  assert.equal((result as any).isError, true);
  assert.match((result as any).content[0].text, /not enabled for this session/);
});

test('executeProxyRoute surfaces downstream failures as MCP errors', async () => {
  const route = {
    proxyToolName: 'server_a__alpha',
    serverName: 'server_a',
    downstreamToolName: 'alpha',
    call: async () => {
      throw new Error('downstream exploded');
    },
  };

  const result = await executeProxyRoute({
    env: {} as any,
    route,
    executionArgs: {},
    trace,
    accountContext: {
      accountId: 'acct_1',
      tenantId: null,
      userId: null,
      sessionId: null,
      allowedToolPrefixes: null,
      identitySource: 'fallback',
    },
    accountId: 'acct_1',
    toolName: 'hub_execute_proxy_tool',
    startedAt: Date.now(),
    rateLimitPolicy: disabledRateLimitPolicy,
    quotaPolicy: disabledQuotaPolicy,
    entrypoint: 'hub_execute_proxy_tool',
    entryProxyToolName: route.proxyToolName,
  });

  assert.equal((result as any).isError, true);
  assert.match((result as any).content[0].text, /Tool "server_a__alpha" failed: downstream exploded/);
});
