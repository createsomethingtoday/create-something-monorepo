import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildConnectionsPayload,
  buildPolicyStatusPayload,
  buildRegistryPayload,
  buildRoutingPayload,
  searchProxyTools,
} from '../dist/payloads.js';

function makeRegistry() {
  return {
    version: 1,
    servers: {
      'b-mcp': {
        transport: 'http',
        url: 'https://b/mcp',
        description: 'B',
        tags: ['b'],
      },
      'a-mcp': {
        transport: 'http',
        url: 'https://a/mcp',
        description: 'A',
        tags: ['a'],
      },
      'local-thing': {
        transport: 'stdio',
        command: 'node',
        args: ['./local.js'],
        description: 'local',
      },
    },
    bundles: {
      ops: ['a-mcp', 'b-mcp'],
      local: ['local-thing'],
    },
    defaults: {},
  };
}

test('buildRegistryPayload sorts servers and bundles alphabetically', () => {
  const out = buildRegistryPayload(makeRegistry());
  assert.deepEqual(
    out.servers.map((s) => s.name),
    ['a-mcp', 'b-mcp', 'local-thing'],
  );
  assert.deepEqual(
    out.bundles.map((b) => b.name),
    ['local', 'ops'],
  );
  // Stdio target combines command + args.
  const localEntry = out.servers.find((s) => s.name === 'local-thing');
  assert.equal(localEntry.target, 'node ./local.js');
});

test('buildConnectionsPayload classifies servers as connected/failed/disabled/idle', () => {
  const registry = makeRegistry();
  const downstream = {
    connected: [
      { name: 'a-mcp', config: registry.servers['a-mcp'], client: {}, tools: [{ name: 't1' }, { name: 't2' }] },
    ],
    failed: [{ name: 'b-mcp', error: 'connect timeout' }],
  };
  const enabledServerNames = ['a-mcp', 'b-mcp']; // local-thing not enabled => idle

  const out = buildConnectionsPayload(registry, downstream, enabledServerNames);

  assert.equal(out.connected, 1);
  assert.equal(out.failed, 1);
  assert.equal(out.idle, 1);
  assert.equal(out.totalConfiguredServers, 3);

  const byName = Object.fromEntries(out.connections.map((c) => [c.name, c]));
  assert.equal(byName['a-mcp'].status, 'connected');
  assert.equal(byName['a-mcp'].toolCount, 2);
  assert.equal(byName['b-mcp'].status, 'failed');
  assert.equal(byName['b-mcp'].error, 'connect timeout');
  assert.equal(byName['local-thing'].status, 'idle');
});

test('buildPolicyStatusPayload reflects enabled vs disabled rate limit', () => {
  const disabled = buildPolicyStatusPayload({
    enabled: false,
    maxCalls: 0,
    windowMs: 60_000,
    windowSeconds: 60,
    scope: 'account',
    exemptServers: new Set(),
  });
  assert.equal(disabled.rateLimit.enabled, false);
  assert.match(disabled.note, /Rate limiting is disabled/);

  const enabled = buildPolicyStatusPayload({
    enabled: true,
    maxCalls: 10,
    windowMs: 60_000,
    windowSeconds: 60,
    scope: 'account_server',
    exemptServers: new Set(['foo']),
  });
  assert.equal(enabled.rateLimit.enabled, true);
  assert.equal(enabled.rateLimit.maxCallsPerWindow, 10);
  assert.deepEqual(enabled.rateLimit.exemptServers, ['foo']);
  assert.match(enabled.note, /Rate limiting applies only to proxied downstream tool calls/);
});

test('buildRoutingPayload echoes tenant policy and summarizes alias plans', () => {
  const proxies = {
    toolDefinitions: [{ name: 'gmail_send' }],
    directRouteMetas: [],
    aliasPlans: [
      {
        aliasToolName: 'gmail_send',
        description: 'failover',
        inputSchema: { type: 'object', properties: {} },
        candidates: [
          { serverName: 'arcade-gmail', downstreamToolName: 'send', provider: 'arcade', oauthApproval: 'approved', proxyToolName: 'arcade-gmail__send' },
        ],
        skippedCandidates: [],
      },
    ],
    routes: new Map(),
    warnings: [],
  };

  const tenant = {
    tenantId: 'acme',
    allowPendingOauthApprovals: false,
    policy: { allowTags: ['email'] },
  };

  const out = buildRoutingPayload(
    { version: 1, aliases: { gmail_send: { description: 'failover', candidates: [] } } },
    tenant,
    proxies,
  );

  assert.equal(out.tenant.tenantId, 'acme');
  assert.deepEqual(out.tenant.policy.allowTags, ['email']);
  assert.deepEqual(out.configuredAliases, ['gmail_send']);
  assert.equal(out.activeAliases.length, 1);
  assert.equal(out.activeAliases[0].candidateCount, 1);
  assert.equal(out.activeAliases[0].candidates[0].directProxyToolName, 'arcade-gmail__send');
});

// ----- searchProxyTools -------------------------------------------------------

function makeProxiesForSearch() {
  const tools = [
    { name: 'foo__a', description: '[foo] alpha' },
    { name: 'foo__b', description: '[foo] beta' },
    { name: 'bar__a', description: '[bar] alpha' },
    { name: 'bar__c', description: '[bar] charlie' },
  ];
  const routes = new Map();
  for (const t of tools) {
    const [serverName, downstreamToolName] = t.name.split('__');
    routes.set(t.name, {
      proxyToolName: t.name,
      serverName,
      downstreamToolName,
      source: 'direct',
      call: async () => ({}),
    });
  }
  return {
    toolDefinitions: tools,
    directRouteMetas: tools.map((t) => ({
      proxyToolName: t.name,
      serverName: t.name.split('__')[0],
      downstreamToolName: t.name.split('__')[1],
      description: t.description,
      inputSchema: { type: 'object', properties: {} },
    })),
    aliasPlans: [],
    routes,
    warnings: [],
  };
}

test('searchProxyTools filters by query against name, server, and description', () => {
  const proxies = makeProxiesForSearch();
  const out = searchProxyTools(proxies, { query: 'alpha' });
  assert.equal(out.total, 2);
  assert.deepEqual(out.tools.map((t) => t.proxyToolName).sort(), ['bar__a', 'foo__a']);
});

test('searchProxyTools filters by serverName', () => {
  const proxies = makeProxiesForSearch();
  const out = searchProxyTools(proxies, { serverName: 'bar' });
  assert.equal(out.total, 2);
  for (const t of out.tools) assert.equal(t.serverName, 'bar');
});

test('searchProxyTools paginates via cursor', () => {
  const proxies = makeProxiesForSearch();
  const page1 = searchProxyTools(proxies, { limit: 2 });
  assert.equal(page1.tools.length, 2);
  assert.equal(page1.nextCursor, '2');

  const page2 = searchProxyTools(proxies, { limit: 2, cursor: page1.nextCursor });
  assert.equal(page2.tools.length, 2);
  assert.equal(page2.nextCursor, null);

  // Pages do not overlap.
  const namesPage1 = page1.tools.map((t) => t.proxyToolName);
  const namesPage2 = page2.tools.map((t) => t.proxyToolName);
  assert.equal(namesPage1.some((n) => namesPage2.includes(n)), false);
});

test('searchProxyTools clamps limit and returns total correctly', () => {
  const proxies = makeProxiesForSearch();
  const out = searchProxyTools(proxies, { limit: 999 });
  assert.equal(out.limit, 100); // capped at 100
  assert.equal(out.total, 4);
  assert.equal(out.tools.length, 4);
});
