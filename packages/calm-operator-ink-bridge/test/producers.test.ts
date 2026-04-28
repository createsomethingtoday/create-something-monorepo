import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bridgeUrl, healthAttentionSnapshot, mcpAttentionAlert } from '../src/producers.js';

test('builds production bridge URLs predictably', () => {
  assert.equal(bridgeUrl('https://ink.createsomething.agency/', '/ink/alert'), 'https://ink.createsomething.agency/ink/alert');
});

test('builds MCP attention alert payloads for producer integrations', () => {
  const alert = mcpAttentionAlert({
    mcp: 'HubSpot MCP',
    reason: 'Tool scope changed from read-only to write-enabled',
    registryId: 'hubspot',
    ttlMs: 120000
  });

  assert.equal(alert.state, 'mcp_attention');
  assert.equal(alert.subject, 'HubSpot MCP');
  assert.equal(alert.external_id, 'hubspot');
  assert.equal(alert.ttl_ms, 120000);
});

test('builds health snapshot payloads for agent and MCP monitors', () => {
  const snapshot = healthAttentionSnapshot({
    source: 'fleet-health',
    component: 'Claude Code Slack watcher',
    status: 'degraded',
    summary: 'No heartbeat in 20 minutes'
  });

  assert.equal(snapshot.source, 'fleet-health');
  assert.equal(snapshot.component, 'Claude Code Slack watcher');
  assert.equal(snapshot.status, 'degraded');
  assert.equal(snapshot.severity, 70);
});
