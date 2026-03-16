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
    toolExposureMode: 'all' as const,
    expandedServers: [],
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

test('buildVisibleProxyRoutes round-robins compact caps so later active servers are not starved', () => {
  const runtime = {
    builtAt: 0,
    stateResolution: {
      state: { enabledBundles: [], enabledServers: [], disabledServers: [] },
      enabledServerNames: ['server_a', 'server_b', 'server_c'],
      warnings: [],
    },
    connected: [],
    failed: [],
    proxies: {
      toolDefinitions: [
        { name: 'server_a__alpha_1', description: '[server_a] alpha 1', inputSchema: { type: 'object', properties: {} } },
        { name: 'server_a__alpha_2', description: '[server_a] alpha 2', inputSchema: { type: 'object', properties: {} } },
        { name: 'server_a__alpha_3', description: '[server_a] alpha 3', inputSchema: { type: 'object', properties: {} } },
        { name: 'server_a__alpha_4', description: '[server_a] alpha 4', inputSchema: { type: 'object', properties: {} } },
        { name: 'server_b__beta_1', description: '[server_b] beta 1', inputSchema: { type: 'object', properties: {} } },
        { name: 'server_b__beta_2', description: '[server_b] beta 2', inputSchema: { type: 'object', properties: {} } },
        { name: 'server_b__beta_3', description: '[server_b] beta 3', inputSchema: { type: 'object', properties: {} } },
        { name: 'server_c__gamma_1', description: '[server_c] gamma 1', inputSchema: { type: 'object', properties: {} } },
      ],
      routes: new Map([
        ['server_a__alpha_1', { proxyToolName: 'server_a__alpha_1', serverName: 'server_a', downstreamToolName: 'alpha_1', serverTags: [], call: async () => ({ ok: true }) }],
        ['server_a__alpha_2', { proxyToolName: 'server_a__alpha_2', serverName: 'server_a', downstreamToolName: 'alpha_2', serverTags: [], call: async () => ({ ok: true }) }],
        ['server_a__alpha_3', { proxyToolName: 'server_a__alpha_3', serverName: 'server_a', downstreamToolName: 'alpha_3', serverTags: [], call: async () => ({ ok: true }) }],
        ['server_a__alpha_4', { proxyToolName: 'server_a__alpha_4', serverName: 'server_a', downstreamToolName: 'alpha_4', serverTags: [], call: async () => ({ ok: true }) }],
        ['server_b__beta_1', { proxyToolName: 'server_b__beta_1', serverName: 'server_b', downstreamToolName: 'beta_1', serverTags: [], call: async () => ({ ok: true }) }],
        ['server_b__beta_2', { proxyToolName: 'server_b__beta_2', serverName: 'server_b', downstreamToolName: 'beta_2', serverTags: [], call: async () => ({ ok: true }) }],
        ['server_b__beta_3', { proxyToolName: 'server_b__beta_3', serverName: 'server_b', downstreamToolName: 'beta_3', serverTags: [], call: async () => ({ ok: true }) }],
        ['server_c__gamma_1', { proxyToolName: 'server_c__gamma_1', serverName: 'server_c', downstreamToolName: 'gamma_1', serverTags: [], call: async () => ({ ok: true }) }],
      ]),
      warnings: [],
    },
  };

  const visible = buildVisibleProxyRoutes(runtime as any, {
    mode: 'compact',
    activeServers: ['server_a', 'server_b', 'server_c'],
    maxProxyTools: 5,
    toolExposureMode: 'all',
    expandedServers: [],
  }, {
    accountId: 'acct_1',
    tenantId: null,
    userId: null,
    sessionId: 'session_1',
    allowedToolPrefixes: null,
    identitySource: 'session' as const,
  });

  assert.deepEqual(
    visible.toolDefinitions.map((tool) => tool.name),
    [
      'server_a__alpha_1',
      'server_b__beta_1',
      'server_c__gamma_1',
      'server_a__alpha_2',
      'server_b__beta_2',
    ],
  );
});

