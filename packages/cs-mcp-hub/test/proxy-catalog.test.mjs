import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildProxyCatalog,
  buildProxyToolName,
  normalizeToolInputSchema,
  reserveProxyName,
  sanitizeName,
} from '../dist/proxy-catalog.js';

// --- Pure helper coverage -----------------------------------------------------

test('sanitizeName replaces non [a-zA-Z0-9_-] chars with _', () => {
  assert.equal(sanitizeName('halfdozen-gmail-sync'), 'halfdozen-gmail-sync');
  assert.equal(sanitizeName('foo.bar:baz/quux'), 'foo_bar_baz_quux');
  assert.equal(sanitizeName('weird name with spaces'), 'weird_name_with_spaces');
});

test('buildProxyToolName joins sanitized server and tool with __', () => {
  assert.equal(buildProxyToolName('foo-mcp', 'list_users'), 'foo-mcp__list_users');
  assert.equal(buildProxyToolName('a.b', 'c.d'), 'a_b__c_d');
});

test('normalizeToolInputSchema falls back to empty object schema for non-object input', () => {
  assert.deepEqual(normalizeToolInputSchema(undefined), { type: 'object', properties: {} });
  assert.deepEqual(normalizeToolInputSchema(null), { type: 'object', properties: {} });
  assert.deepEqual(normalizeToolInputSchema({ type: 'string' }), { type: 'object', properties: {} });
  // Pass-through when type === 'object'.
  const schema = { type: 'object', properties: { x: { type: 'number' } } };
  assert.deepEqual(normalizeToolInputSchema(schema), schema);
});

test('reserveProxyName picks the first free _N suffix and pushes a warning', () => {
  const routes = new Map();
  routes.set('foo__bar', {});
  routes.set('foo__bar_2', {});
  const warnings = [];

  const reserved = reserveProxyName('foo__bar', routes, warnings);
  assert.equal(reserved, 'foo__bar_3');
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /collision for "foo__bar"/);
  assert.match(warnings[0], /renamed to "foo__bar_3"/);
});

test('reserveProxyName returns the base name unchanged when free', () => {
  const routes = new Map();
  const warnings = [];
  assert.equal(reserveProxyName('foo__bar', routes, warnings), 'foo__bar');
  assert.deepEqual(warnings, []);
});

// --- buildProxyCatalog wiring -------------------------------------------------

function makeFakeClient() {
  return {
    calls: [],
    callTool(args) {
      this.calls.push(args);
      return Promise.resolve({ ok: true, name: args.name });
    },
  };
}

function makeConnected(name, tools, registryTags = []) {
  const client = makeFakeClient();
  return {
    server: { name, config: { transport: 'http' }, client, tools },
    tags: registryTags,
  };
}

function makeRegistry(entries) {
  const servers = {};
  for (const entry of entries) {
    servers[entry.server.name] = { transport: 'http', url: 'https://x', tags: entry.tags };
  }
  return { version: 1, servers, bundles: {} };
}

function makeTenantContext(overrides = {}) {
  return {
    tenantId: 'default',
    allowPendingOauthApprovals: false,
    policy: {},
    ...overrides,
  };
}

test('buildProxyCatalog emits one direct route per downstream tool', async () => {
  const a = makeConnected('foo-mcp', [
    { name: 'tool_a', description: 'does a', inputSchema: { type: 'object' } },
    { name: 'tool_b', description: 'does b', inputSchema: { type: 'object' } },
  ]);

  const registry = makeRegistry([a]);
  const catalog = buildProxyCatalog(
    [a.server],
    registry,
    { version: 1 },
    makeTenantContext(),
  );

  assert.equal(catalog.toolDefinitions.length, 2);
  assert.equal(catalog.directRouteMetas.length, 2);
  assert.equal(catalog.aliasPlans.length, 0);

  const names = catalog.toolDefinitions.map((t) => t.name).sort();
  assert.deepEqual(names, ['foo-mcp__tool_a', 'foo-mcp__tool_b']);

  // Description is prefixed with the server name in brackets.
  for (const def of catalog.toolDefinitions) {
    assert.match(def.description, /^\[foo-mcp\]/);
  }

  // Calling a direct route forwards arguments to the downstream client.
  const route = catalog.routes.get('foo-mcp__tool_a');
  assert.ok(route);
  const result = await route.call({ foo: 'bar' });
  assert.deepEqual(result, { ok: true, name: 'tool_a' });
  assert.deepEqual(a.server.client.calls, [{ name: 'tool_a', arguments: { foo: 'bar' } }]);
});

test('buildProxyCatalog applies tenant denyServers policy', () => {
  const a = makeConnected('foo-mcp', [{ name: 't', description: '', inputSchema: { type: 'object' } }]);
  const b = makeConnected('bar-mcp', [{ name: 't', description: '', inputSchema: { type: 'object' } }]);
  const registry = makeRegistry([a, b]);

  const catalog = buildProxyCatalog(
    [a.server, b.server],
    registry,
    { version: 1 },
    makeTenantContext({ policy: { denyServers: ['bar-mcp'] } }),
  );

  const names = catalog.toolDefinitions.map((t) => t.name);
  assert.ok(names.includes('foo-mcp__t'));
  assert.ok(!names.includes('bar-mcp__t'));
});

