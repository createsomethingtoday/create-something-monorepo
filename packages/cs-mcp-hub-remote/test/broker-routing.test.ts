import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildVisibleProxyRoutes,
  searchProxyTools,
} from '../index.ts';

function createRuntime() {
  const routeA1 = {
    proxyToolName: 'server_a__alpha',
    serverName: 'server_a',
    downstreamToolName: 'alpha',
    call: async () => ({ ok: true }),
  };
  const routeA2 = {
    proxyToolName: 'server_a__beta',
    serverName: 'server_a',
    downstreamToolName: 'beta',
    call: async () => ({ ok: true }),
  };
  const routeB1 = {
    proxyToolName: 'server_b__gamma',
    serverName: 'server_b',
    downstreamToolName: 'gamma',
    call: async () => ({ ok: true }),
  };

  return {
    builtAt: 0,
    stateResolution: {
      state: { enabledBundles: [], enabledServers: [], disabledServers: [] },
      enabledServerNames: ['server_a', 'server_b'],
      warnings: [],
    },
    connected: [],
    failed: [],
    proxies: {
      toolDefinitions: [
        {
          name: routeA1.proxyToolName,
          description: '[server_a] alpha',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: routeA2.proxyToolName,
          description: '[server_a] beta',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: routeB1.proxyToolName,
          description: '[server_b] gamma',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
      routes: new Map([
        [routeA1.proxyToolName, routeA1],
        [routeA2.proxyToolName, routeA2],
        [routeB1.proxyToolName, routeB1],
      ]),
      warnings: [],
    },
  };
}

test('buildVisibleProxyRoutes applies session -> discovery -> max cap', () => {
  const runtime = createRuntime();
  const prefs = {
    mode: 'compact' as const,
    activeServers: ['server_a'],
    maxProxyTools: 1,
  };
  const accountContext = {
    accountId: 'acct_1',
    tenantId: null,
    userId: null,
    sessionId: 'session_1',
    allowedToolPrefixes: ['server_a__'],
    identitySource: 'session' as const,
  };

  const visible = buildVisibleProxyRoutes(runtime as any, prefs, accountContext);
  assert.equal(visible.toolDefinitions.length, 1);
  assert.equal(visible.toolDefinitions[0]?.name, 'server_a__alpha');
  assert.equal(visible.routes.has('server_b__gamma'), false);
});

test('buildVisibleProxyRoutes in full mode keeps all session-allowed routes', () => {
  const runtime = createRuntime();
  const prefs = {
    mode: 'full' as const,
    activeServers: [],
    maxProxyTools: null,
  };
  const accountContext = {
    accountId: 'acct_1',
    tenantId: null,
    userId: null,
    sessionId: 'session_1',
    allowedToolPrefixes: ['server_a__'],
    identitySource: 'session' as const,
  };

  const visible = buildVisibleProxyRoutes(runtime as any, prefs, accountContext);
  assert.deepEqual(
    visible.toolDefinitions.map((tool) => tool.name),
    ['server_a__alpha', 'server_a__beta'],
  );
});

test('searchProxyTools only searches visible routes', () => {
  const runtime = createRuntime();
  const prefs = {
    mode: 'compact' as const,
    activeServers: ['server_a'],
    maxProxyTools: null,
  };
  const accountContext = {
    accountId: 'acct_1',
    tenantId: null,
    userId: null,
    sessionId: 'session_1',
    allowedToolPrefixes: ['server_a__'],
    identitySource: 'session' as const,
  };

  const visible = buildVisibleProxyRoutes(runtime as any, prefs, accountContext);
  const result = searchProxyTools(visible, { query: 'gamma', limit: 10 });
  assert.equal(result.total, 0);

  const serverFiltered = searchProxyTools(visible, {
    serverName: 'server_a',
    query: 'beta',
    limit: 10,
  });
  assert.equal(serverFiltered.total, 1);
  assert.equal(serverFiltered.tools[0]?.proxyToolName, 'server_a__beta');
});