test('buildVisibleProxyRoutes keeps bootstrap tools for inactive service-first services until expanded', () => {
  const runtime = {
    builtAt: 0,
    stateResolution: {
      state: { enabledBundles: [], enabledServers: [], disabledServers: [] },
      enabledServerNames: ['composio-toolkit-gmail', 'composio-toolkit-notion'],
      warnings: [],
    },
    connected: [],
    failed: [],
    proxies: {
      toolDefinitions: [
        { name: 'composio-toolkit-gmail__connection_status', description: '[gmail] connection status', inputSchema: { type: 'object', properties: {} } },
        { name: 'composio-toolkit-gmail__get_connect_link', description: '[gmail] get connect link', inputSchema: { type: 'object', properties: {} } },
        { name: 'composio-toolkit-gmail__toolkit_info', description: '[gmail] toolkit info', inputSchema: { type: 'object', properties: {} } },
        { name: 'composio-toolkit-gmail__gmail_send_email', description: '[gmail] send email', inputSchema: { type: 'object', properties: {} } },
        { name: 'composio-toolkit-notion__connection_status', description: '[notion] connection status', inputSchema: { type: 'object', properties: {} } },
        { name: 'composio-toolkit-notion__get_connect_link', description: '[notion] get connect link', inputSchema: { type: 'object', properties: {} } },
        { name: 'composio-toolkit-notion__toolkit_info', description: '[notion] toolkit info', inputSchema: { type: 'object', properties: {} } },
        { name: 'composio-toolkit-notion__notion_query_database', description: '[notion] query database', inputSchema: { type: 'object', properties: {} } },
      ],
      routes: new Map([
        ['composio-toolkit-gmail__connection_status', { proxyToolName: 'composio-toolkit-gmail__connection_status', serverName: 'composio-toolkit-gmail', downstreamToolName: 'connection_status', serverTags: [], call: async () => ({ ok: true }) }],
        ['composio-toolkit-gmail__get_connect_link', { proxyToolName: 'composio-toolkit-gmail__get_connect_link', serverName: 'composio-toolkit-gmail', downstreamToolName: 'get_connect_link', serverTags: [], call: async () => ({ ok: true }) }],
        ['composio-toolkit-gmail__toolkit_info', { proxyToolName: 'composio-toolkit-gmail__toolkit_info', serverName: 'composio-toolkit-gmail', downstreamToolName: 'toolkit_info', serverTags: [], call: async () => ({ ok: true }) }],
        ['composio-toolkit-gmail__gmail_send_email', { proxyToolName: 'composio-toolkit-gmail__gmail_send_email', serverName: 'composio-toolkit-gmail', downstreamToolName: 'gmail_send_email', serverTags: [], call: async () => ({ ok: true }) }],
        ['composio-toolkit-notion__connection_status', { proxyToolName: 'composio-toolkit-notion__connection_status', serverName: 'composio-toolkit-notion', downstreamToolName: 'connection_status', serverTags: [], call: async () => ({ ok: true }) }],
        ['composio-toolkit-notion__get_connect_link', { proxyToolName: 'composio-toolkit-notion__get_connect_link', serverName: 'composio-toolkit-notion', downstreamToolName: 'get_connect_link', serverTags: [], call: async () => ({ ok: true }) }],
        ['composio-toolkit-notion__toolkit_info', { proxyToolName: 'composio-toolkit-notion__toolkit_info', serverName: 'composio-toolkit-notion', downstreamToolName: 'toolkit_info', serverTags: [], call: async () => ({ ok: true }) }],
        ['composio-toolkit-notion__notion_query_database', { proxyToolName: 'composio-toolkit-notion__notion_query_database', serverName: 'composio-toolkit-notion', downstreamToolName: 'notion_query_database', serverTags: [], call: async () => ({ ok: true }) }],
      ]),
      warnings: [],
    },
  };

  const accountContext = {
    accountId: 'acct_1',
    tenantId: null,
    userId: null,
    sessionId: 'session_1',
    allowedToolPrefixes: null,
    identitySource: 'session' as const,
  };

  const bootstrapVisible = buildVisibleProxyRoutes(runtime as any, {
    mode: 'compact',
    activeServers: ['composio-toolkit-gmail', 'composio-toolkit-notion'],
    maxProxyTools: 64,
    toolExposureMode: 'service_first',
    expandedServers: [],
  }, accountContext);

  assert.deepEqual(
    bootstrapVisible.toolDefinitions.map((tool) => tool.name),
    [
      'composio-toolkit-gmail__connection_status',
      'composio-toolkit-gmail__get_connect_link',
      'composio-toolkit-gmail__toolkit_info',
      'composio-toolkit-notion__connection_status',
      'composio-toolkit-notion__get_connect_link',
      'composio-toolkit-notion__toolkit_info',
    ],
  );

  const expandedVisible = buildVisibleProxyRoutes(runtime as any, {
    mode: 'compact',
    activeServers: ['composio-toolkit-gmail', 'composio-toolkit-notion'],
    maxProxyTools: 64,
    toolExposureMode: 'service_first',
    expandedServers: ['composio-toolkit-gmail'],
  }, accountContext);

  assert.ok(expandedVisible.toolDefinitions.some((tool) => tool.name === 'composio-toolkit-gmail__gmail_send_email'));
  assert.equal(
    expandedVisible.toolDefinitions.some((tool) => tool.name === 'composio-toolkit-notion__notion_query_database'),
    false,
  );
});

