import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  collectRemoteHealthChecks,
  configuredRemoteHealthChecks,
  runRemoteHealthCheck
} from '../src/remote-health-checks.js';

test('includes the bridge self check when explicitly enabled', () => {
  const checks = configuredRemoteHealthChecks({
    HEALTH_SELF_CHECK_ENABLED: 'true',
    HEALTH_SELF_ORIGIN: 'https://ink.example.test',
    HEALTH_CHECKS_JSON: '[]'
  });

  assert.equal(checks.length, 1);
  assert.equal(checks[0]?.component, 'Calm Operator Ink Bridge');
  assert.equal(checks[0]?.url, 'https://ink.example.test/healthz');
});

test('does not include the bridge self check unless explicitly enabled', () => {
  const checks = configuredRemoteHealthChecks({
    HEALTH_SELF_ORIGIN: 'https://ink.example.test',
    HEALTH_CHECKS_JSON: '[]'
  });

  assert.equal(checks.length, 0);
});

test('parses configured checks without exposing token values', () => {
  const checks = configuredRemoteHealthChecks({
    HEALTH_SELF_CHECK_ENABLED: 'false',
    HEALTH_CHECKS_JSON: JSON.stringify({
      checks: [
        {
          id: 'mcp.hub',
          component: 'Hub MCP',
          url: 'https://hub.example.test/healthz',
          type: 'mcp',
          registry_id: 'mcp.hub',
          token_env: 'HUB_TOKEN'
        }
      ]
    })
  });

  assert.equal(checks.length, 1);
  assert.equal(checks[0]?.source, 'remote-health-check');
  assert.equal(checks[0]?.token_env, 'HUB_TOKEN');
});

test('builds a healthy snapshot from a successful HTTP check', async () => {
  const result = await runRemoteHealthCheck(
    {
      component: 'Hub MCP',
      url: 'https://hub.example.test/healthz',
      expected_status: 200,
      expected_text: 'ok',
      registry_id: 'mcp.hub'
    },
    {},
    async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    1000
  );

  assert.equal(result.ok, true);
  assert.equal(result.snapshot.status, 'healthy');
  assert.equal(result.snapshot.severity, 0);
  assert.equal(result.snapshot.payload?.registry_id, 'mcp.hub');
});

test('builds a failed snapshot from an unexpected HTTP check', async () => {
  const result = await runRemoteHealthCheck(
    {
      component: 'Hub MCP',
      url: 'https://hub.example.test/healthz?secret=hidden',
      expected_status: 200,
      severity: 90
    },
    {},
    async () => new Response('down', { status: 503 }),
    1000
  );

  assert.equal(result.ok, false);
  assert.equal(result.snapshot.status, 'failed');
  assert.equal(result.snapshot.severity, 90);
  assert.equal(result.snapshot.payload?.url, 'https://hub.example.test/healthz');
});

test('fails semantic JSON rules for unhealthy MCP health payloads', async () => {
  const result = await runRemoteHealthCheck(
    {
      component: 'CREATE SOMETHING Hub MCP',
      url: 'https://hub.example.test/health',
      expected_status: 200,
      json_rules: [
        { path: 'failed_servers.length', max: 0 },
        { path: 'connected_servers.length', min: 2 }
      ]
    },
    {},
    async () => new Response(JSON.stringify({
      connected_servers: [{ name: 'gmail' }],
      failed_servers: [{ name: 'playbook' }]
    }), { status: 200 }),
    1000
  );

  assert.equal(result.ok, false);
  assert.equal(result.snapshot.status, 'failed');
  assert.match(result.snapshot.detail ?? '', /failed_servers\.length/);
  assert.match(result.snapshot.detail ?? '', /connected_servers\.length/);
});

test('passes semantic JSON rules for healthy MCP health payloads', async () => {
  const result = await runRemoteHealthCheck(
    {
      component: 'CREATE SOMETHING Hub MCP',
      url: 'https://hub.example.test/health',
      expected_status: 200,
      json_rules: [
        { path: 'failed_servers.length', max: 0 },
        { path: 'connected_servers.length', min: 2 }
      ]
    },
    {},
    async () => new Response(JSON.stringify({
      connected_servers: [{ name: 'gmail' }, { name: 'notion' }],
      failed_servers: []
    }), { status: 200 }),
    1000
  );

  assert.equal(result.ok, true);
  assert.equal(result.snapshot.status, 'healthy');
});

test('collects configured checks with authorization from token env', async () => {
  const seenHeaders = [];
  const results = await collectRemoteHealthChecks(
    {
      HEALTH_SELF_CHECK_ENABLED: 'false',
      HEALTH_CHECKS_JSON: JSON.stringify([
        {
          component: 'Protected Agent',
          url: 'https://agent.example.test/healthz',
          token_env: 'AGENT_TOKEN'
        }
      ]),
      AGENT_TOKEN: 'secret-token'
    },
    async (_url, init) => {
      seenHeaders.push(new Headers(init?.headers).get('authorization'));
      return new Response('ok', { status: 200 });
    }
  );

  assert.equal(results.length, 1);
  assert.equal(results[0]?.snapshot.status, 'healthy');
  assert.deepEqual(seenHeaders, ['Bearer secret-token']);
});
