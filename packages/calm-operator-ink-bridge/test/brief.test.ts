import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildOperatorBrief, toFirmwareBrief } from '../src/brief.js';
import type { StoredAlert, StoredHealthSnapshot } from '../src/types.js';

function alert(overrides: Partial<StoredAlert>): StoredAlert {
  return {
    id: 'alert-1',
    state: 'operator_attention',
    category: 'operator',
    severity: 50,
    subject: 'Operator attention',
    reason: '',
    detail: '',
    action: 'Review source',
    source: 'test',
    external_id: '',
    urgent: false,
    status: 'active',
    created_at: 1,
    updated_at: 1,
    expires_at: null,
    payload: {},
    ...overrides
  };
}

function health(overrides: Partial<StoredHealthSnapshot>): StoredHealthSnapshot {
  return {
    id: 'health-1',
    source: 'mcp-review',
    component: 'MCP review agent',
    status: 'ok',
    summary: 'ok',
    detail: '',
    severity: 0,
    observed_at: 1,
    updated_at: 1,
    payload: {},
    ...overrides
  };
}

test('returns clear live-only state when no attention is needed', () => {
  const brief = buildOperatorBrief({
    alerts: [],
    health: [],
    now: Date.parse('2026-04-30T14:05:00Z')
  });

  assert.equal(brief.state, 'clear');
  assert.equal(brief.headline, 'CALM OPERATOR');
  assert.equal(brief.detail, 'Live alerts only.');
  assert.deepEqual(brief.clock, {
    timezone: 'America/Chicago',
    generated_at: '2026-04-30T14:05:00.000Z',
    local_date: '2026-04-30',
    local_time: '09:05',
    display_time: '9:05 AM',
    hour: 9,
    minute: 5
  });

  const firmwareBrief = toFirmwareBrief(brief);
  assert.deepEqual(firmwareBrief.clock, brief.clock);
});

test('prioritizes MCP attention alerts for the Core Ink brief', () => {
  const brief = buildOperatorBrief({
    alerts: [
      alert({ state: 'operator_attention', subject: 'Routine note', severity: 40 }),
      alert({
        id: 'mcp-1',
        state: 'mcp_attention',
        subject: 'HubSpot MCP',
        reason: 'MCP review failed and requires operator attention.',
        action: 'Review mcp_contract.yaml',
        severity: 90,
        urgent: true
      })
    ],
    health: [],
    now: 1000
  });

  assert.equal(brief.state, 'mcp_attention');
  assert.equal(brief.headline, 'MCP ATTENTION');
  assert.equal(brief.line1, 'HubSpot MCP');
  assert.equal(brief.action, 'Review mcp_contract.yaml');
  assert.equal(brief.urgent, true);
});

test('surfaces poor health when no active alerts exist', () => {
  const brief = buildOperatorBrief({
    alerts: [],
    health: [
      health({
        status: 'degraded',
        component: 'Claude Code Slack watcher',
        summary: 'Slack watcher has not reported in 20 minutes.',
        severity: 75
      })
    ],
    now: 1000
  });

  assert.equal(brief.state, 'health_attention');
  assert.equal(brief.headline, 'HEALTH ATTENTION');
  assert.equal(brief.line1, 'Claude Code Slack watcher');
  assert.equal(brief.urgent, false);
});

test('surfaces daily alarm alerts as alarms', () => {
  const brief = buildOperatorBrief({
    alerts: [
      alert({
        id: 'alarm-1',
        state: 'daily_alarm',
        category: 'alarm',
        subject: '6:00 AM CT alarm',
        reason: 'Daily calm operator alarm',
        severity: 95,
        urgent: true
      })
    ],
    health: [],
    now: 1000
  });

  assert.equal(brief.state, 'daily_alarm');
  assert.equal(brief.headline, 'ALARM');
  assert.equal(brief.line1, '6:00 AM CT alarm');
  assert.equal(brief.urgent, true);
});

test('ignores expired or cleared alerts', () => {
  const brief = buildOperatorBrief({
    alerts: [
      alert({ id: 'cleared', state: 'blocked', status: 'cleared', severity: 100 }),
      alert({ id: 'expired', state: 'blocked', expires_at: 900, severity: 100 })
    ],
    health: [],
    now: 1000
  });

  assert.equal(brief.state, 'clear');
});