test('buildVisibleProxyRoutes lets expanded service-first servers exceed the default cap', () => {
  const gmailRoutes = Array.from({ length: 40 }, (_, index) => {
    const suffix = index === 0 ? 'connection_status' : index === 1 ? 'get_connect_link' : index === 2 ? 'toolkit_info' : `gmail_tool_${index}`;
    const proxyToolName = `composio-toolkit-gmail__${suffix}`;
    return {
      proxyToolName,
      serverName: 'composio-toolkit-gmail',
      downstreamToolName: suffix,
      serverTags: [],
      call: async () => ({ ok: true }),
    };
  });
  const notionRoutes = [
    {
      proxyToolName: 'composio-toolkit-notion__connection_status',
      serverName: 'composio-toolkit-notion',
      downstreamToolName: 'connection_status',
      serverTags: [],
      call: async () => ({ ok: true }),
    },
    {
      proxyToolName: 'composio-toolkit-notion__get_connect_link',
      serverName: 'composio-toolkit-notion',
      downstreamToolName: 'get_connect_link',
      serverTags: [],
      call: async () => ({ ok: true }),
    },
    {
      proxyToolName: 'composio-toolkit-notion__toolkit_info',
      serverName: 'composio-toolkit-notion',
      downstreamToolName: 'toolkit_info',
      serverTags: [],
      call: async () => ({ ok: true }),
    },
  ];

  const runtime = {
    builtAt: 0,
    stateResolution: {
      state: { enabledBundles: [], enabledServers: [], disabledServers: [] },
      enabledServerNames: ['composio-toolkit-gmail', 'composio-toolkit-notion'],
      warnings: [],
    },
    connected: [],
    failed: [],
    proxies: {
      toolDefinitions: [...gmailRoutes, ...notionRoutes].map((route) => ({
        name: route.proxyToolName,
        description: `[${route.serverName}] ${route.downstreamToolName}`,
        inputSchema: { type: 'object', properties: {} },
      })),
      routes: new Map([...gmailRoutes, ...notionRoutes].map((route) => [route.proxyToolName, route])),
      warnings: [],
    },
  };

  const visible = buildVisibleProxyRoutes(runtime as any, {
    mode: 'compact',
    activeServers: ['composio-toolkit-gmail', 'composio-toolkit-notion'],
    maxProxyTools: 8,
    toolExposureMode: 'service_first',
    expandedServers: ['composio-toolkit-gmail'],
  }, {
    accountId: 'acct_1',
    tenantId: null,
    userId: null,
    sessionId: 'session_1',
    allowedToolPrefixes: null,
    identitySource: 'session' as const,
  });

  assert.equal(visible.toolDefinitions.length, gmailRoutes.length);
  assert.ok(visible.toolDefinitions.some((tool) => tool.name === 'composio-toolkit-gmail__gmail_tool_39'));
});

