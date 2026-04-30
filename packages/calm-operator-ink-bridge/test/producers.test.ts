import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bridgeUrl, healthAttentionSnapshot, mcpAttentionAlert, operatorDecision } from '../src/producers.js';

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

test('builds constrained operator decision payloads for remote agents', () => {
  const decision = operatorDecision({
    source: 'mcp-review-agent',
    subject: 'MCP review requires attention',
    summary: 'Composio Toolkit MCP failed health review',
    action: 'Review Composio auth configuration',
    urgency: 'attention',
    decisionRequired: true,
    artifact: 'reports/mcp-review.md',
    confidence: 0.92
  });

  assert.equal(decision.source, 'mcp-review-agent');
  assert.equal(decision.subject, 'MCP review requires attention');
  assert.equal(decision.urgency, 'attention');
  assert.equal(decision.decision_required, true);
  assert.equal(decision.can_step_away, false);
  assert.equal(decision.artifact, 'reports/mcp-review.md');
});
