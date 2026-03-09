import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAuthorizedVisibleProxyRoutes,
  buildVisibleProxyRoutes,
  resolveDiscoveryPack,
  resolveIntentRouteCandidate,
  searchProxyTools,
} from '../index.ts';

function createRuntime() {
  const routeA1 = {
    proxyToolName: 'server_a__alpha',
    serverName: 'server_a',
    downstreamToolName: 'alpha',
    serverTags: [],
    call: async () => ({ ok: true }),
  };
  const routeA2 = {
    proxyToolName: 'server_a__beta',
    serverName: 'server_a',
    downstreamToolName: 'beta',
    serverTags: [],
    call: async () => ({ ok: true }),
  };
  const routeB1 = {
    proxyToolName: 'server_b__gamma',
    serverName: 'server_b',
    downstreamToolName: 'gamma',
    serverTags: [],
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

function createIntentRuntime() {
  const zoomRoute = {
    proxyToolName: 'composio-toolkit-zoom__zoom_create_a_meeting',
    serverName: 'composio-toolkit-zoom',
    downstreamToolName: 'zoom_create_a_meeting',
    serverTags: [],
    call: async () => ({ ok: true }),
  };
  const sheetRoute = {
    proxyToolName: 'composio-toolkit-googlesheets__googlesheets_batch_update',
    serverName: 'composio-toolkit-googlesheets',
    downstreamToolName: 'googlesheets_batch_update',
    serverTags: [],
    call: async () => ({ ok: true }),
  };
  const createSheetRoute = {
    proxyToolName: 'composio-toolkit-googlesheets__googlesheets_create_google_sheet1',
    serverName: 'composio-toolkit-googlesheets',
    downstreamToolName: 'googlesheets_create_google_sheet1',
    serverTags: [],
    call: async () => ({ ok: true }),
  };
  const valuesUpdateRoute = {
    proxyToolName: 'composio-toolkit-googlesheets__googlesheets_values_update',
    serverName: 'composio-toolkit-googlesheets',
    downstreamToolName: 'googlesheets_values_update',
    serverTags: [],
    call: async () => ({ ok: true }),
  };
  const deprecatedSqlRoute = {
    proxyToolName: 'composio-toolkit-googlesheets__googlesheets_execute_sql',
    serverName: 'composio-toolkit-googlesheets',
    downstreamToolName: 'googlesheets_execute_sql',
    serverTags: [],
    call: async () => ({ ok: true }),
  };

  return {
    builtAt: 0,
    stateResolution: {
      state: { enabledBundles: [], enabledServers: [], disabledServers: [] },
      enabledServerNames: ['composio-toolkit-googlesheets', 'composio-toolkit-zoom'],
      warnings: [],
    },
    connected: [],
    failed: [],
    proxies: {
      toolDefinitions: [
        {
          name: zoomRoute.proxyToolName,
          description: '[zoom] create meeting',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: createSheetRoute.proxyToolName,
          description: '[googlesheets] create sheet',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: sheetRoute.proxyToolName,
          description: '[googlesheets] write values to range',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: valuesUpdateRoute.proxyToolName,
          description: '[googlesheets] set values in range',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: deprecatedSqlRoute.proxyToolName,
          description: '[googlesheets] DEPRECATED SQL executor',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
      routes: new Map([
        [zoomRoute.proxyToolName, zoomRoute],
        [createSheetRoute.proxyToolName, createSheetRoute],
        [sheetRoute.proxyToolName, sheetRoute],
        [valuesUpdateRoute.proxyToolName, valuesUpdateRoute],
        [deprecatedSqlRoute.proxyToolName, deprecatedSqlRoute],
      ]),
      warnings: [],
    },
  };
}

const trace = {
  requestId: 'req_1',
  correlationId: 'corr_1',
  transportRequestId: 'req_1',
};

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

test('buildAuthorizedVisibleProxyRoutes filters mutable discovery for read-only sessions', async () => {
  const readRoute = {
    proxyToolName: 'composio-toolkit-googlesheets__googlesheets_get_spreadsheet',
    serverName: 'composio-toolkit-googlesheets',
    downstreamToolName: 'googlesheets_get_spreadsheet',
    serverTags: [],
    call: async () => ({ ok: true }),
  };
  const writeRoute = {
    proxyToolName: 'composio-toolkit-googlesheets__googlesheets_values_update',
    serverName: 'composio-toolkit-googlesheets',
    downstreamToolName: 'googlesheets_values_update',
    serverTags: [],
    call: async () => ({ ok: true }),
  };

  const runtime = {
    builtAt: 0,
    stateResolution: {
      state: { enabledBundles: [], enabledServers: [], disabledServers: [] },
      enabledServerNames: ['composio-toolkit-googlesheets'],
      warnings: [],
    },
    connected: [],
    failed: [],
    proxies: {
      toolDefinitions: [
        {
          name: readRoute.proxyToolName,
          description: '[googlesheets] get spreadsheet',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: writeRoute.proxyToolName,
          description: '[googlesheets] update values',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
      routes: new Map([
        [readRoute.proxyToolName, readRoute],
        [writeRoute.proxyToolName, writeRoute],
      ]),
      warnings: [],
    },
  };

  const visible = await buildAuthorizedVisibleProxyRoutes({
    runtime: runtime as any,
    prefs: {
      mode: 'full',
      activeServers: ['composio-toolkit-googlesheets'],
      maxProxyTools: null,
    },
    accountContext: {
      accountId: 'acct_1',
      tenantId: 'tenant_acme',
      userId: 'user_1',
      sessionId: 'session_1',
      allowedToolPrefixes: null,
      toolMode: 'read_only',
      identitySource: 'session',
    },
    env: {} as any,
    trace,
    entrypoint: 'hub_list_proxy_tools',
  });

  assert.deepEqual(
    visible.toolDefinitions.map((tool) => tool.name),
    ['composio-toolkit-googlesheets__googlesheets_get_spreadsheet'],
  );
});

test('buildAuthorizedVisibleProxyRoutes blocks policy_os_only discovery for mcp-only access', async () => {
  const houseRoute = {
    proxyToolName: 'create-something__house_policy_tool',
    serverName: 'create-something',
    downstreamToolName: 'house_policy_tool',
    serverTags: ['cs', 'policy_os_only'],
    call: async () => ({ ok: true }),
  };

  const runtime = {
    builtAt: 0,
    stateResolution: {
      state: { enabledBundles: [], enabledServers: [], disabledServers: [] },
      enabledServerNames: ['create-something'],
      warnings: [],
    },
    connected: [],
    failed: [],
    proxies: {
      toolDefinitions: [
        {
          name: houseRoute.proxyToolName,
          description: '[create-something] house policy tool',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
      routes: new Map([[houseRoute.proxyToolName, houseRoute]]),
      warnings: [],
    },
  };

  const visible = await buildAuthorizedVisibleProxyRoutes({
    runtime: runtime as any,
    prefs: {
      mode: 'full',
      activeServers: ['create-something'],
      maxProxyTools: null,
    },
    accountContext: {
      accountId: 'acct_1',
      tenantId: 'tenant_acme',
      userId: 'user_1',
      sessionId: 'session_1',
      allowedToolPrefixes: null,
      toolMode: 'read_write',
      serviceTier: 'mcp_only',
      entitlementSnapshot: {
        service_tier: 'mcp_only',
        service_entitled: true,
        policy_accepted: true,
        contract_active: true,
        billing_active: true,
        approved_exception: { present: false },
      },
      identitySource: 'session',
    },
    env: {} as any,
    trace,
    entrypoint: 'hub_list_proxy_tools',
  });

  assert.deepEqual(visible.toolDefinitions.map((tool) => tool.name), []);
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

test('resolveDiscoveryPack returns normalized shared pack preferences', () => {
  const runtime = createRuntime();
  const shared = resolveDiscoveryPack('shared-auth-core', runtime as any);

  assert.ok(shared);
  assert.equal(shared.id, 'shared-auth-core');
  assert.equal(shared.preferences.mode, 'compact');
  assert.equal(shared.preferences.maxProxyTools, null);
  assert.deepEqual(shared.preferences.activeServers, []);
});

test('resolveDiscoveryPack returns null for unknown pack ids', () => {
  const runtime = createRuntime();
  const unknown = resolveDiscoveryPack('does-not-exist', runtime as any);
  assert.equal(unknown, null);
});

test('resolveIntentRouteCandidate prefers allowlisted route when visible', () => {
  const runtime = createIntentRuntime();
  const visible = buildVisibleProxyRoutes(runtime as any, {
    mode: 'compact',
    activeServers: ['composio-toolkit-googlesheets', 'composio-toolkit-zoom'],
    maxProxyTools: null,
  }, {
    accountId: 'acct_1',
    tenantId: null,
    userId: null,
    sessionId: null,
    allowedToolPrefixes: null,
    identitySource: 'fallback',
  });

  const route = resolveIntentRouteCandidate(visible, { intent: 'create_zoom_meeting' });
  assert.equal(route.source, 'allowlist');
  assert.equal(route.proxyToolName, 'composio-toolkit-zoom__zoom_create_a_meeting');
});

test('resolveIntentRouteCandidate uses heuristic router for natural language intents', () => {
  const runtime = createIntentRuntime();
  const visible = buildVisibleProxyRoutes(runtime as any, {
    mode: 'compact',
    activeServers: ['composio-toolkit-googlesheets', 'composio-toolkit-zoom'],
    maxProxyTools: null,
  }, {
    accountId: 'acct_1',
    tenantId: null,
    userId: null,
    sessionId: null,
    allowedToolPrefixes: null,
    identitySource: 'fallback',
  });

  const route = resolveIntentRouteCandidate(visible, {
    intent: 'create a google sheet and write a formula',
  });

  assert.equal(route.source, 'allowlist');
  assert.equal(route.proxyToolName, 'composio-toolkit-googlesheets__googlesheets_create_google_sheet1');
});

test('resolveIntentRouteCandidate falls back to discovery for unknown intents', () => {
  const runtime = createIntentRuntime();
  const visible = buildVisibleProxyRoutes(runtime as any, {
    mode: 'compact',
    activeServers: ['composio-toolkit-googlesheets', 'composio-toolkit-zoom'],
    maxProxyTools: null,
  }, {
    accountId: 'acct_1',
    tenantId: null,
    userId: null,
    sessionId: null,
    allowedToolPrefixes: null,
    identitySource: 'fallback',
  });

  const route = resolveIntentRouteCandidate(visible, {
    intent: 'record workflow rows',
    query: 'batch',
    serverName: 'composio-toolkit-googlesheets',
  });
  assert.equal(route.source, 'discovery');
  assert.equal(route.proxyToolName, 'composio-toolkit-googlesheets__googlesheets_batch_update');
});

test('resolveIntentRouteCandidate de-prioritizes deprecated discovery tools', () => {
  const runtime = createIntentRuntime();
  const visible = buildVisibleProxyRoutes(runtime as any, {
    mode: 'compact',
    activeServers: ['composio-toolkit-googlesheets', 'composio-toolkit-zoom'],
    maxProxyTools: null,
  }, {
    accountId: 'acct_1',
    tenantId: null,
    userId: null,
    sessionId: null,
    allowedToolPrefixes: null,
    identitySource: 'fallback',
  });

  const route = resolveIntentRouteCandidate(visible, {
    intent: 'workflow synchronization task',
    query: 'write',
    serverName: 'composio-toolkit-googlesheets',
  });

  assert.equal(route.source, 'discovery');
  assert.notEqual(route.proxyToolName, 'composio-toolkit-googlesheets__googlesheets_execute_sql');
});
