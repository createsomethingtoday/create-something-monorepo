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
  const brief = buildOperatorBrief({ alerts: [], health: [], now: 1000 });
  const firmware = toFirmwareBrief(brief);

  assert.equal(brief.state, 'clear');
  assert.equal(brief.headline, 'CALM OPERATOR');
  assert.equal(brief.detail, 'Live alerts only.');
  assert.deepEqual(firmware.operator_contract, {
    decision_required: false,
    can_step_away: true,
    state: 'clear',
    reason: 'pending',
    action: 'You can step away.',
    urgent: false
  });
  assert.deepEqual(firmware.clock, {
    timezone: 'America/Chicago',
    iso: '1970-01-01T00:00:01.000Z',
    local_date: '1969-12-31',
    local_time_24: '18:00',
    display_time: '6:00 PM',
    display_date: 'Wed Dec 31',
    day_period: 'evening'
  });
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
  const contract = toFirmwareBrief(brief).operator_contract as Record<string, unknown>;
  assert.deepEqual(contract, {
    decision_required: true,
    can_step_away: false,
    state: 'mcp_attention',
    reason: 'MCP review failed and requires operator atten…',
    action: 'Review mcp_contract.yaml',
    urgent: true
  });
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

test('keeps T-Embed as an Ink console surface with longer copy', () => {
  const detail =
    'The MCP review agent found a failing production toolkit. Review the remote health report, inspect the registry entry, and decide whether to block writes or rotate credentials.';
  const brief = buildOperatorBrief({
    surface: 'lilygo-t-embed',
    alerts: [
      alert({
        state: 'mcp_attention',
        subject: 'Composio Toolkit MCP',
        reason: 'Remote health failed for toolkit bridge',
        detail,
        action: 'Open the MCP registry report and review Composio auth configuration.',
        severity: 90,
        urgent: true
      })
    ],
    health: [],
    now: 1000
  });
  const firmware = toFirmwareBrief(brief);

  assert.equal(brief.surface, 't-embed');
  assert.equal(brief.detail, detail);
  assert.deepEqual(firmware.surface_profile, {
    id: 't-embed',
    role: 'operator_console',
    display: 'lcd',
    refresh: 'fast',
    supports_lists: true,
    supports_detail_drilldown: true
  });
});

test('keeps reTerminal E1001 as an Ink operator sheet with report-length copy', () => {
  const detail =
    'Registry review clear. 1014 MCPs, 22 deployed fleet entries, and 4 agent health surfaces were checked. Live Hub reports 13 of 13 connected services, 0 failed services, and 914 proxy tools available. No operator action is required.';
  const brief = buildOperatorBrief({
    surface: 'seeed-reterminal-e1001',
    alerts: [
      alert({
        state: 'operator_attention',
        subject: 'CREATE SOMETHING daily operator brief',
        reason: 'No blocked workflows',
        detail,
        action: 'Keep the sheet visible; return only if Ink escalates.',
        severity: 50
      })
    ],
    health: [],
    now: 1000
  });
  const firmware = toFirmwareBrief(brief);

  assert.equal(brief.surface, 'reterminal-e1001');
  assert.equal(brief.detail, detail);
  assert.deepEqual(firmware.surface_profile, {
    id: 'reterminal-e1001',
    role: 'operator_sheet',
    display: 'eink',
    refresh: 'slow',
    supports_lists: true,
    supports_detail_drilldown: true
  });
});
