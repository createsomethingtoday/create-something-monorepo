import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPinStatusMap, buildToolTargetStatus, detectDeterministicRouterIntent } from './tools.js';
import type { NotionAccountRow, NotionPinRow } from './db.js';

function makeAccount(overrides: Partial<NotionAccountRow> = {}): NotionAccountRow {
  return {
    id: 'panotion_1',
    partner_client_id: 'client_1',
    account_slug: 'second-brain',
    display_label: 'Second Brain',
    composio_user_id: 'comp_user_1',
    auth_config_id: 'auth_cfg_1',
    connected_account_id: 'conn_1',
    connection_status: 'ACTIVE',
    status: 'active',
    sync_enabled: 1,
    last_checked_at: '2026-04-14T20:00:00.000Z',
    connected_at: '2026-04-14T19:59:00.000Z',
    disabled_at: null,
    metadata_json: JSON.stringify({ source: 'test' }),
    created_at: '2026-04-14T19:58:00.000Z',
    updated_at: '2026-04-14T20:00:00.000Z',
    ...overrides,
  };
}

function makePin(overrides: Partial<NotionPinRow> = {}): NotionPinRow {
  return {
    id: 'panpin_1',
    partner_client_id: 'client_1',
    tool_name: 'blondish_notion',
    account_slug: 'second-brain',
    metadata_json: JSON.stringify({ pinned_by: 'tester' }),
    created_at: '2026-04-14T19:58:00.000Z',
    updated_at: '2026-04-14T20:00:00.000Z',
    ...overrides,
  };
}

test('buildToolTargetStatus reports unconfigured pins with repair guidance', () => {
  const status = buildToolTargetStatus({
    toolName: 'blondish_notion',
    account: null,
  });

  assert.equal(status.configured, false);
  assert.equal(status.state, 'unconfigured');
  assert.equal(status.message, 'No account is currently pinned for "blondish_notion".');
  assert.deepEqual(status.next_actions, [{ tool: 'operator_notion_accounts', action: 'list_accounts', args: {} }]);
});

test('buildToolTargetStatus reports blocked disconnected targets', () => {
  const status = buildToolTargetStatus({
    toolName: 'blondish_notion',
    configured: true,
    account: makeAccount({ connection_status: 'NOT_CONNECTED', connected_account_id: null }),
    pinMetadata: { pinned_by: 'tester' },
  });

  assert.equal(status.state, 'blocked');
  assert.equal(status.issues.includes('not_connected'), true);
  assert.equal(status.message.includes('not connected to Notion'), true);
  assert.deepEqual(status.next_actions, [
    { tool: 'operator_notion_accounts', action: 'create_connect_link', args: { account_slug: 'second-brain' } },
    { tool: 'operator_notion_accounts', action: 'get_status', args: { account_slug: 'second-brain' } },
  ]);
});

test('buildPinStatusMap includes missing tools and warns when sync is disabled', () => {
  const account = makeAccount({ sync_enabled: 0 });
  const pinStatus = buildPinStatusMap([account], [makePin()], ['blondish_notion', 'halfdozen_notion']);

  assert.equal(pinStatus.blondish_notion?.state, 'warning');
  assert.equal(pinStatus.blondish_notion?.warnings.includes('sync_disabled'), true);
  assert.equal(pinStatus.blondish_notion?.message.includes('sync jobs are disabled'), true);
  assert.equal(pinStatus.halfdozen_notion?.state, 'unconfigured');
});

test('detectDeterministicRouterIntent separates pin inspection from repoint requests', () => {
  assert.equal(detectDeterministicRouterIntent('what is blondish notion pointed to right now?'), 'get_pin_status');
  assert.equal(detectDeterministicRouterIntent('wrong account pinned for blondish notion'), 'get_pin_status');
  assert.equal(detectDeterministicRouterIntent('repoint blondish notion to second-brain'), 'pin_account');
});