test('buildVisibleProxyRoutes in full mode keeps all session-allowed routes', () => {
  const runtime = createRuntime();
  const prefs = {
    mode: 'full' as const,
    activeServers: [],
    maxProxyTools: null,
    toolExposureMode: 'all' as const,
    expandedServers: [],
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

test('buildVisibleProxyRoutes applies tenant routing allowlists from tenant id', () => {
  const runtime = {
    builtAt: 0,
    stateResolution: {
      state: { enabledBundles: [], enabledServers: [], disabledServers: [] },
      enabledServerNames: ['notion-halfdozen-blondish', 'composio-toolkit-gmail', 'server_b'],
      warnings: [],
    },
    connected: [],
    failed: [],
    proxies: {
      toolDefinitions: [
        {
          name: 'notion-halfdozen-blondish__query_database',
          description: '[notion-halfdozen-blondish] query database',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'composio-toolkit-gmail__gmail_list_messages',
          description: '[composio-toolkit-gmail] list messages',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'server_b__gamma',
          description: '[server_b] gamma',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
      routes: new Map([
        ['notion-halfdozen-blondish__query_database', {
          proxyToolName: 'notion-halfdozen-blondish__query_database',
          serverName: 'notion-halfdozen-blondish',
          downstreamToolName: 'query_database',
          serverTags: ['halfdozen', 'notion', 'blondish', 'workway'],
          call: async () => ({ ok: true }),
        }],
        ['composio-toolkit-gmail__gmail_list_messages', {
          proxyToolName: 'composio-toolkit-gmail__gmail_list_messages',
          serverName: 'composio-toolkit-gmail',
          downstreamToolName: 'gmail_list_messages',
          serverTags: ['composio', 'composio-email', 'toolkit'],
          call: async () => ({ ok: true }),
        }],
        ['server_b__gamma', {
          proxyToolName: 'server_b__gamma',
          serverName: 'server_b',
          downstreamToolName: 'gamma',
          serverTags: [],
          call: async () => ({ ok: true }),
        }],
      ]),
      warnings: [],
    },
  };

  const visible = buildVisibleProxyRoutes(runtime as any, {
    mode: 'full',
    activeServers: [],
    maxProxyTools: null,
    toolExposureMode: 'all',
    expandedServers: [],
  }, {
    accountId: 'acct_1',
    tenantId: 'blondish',
    userId: null,
    sessionId: 'session_1',
    allowedToolPrefixes: null,
    identitySource: 'session' as const,
  });

  assert.deepEqual(
    visible.toolDefinitions.map((tool) => tool.name),
    [
      'notion-halfdozen-blondish__query_database',
      'composio-toolkit-gmail__gmail_list_messages',
    ],
  );
});

test('buildVisibleProxyRoutes applies tenant routing allow-tags filter', () => {
  const runtime = {
    builtAt: 0,
    stateResolution: {
      state: { enabledBundles: [], enabledServers: [], disabledServers: [] },
      enabledServerNames: ['composio-toolkit-gmail'],
      warnings: [],
    },
    connected: [],
    failed: [],
    proxies: {
      toolDefinitions: [
        {
          name: 'composio-toolkit-gmail__gmail_list_messages',
          description: '[composio-toolkit-gmail] list messages',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'composio-toolkit-gmail__gmail_list_drafts',
          description: '[composio-toolkit-gmail] list drafts',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
      routes: new Map([
        ['composio-toolkit-gmail__gmail_list_messages', {
          proxyToolName: 'composio-toolkit-gmail__gmail_list_messages',
          serverName: 'composio-toolkit-gmail',
          downstreamToolName: 'gmail_list_messages',
          serverTags: ['composio', 'composio-email', 'toolkit'],
          call: async () => ({ ok: true }),
        }],
        ['composio-toolkit-gmail__gmail_list_drafts', {
          proxyToolName: 'composio-toolkit-gmail__gmail_list_drafts',
          serverName: 'composio-toolkit-gmail',
          downstreamToolName: 'gmail_list_drafts',
          serverTags: ['composio', 'unapproved-tag', 'toolkit'],
          call: async () => ({ ok: true }),
        }],
      ]),
      warnings: [],
    },
  };

  const visible = buildVisibleProxyRoutes(runtime as any, {
    mode: 'full',
    activeServers: [],
    maxProxyTools: null,
    toolExposureMode: 'all',
    expandedServers: [],
  }, {
    accountId: 'acct_1',
    tenantId: 'blondish',
    userId: null,
    sessionId: 'session_1',
    allowedToolPrefixes: null,
    identitySource: 'session' as const,
  });

  assert.deepEqual(
    visible.toolDefinitions.map((tool) => tool.name),
    ['composio-toolkit-gmail__gmail_list_messages'],
  );
});

test('buildVisibleProxyRoutes applies tenant routing allow-access-types filter', () => {
  const runtime = {
    builtAt: 0,
    stateResolution: {
      state: { enabledBundles: [], enabledServers: [], disabledServers: [] },
      enabledServerNames: ['composio-toolkit-gmail'],
      warnings: [],
    },
    connected: [],
    failed: [],
    proxies: {
      toolDefinitions: [
        {
          name: 'composio-toolkit-gmail__gmail_list_messages',
          description: '[composio-toolkit-gmail] list messages',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'composio-toolkit-gmail__gmail_send_email',
          description: '[composio-toolkit-gmail] send email',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'composio-toolkit-gmail__get_connect_link',
          description: '[composio-toolkit-gmail] get connect link',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
      routes: new Map([
        ['composio-toolkit-gmail__gmail_list_messages', {
          proxyToolName: 'composio-toolkit-gmail__gmail_list_messages',
          serverName: 'composio-toolkit-gmail',
          downstreamToolName: 'gmail_list_messages',
          serverTags: ['composio', 'composio-email', 'toolkit'],
          call: async () => ({ ok: true }),
        }],
        ['composio-toolkit-gmail__gmail_send_email', {
          proxyToolName: 'composio-toolkit-gmail__gmail_send_email',
          serverName: 'composio-toolkit-gmail',
          downstreamToolName: 'gmail_send_email',
          serverTags: ['composio', 'composio-email', 'toolkit'],
          call: async () => ({ ok: true }),
        }],
        ['composio-toolkit-gmail__get_connect_link', {
          proxyToolName: 'composio-toolkit-gmail__get_connect_link',
          serverName: 'composio-toolkit-gmail',
          downstreamToolName: 'get_connect_link',
          serverTags: ['composio', 'composio-email', 'toolkit'],
          call: async () => ({ ok: true }),
        }],
      ]),
      warnings: [],
    },
  };

  const visible = buildVisibleProxyRoutes(runtime as any, {
    mode: 'full',
    activeServers: [],
    maxProxyTools: null,
    toolExposureMode: 'all',
    expandedServers: [],
  }, {
    accountId: 'acct_1',
    tenantId: 'blondish',
    userId: null,
    sessionId: 'session_1',
    allowedToolPrefixes: null,
    identitySource: 'session' as const,
  });

  assert.deepEqual(
    visible.toolDefinitions.map((tool) => tool.name),
    [
      'composio-toolkit-gmail__gmail_list_messages',
      'composio-toolkit-gmail__get_connect_link',
    ],
  );
});

test('buildVisibleProxyRoutes applies tenant routing allowlists from HUB_TENANT_ID override', () => {
  const runtime = createRuntime();

  const visible = buildVisibleProxyRoutes(runtime as any, {
    mode: 'full',
    activeServers: [],
    maxProxyTools: null,
    toolExposureMode: 'all',
    expandedServers: [],
  }, {
    accountId: 'acct_1',
    tenantId: null,
    userId: null,
    sessionId: 'session_1',
    allowedToolPrefixes: null,
    identitySource: 'session' as const,
  }, {
    HUB_TENANT_ID: 'blondish',
  } as any);

  assert.equal(visible.toolDefinitions.length, 0);
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
      toolExposureMode: 'all',
      expandedServers: [],
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
      toolExposureMode: 'all',
      expandedServers: [],
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
    toolExposureMode: 'all' as const,
    expandedServers: [],
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
  assert.equal(shared.preferences.toolExposureMode, 'all');
  assert.deepEqual(shared.preferences.expandedServers, []);
  assert.deepEqual(shared.preferences.activeServers, []);
});

test('resolveDiscoveryPack keeps service-first Outerfields defaults', () => {
  const runtime = createRuntime();
  const outerfields = resolveDiscoveryPack('outerfields-shared-auth-clickup', runtime as any);

  assert.ok(outerfields);
  assert.equal(outerfields.id, 'outerfields-shared-auth-clickup');
  assert.equal(outerfields.preferences.mode, 'compact');
  assert.equal(outerfields.preferences.maxProxyTools, 64);
  assert.equal(outerfields.preferences.toolExposureMode, 'service_first');
  assert.deepEqual(outerfields.preferences.expandedServers, []);
  assert.deepEqual(outerfields.preferences.activeServers, []);
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
    toolExposureMode: 'all',
    expandedServers: [],
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
    toolExposureMode: 'all',
    expandedServers: [],
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
    toolExposureMode: 'all',
    expandedServers: [],
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

test('resolveIntentRouteCandidate prefers routed alias plans when present', () => {
  const route = {
    proxyToolName: 'composio-toolkit-gmail__gmail_send_email',
    serverName: 'composio-toolkit-gmail',
    downstreamToolName: 'gmail_send_email',
    serverTags: ['composio', 'composio-email', 'toolkit'],
    call: async () => ({ ok: true }),
  };
  const definition = {
    name: route.proxyToolName,
    description: '[composio-toolkit-gmail] send email',
    inputSchema: { type: 'object', properties: {} },
  };

  const candidate = resolveIntentRouteCandidate({
    toolDefinitions: [definition],
    routes: new Map([[route.proxyToolName, route]]),
    definitionByName: new Map([[definition.name, definition]]),
    aliasPlans: [{
      aliasToolName: 'gmail_send',
      description: 'Send email with provider fallback',
      inputSchema: { type: 'object', properties: {} },
      primaryProxyToolName: route.proxyToolName,
      candidates: [{
        proxyToolName: route.proxyToolName,
        serverName: route.serverName,
        downstreamToolName: route.downstreamToolName,
        description: definition.description,
        provider: 'composio',
        oauthApproval: 'approved',
      }],
      skippedCandidates: [{
        serverName: 'arcade-gmail',
        downstreamToolName: 'send_message',
        provider: 'arcade',
        oauthApproval: 'pending',
        reason: 'oauth_pending',
      }],
    }],
  } as any, {
    intent: 'send gmail email',
  });

  assert.equal(candidate.source, 'alias');
  assert.equal(candidate.logicalAliasToolName, 'gmail_send');
  assert.equal(candidate.proxyToolName, 'composio-toolkit-gmail__gmail_send_email');
  assert.equal(candidate.alternatives[0]?.provider, 'composio');
  assert.equal(candidate.skippedCandidates?.[0]?.reason, 'oauth_pending');
});

test('resolveIntentRouteCandidate de-prioritizes deprecated discovery tools', () => {
  const runtime = createIntentRuntime();
  const visible = buildVisibleProxyRoutes(runtime as any, {
    mode: 'compact',
    activeServers: ['composio-toolkit-googlesheets', 'composio-toolkit-zoom'],
    maxProxyTools: null,
    toolExposureMode: 'all',
    expandedServers: [],
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