test('buildProxyCatalog emits an alias route that fails over across candidates', async () => {
  // Two servers expose the same logical tool; primary throws so the alias must fall back.
  const primary = makeConnected('arcade-gmail', [
    { name: 'send', description: 'arcade send', inputSchema: { type: 'object' } },
  ]);
  primary.server.client.callTool = () => Promise.reject(new Error('arcade is down'));

  const fallback = makeConnected('composio-gmail', [
    { name: 'send', description: 'composio send', inputSchema: { type: 'object' } },
  ]);

  const registry = makeRegistry([primary, fallback]);
  const routing = {
    version: 1,
    aliases: {
      gmail_send: {
        description: 'Send mail with provider fallback',
        candidates: [
          { server: 'arcade-gmail', tool: 'send', provider: 'arcade', oauthApproval: 'approved' },
          { server: 'composio-gmail', tool: 'send', provider: 'composio', oauthApproval: 'approved' },
        ],
      },
    },
  };

  const catalog = buildProxyCatalog(
    [primary.server, fallback.server],
    registry,
    routing,
    makeTenantContext(),
  );

  assert.equal(catalog.aliasPlans.length, 1);
  const aliasRoute = catalog.routes.get('gmail_send');
  assert.ok(aliasRoute);
  assert.equal(aliasRoute.source, 'alias');

  const result = await aliasRoute.call({ to: 'x@y' });
  assert.deepEqual(result, { ok: true, name: 'send' });
  // Fallback was used.
  assert.equal(fallback.server.client.calls.length, 1);
});

test('buildProxyCatalog keeps aliases callable when their names collide with management tools', async () => {
  const provider = makeConnected('provider', [
    { name: 'status', description: 'provider status', inputSchema: { type: 'object' } },
  ]);
  const registry = makeRegistry([provider]);
  const routing = {
    version: 1,
    aliases: {
      hub_status: {
        candidates: [
          { server: 'provider', tool: 'status', oauthApproval: 'approved' },
        ],
      },
    },
  };

  const catalog = buildProxyCatalog(
    [provider.server],
    registry,
    routing,
    makeTenantContext(),
    ['hub_status'],
  );
  const listedToolNames = ['hub_status', ...catalog.toolDefinitions.map((tool) => tool.name)];

  assert.equal(new Set(listedToolNames).size, listedToolNames.length);
  assert.equal(catalog.routes.has('hub_status'), false);
  assert.equal(catalog.routes.get('hub_status_2')?.source, 'alias');
  assert.equal(catalog.aliasPlans[0]?.proxyToolName, 'hub_status_2');
  assert.ok(catalog.warnings.some((warning) => warning.includes('collision for "hub_status"')));
  assert.deepEqual(await catalog.routes.get('hub_status_2').call({}), { ok: true, name: 'status' });
});

test('buildProxyCatalog throws a descriptive error when all alias candidates fail', async () => {
  const a = makeConnected('arcade', [
    { name: 'send', description: '', inputSchema: { type: 'object' } },
  ]);
  a.server.client.callTool = () => Promise.reject(new Error('boom-a'));
  const b = makeConnected('composio', [
    { name: 'send', description: '', inputSchema: { type: 'object' } },
  ]);
  b.server.client.callTool = () => Promise.reject(new Error('boom-b'));

  const registry = makeRegistry([a, b]);
  const routing = {
    version: 1,
    aliases: {
      send_alias: {
        description: 'failover',
        candidates: [
          { server: 'arcade', tool: 'send', oauthApproval: 'approved' },
          { server: 'composio', tool: 'send', oauthApproval: 'approved' },
        ],
      },
    },
  };

  const catalog = buildProxyCatalog(
    [a.server, b.server],
    registry,
    routing,
    makeTenantContext(),
  );

  const aliasRoute = catalog.routes.get('send_alias');
  await assert.rejects(
    aliasRoute.call({}),
    /exhausted all candidates.*boom-a.*boom-b/s,
  );
});

test('buildProxyCatalog disambiguates name collisions across servers', () => {
  // Two servers exposing the same downstream tool name should not stomp each other.
  // Note: by default the proxy name is `<server>__<tool>` so a collision only
  // happens when the sanitized names match. Force a collision with a custom name.
  const a = makeConnected('foo', [{ name: 'bar', description: '', inputSchema: { type: 'object' } }]);
  const b = makeConnected('foo', [{ name: 'bar', description: '', inputSchema: { type: 'object' } }]);
  const registry = makeRegistry([a, b]);

  const catalog = buildProxyCatalog(
    [a.server, b.server],
    registry,
    { version: 1 },
    makeTenantContext(),
  );

  const names = catalog.toolDefinitions.map((t) => t.name).sort();
  assert.deepEqual(names, ['foo__bar', 'foo__bar_2']);
  assert.ok(catalog.warnings.some((w) => w.includes('collision for "foo__bar"')));
});
