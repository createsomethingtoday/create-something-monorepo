import test from 'node:test';
import assert from 'node:assert/strict';

import {
	hydrateNotionAccount,
	resolveNotionAccountUpsert,
} from '../src/lib/server/partner-notion-account-core.ts';

function createNotionAccount(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'panotion_123',
		partner_client_id: 'pacli_acme',
		account_slug: 'primary',
		display_label: 'Primary Workspace',
		composio_user_id: 'hd_notion_acme_primary',
		auth_config_id: 'authcfg_notion',
		connected_account_id: null,
		connection_status: 'INITIATED',
		status: 'active' as const,
		sync_enabled: 1,
		last_checked_at: null,
		connected_at: null,
		disabled_at: null,
		metadata_json: '{"source":"operator"}',
		created_at: '2026-04-08T12:00:00.000Z',
		updated_at: '2026-04-08T12:00:00.000Z',
		...overrides,
	};
}

test('notion account hydration promotes INITIATED bindings to ACTIVE when Composio reports a match', async () => {
	const updates: Array<Record<string, unknown>> = [];

	const hydrated = await hydrateNotionAccount(
		{
			listConnectedAccounts: async () => [
				{
					id: 'connacct_123',
					status: 'ACTIVE',
					userId: 'hd_notion_acme_primary',
					authConfigId: 'authcfg_notion',
					toolkit: { slug: 'notion' },
					createdAt: '2026-04-08T12:05:00.000Z',
					updatedAt: '2026-04-08T12:06:00.000Z',
				},
			],
			parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
			updateNotionAccountSyncState: async (_db, input) => {
				updates.push(input as Record<string, unknown>);
			},
			now: () => '2026-04-08T12:10:00.000Z',
		},
		{
			db: {} as D1Database,
			account: createNotionAccount() as any,
		},
	);

	assert.equal(hydrated.connection_status, 'ACTIVE');
	assert.equal(hydrated.connected, true);
	assert.equal(hydrated.connected_account_id, 'connacct_123');
	assert.equal(hydrated.connected_at, '2026-04-08T12:05:00.000Z');
	assert.equal(hydrated.last_checked_at, '2026-04-08T12:10:00.000Z');
	assert.deepEqual(hydrated.metadata, { source: 'operator' });
	assert.equal(updates.length, 1);
	assert.equal(updates[0]?.connectionStatus, 'ACTIVE');
});

test('notion account hydration falls back to stored state when Composio refresh fails', async () => {
	const updates: Array<Record<string, unknown>> = [];

	const hydrated = await hydrateNotionAccount(
		{
			listConnectedAccounts: async () => {
				throw new Error('composio unavailable');
			},
			parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
			updateNotionAccountSyncState: async (_db, input) => {
				updates.push(input as Record<string, unknown>);
			},
			now: () => '2026-04-08T12:10:00.000Z',
		},
		{
			db: {} as D1Database,
			account: createNotionAccount() as any,
		},
	);

	assert.equal(hydrated.connection_status, 'INITIATED');
	assert.equal(hydrated.connected, false);
	assert.equal(hydrated.last_checked_at, '2026-04-08T12:10:00.000Z');
	assert.equal(updates.length, 1);
	assert.equal(updates[0]?.connectionStatus, 'INITIATED');
});

test('notion account upsert resolution defaults display label and reactivates disabled bindings', () => {
	const resolved = resolveNotionAccountUpsert({
		existing: createNotionAccount({
			display_label: null,
			composio_user_id: 'hd_notion_acme_primary',
			sync_enabled: 0,
			status: 'disabled',
			metadata_json: '{"source":"operator","previous":"value"}',
		}) as any,
		accountSlug: 'primary',
		clientSlug: 'acme-client',
		actor: 'partner_admin:test',
		authConfigId: 'authcfg_notion',
		metadata: { reason: 'reactivate' },
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
	});

	assert.equal(resolved.displayLabel, 'primary');
	assert.equal(resolved.syncEnabled, false);
	assert.equal(resolved.composioUserId, 'hd_notion_acme_primary');
	assert.equal(resolved.reactivated, true);
	assert.equal(resolved.status, 'active');
	assert.deepEqual(resolved.metadata, {
		source: 'operator',
		previous: 'value',
		reason: 'reactivate',
		last_updated_by: 'partner_admin:test',
	});
});
