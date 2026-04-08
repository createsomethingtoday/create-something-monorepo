import test from 'node:test';
import assert from 'node:assert/strict';

import {
	hydrateToolkitAccount,
	resolveToolkitAccountUpsert,
} from '../src/lib/server/partner-toolkit-account-core.ts';

function createToolkitAccount(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'patoolacct_123',
		partner_client_id: 'pacli_acme',
		toolkit: 'slack',
		account_slug: 'primary',
		display_label: 'Slack Primary',
		composio_user_id: 'hd_slack_acme_primary',
		auth_config_id: 'authcfg_slack',
		connected_account_id: null,
		connection_status: 'INITIATED',
		status: 'active' as const,
		sync_enabled: 1,
		last_checked_at: null,
		connected_at: null,
		metadata_json: '{"source":"operator"}',
		created_at: '2026-04-08T12:00:00.000Z',
		updated_at: '2026-04-08T12:00:00.000Z',
		...overrides,
	};
}

test('toolkit account hydration promotes INITIATED bindings to ACTIVE when Composio reports a match', async () => {
	const updates: Array<Record<string, unknown>> = [];

	const hydrated = await hydrateToolkitAccount(
		{
			listToolkitAccounts: async () => [createToolkitAccount()] as any[],
			listConnectedAccounts: async () => [
				{
					id: 'connacct_123',
					status: 'ACTIVE',
					userId: 'hd_slack_acme_primary',
					authConfigId: 'authcfg_slack',
					toolkit: { slug: 'slack' },
					createdAt: '2026-04-08T12:05:00.000Z',
					updatedAt: '2026-04-08T12:06:00.000Z',
				},
			],
			normalizeToolkitSlug: (value) => value.trim().toLowerCase(),
			parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
			updateToolkitAccountSyncState: async (_db, input) => {
				updates.push(input as Record<string, unknown>);
			},
			now: () => '2026-04-08T12:10:00.000Z',
		},
		{
			db: {} as D1Database,
			partnerClientId: 'pacli_acme',
			toolkit: 'slack',
			accountSlug: 'primary',
		},
	);

	assert.ok(hydrated);
	assert.equal(hydrated?.connection_status, 'ACTIVE');
	assert.equal(hydrated?.connected, true);
	assert.equal(hydrated?.connected_account_id, 'connacct_123');
	assert.equal(hydrated?.connected_at, '2026-04-08T12:05:00.000Z');
	assert.equal(hydrated?.last_checked_at, '2026-04-08T12:10:00.000Z');
	assert.equal(updates.length, 1);
	assert.equal(updates[0]?.connectionStatus, 'ACTIVE');
});

test('toolkit account upsert resolution reactivates disabled bindings and preserves metadata', () => {
	const resolved = resolveToolkitAccountUpsert({
		existing: createToolkitAccount({
			display_label: null,
			sync_enabled: 0,
			status: 'disabled',
			metadata_json: '{"source":"operator","previous":"value"}',
		}) as any,
		accountSlug: 'primary',
		actor: 'partner_admin:test',
		metadata: { reason: 'reactivate' },
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
	});

	assert.equal(resolved.displayLabel, 'primary');
	assert.equal(resolved.syncEnabled, false);
	assert.equal(resolved.reactivated, true);
	assert.equal(resolved.status, 'active');
	assert.deepEqual(resolved.metadata, {
		source: 'operator',
		previous: 'value',
		reason: 'reactivate',
		last_updated_by: 'partner_admin:test',
	});
});
