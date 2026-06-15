import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  bridgeUrl,
  healthAttentionSnapshot,
  mcpAttentionAlert,
  operatorPriorityBrief,
  synthesizeOperatorPriority
} from '../src/producers.js';

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

test('builds operator priority brief payloads for synthesized surface state', () => {
  const priority = operatorPriorityBrief({
    focus: 'Webflow MCP launch',
    risk: 'Marketplace copy incomplete',
    nextAction: 'Review Airtable fields',
    sourceLinks: [
      {
        kind: 'linear',
        label: 'CRE-611',
        url: 'https://linear.app/createsomething/issue/CRE-611'
      }
    ],
    sources: {
      codex: { branch: 'emdash/m5-core-ink-mbz75' },
      health: { state: 'health_attention' }
    }
  });

  assert.equal(priority.focus, 'Webflow MCP launch');
  assert.equal(priority.risk, 'Marketplace copy incomplete');
  assert.equal(priority.next_action, 'Review Airtable fields');
  assert.equal(priority.severity, 92);
  assert.equal(priority.urgent, false);
  assert.deepEqual(priority.source_links, [
    {
      kind: 'linear',
      label: 'CRE-611',
      url: 'https://linear.app/createsomething/issue/CRE-611'
    }
  ]);
  assert.deepEqual(priority.payload, {
    kind: 'operator_priority',
    sources: {
      codex: { branch: 'emdash/m5-core-ink-mbz75' },
      health: { state: 'health_attention' }
    }
  });
});

test('synthesizes operator priority from health and work-source state', () => {
  const priority = synthesizeOperatorPriority({
    linear: {
      issues: [
        {
          identifier: 'CRE-611',
          title: 'Add Core Ink operator priority brief producer',
          url: 'https://linear.app/createsomething/issue/CRE-611'
        }
      ]
    },
    codex: {
      branch: 'emdash/m5-core-ink-mbz75',
      dirty: true
    },
    health: {
      state: 'health_attention',
      summary: '2 poor, 5 stale health checks',
      action: 'Review agent/MCP health source',
      items: [
        {
          component: 'Composio Toolkit MCP',
          status: 'failed',
          summary: 'Health endpoint returned 404',
          severity: 80,
          poor: true
        }
      ]
    }
  });

  assert.equal(priority.focus, 'Composio Toolkit MCP');
  assert.equal(priority.risk, '2 poor, 5 stale health checks');
  assert.equal(priority.next_action, 'Review agent/MCP health source');
  assert.equal(priority.severity, 88);
  assert.deepEqual(priority.source_links, [
    {
      kind: 'linear',
      label: 'CRE-611',
      url: 'https://linear.app/createsomething/issue/CRE-611'
    },
    {
      kind: 'codex',
      label: 'emdash/m5-core-ink-mbz75'
    },
    {
      kind: 'health',
      label: 'health_attention'
    }
  ]);
});
