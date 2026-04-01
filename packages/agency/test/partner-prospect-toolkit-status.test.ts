import test from 'node:test';
import assert from 'node:assert/strict';

import { attachProspectToolkitAccounts } from '../src/lib/server/partner-prospect-toolkit-status-core.ts';

function createProspect(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		client: {
			id: 'pacli_acme',
			slug: 'acme',
		},
		prospect_claim: {
			state: 'claimed_by_you' as const,
			can_claim_now: true,
		},
		...overrides,
	};
}

function createToolkitAccount(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'patoolacct_123',
		partner_client_id: 'pacli_acme',
		toolkit: 'gmail',
		account_slug: 'primary',
		display_label: 'Gmail Primary',
		composio_user_id: 'hd_gmail_acme_primary',
		auth_config_id: 'authcfg_123',
		connected_account_id: null,
		connection_status: 'INITIATED',
		status: 'active' as const,
		sync_enabled: 1,
		last_checked_at: null,
		connected_at: null,
		metadata_json: '{"issued_via":"prospect_self_service"}',
		created_at: '2026-03-18T00:00:00.000Z',
		updated_at: '2026-03-18T00:00:00.000Z',
		...overrides,
	};
}

test('prospect toolkit status helper promotes INITIATED bindings to ACTIVE when Composio reports a match', async () => {
	const updates: Array<Record<string, unknown>> = [];

	const prospects = await attachProspectToolkitAccounts(
		{
			listToolkitAccounts: async () => [createToolkitAccount()] as any[],
			listConnectedAccounts: async () => [
				{
					id: 'connacct_123',
					status: 'ACTIVE',
					userId: 'hd_gmail_acme_primary',
					authConfigId: 'authcfg_123',
					toolkit: { slug: 'gmail' },
					createdAt: '2026-03-18T12:00:00.000Z',
					updatedAt: '2026-03-18T12:05:00.000Z',
				},
			],
			normalizeToolkitSlug: (value) => value.trim().toLowerCase(),
			parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
			updateToolkitAccountSyncState: async (_db, input) => {
				updates.push(input as Record<string, unknown>);
			},
			now: () => '2026-03-18T12:10:00.000Z',
		},
		{
			db: {} as D1Database,
			prospects: [createProspect()] as any[],
		},
	);

	assert.equal(prospects.length, 1);
	assert.equal(prospects[0]?.toolkit_accounts.length, 1);
	assert.equal(prospects[0]?.toolkit_accounts[0]?.connection_status, 'ACTIVE');
		assert.equal(prospects[0]?.toolkit_accounts[0]?.connected, true);
		assert.equal(prospects[0]?.toolkit_accounts[0]?.connected_account_id, 'connacct_123');
		assert.equal(prospects[0]?.toolkit_accounts[0]?.connected_at, '2026-03-18T12:00:00.000Z');
		assert.equal(prospects[0]?.toolkit_accounts[0]?.last_checked_at, '2026-03-18T12:10:00.000Z');
		assert.equal(prospects[0]?.toolkit_accounts[0]?.verification_state, 'live');
		assert.equal(updates.length, 1);
		assert.equal(updates[0]?.connectionStatus, 'ACTIVE');
	});

test('prospect toolkit status helper falls back to stored state when Composio refresh fails', async () => {
	const updates: Array<Record<string, unknown>> = [];

	const prospects = await attachProspectToolkitAccounts(
		{
			listToolkitAccounts: async () => [createToolkitAccount()] as any[],
			listConnectedAccounts: async () => {
				throw new Error('composio unavailable');
			},
			normalizeToolkitSlug: (value) => value.trim().toLowerCase(),
			parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
			updateToolkitAccountSyncState: async (_db, input) => {
				updates.push(input as Record<string, unknown>);
			},
			now: () => '2026-03-18T12:10:00.000Z',
		},
		{
			db: {} as D1Database,
			prospects: [createProspect()] as any[],
		},
	);

	assert.equal(prospects.length, 1);
	assert.equal(prospects[0]?.toolkit_accounts.length, 1);
	assert.equal(prospects[0]?.toolkit_accounts[0]?.connection_status, 'INITIATED');
	assert.equal(prospects[0]?.toolkit_accounts[0]?.connected, false);
	assert.equal(prospects[0]?.toolkit_accounts[0]?.last_checked_at, null);
	assert.equal(prospects[0]?.toolkit_accounts[0]?.verification_state, 'refresh_failed');
	assert.equal(updates.length, 0);
});

test('prospect toolkit status helper matches by stored binding when the remote toolkit label does not normalize to the stored slug', async () => {
	const prospects = await attachProspectToolkitAccounts(
		{
			listToolkitAccounts: async () =>
				[
					createToolkitAccount({
						toolkit: 'ona',
						composio_user_id: 'hd_ona_acme_primary',
						auth_config_id: 'authcfg_ona',
					}),
				] as any[],
			listConnectedAccounts: async () => [
				{
					id: 'connacct_ona',
					status: 'ACTIVE',
					userId: 'hd_ona_acme_primary',
					authConfigId: 'authcfg_ona',
					toolkit: { name: 'Ona Core' },
					createdAt: '2026-03-18T12:00:00.000Z',
					updatedAt: '2026-03-18T12:05:00.000Z',
				},
			],
			normalizeToolkitSlug: (value) => value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
			parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
			now: () => '2026-03-18T12:10:00.000Z',
		},
		{
			db: {} as D1Database,
			prospects: [createProspect()] as any[],
		},
	);

	assert.equal(prospects.length, 1);
	assert.equal(prospects[0]?.toolkit_accounts[0]?.toolkit, 'ona');
	assert.equal(prospects[0]?.toolkit_accounts[0]?.connection_status, 'ACTIVE');
	assert.equal(prospects[0]?.toolkit_accounts[0]?.connected_account_id, 'connacct_ona');
	assert.equal(prospects[0]?.toolkit_accounts[0]?.verification_state, 'live');
});

test('prospect toolkit status helper can load toolkit accounts for multiple clients in one batched query', async () => {
	let batchedCalls = 0;

	const prospects = await attachProspectToolkitAccounts(
		{
			listToolkitAccounts: async () => {
				throw new Error('listToolkitAccounts should not be called when batched helper is provided');
			},
			listToolkitAccountsForClientIds: async (_db, clientIds) => {
				batchedCalls += 1;
				return clientIds.flatMap((clientId) => [
					createToolkitAccount({
						id: `acct_${clientId}`,
						partner_client_id: clientId,
						composio_user_id: `user_${clientId}`,
					}),
				]) as any[];
			},
			normalizeToolkitSlug: (value) => value.trim().toLowerCase(),
			parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
			now: () => '2026-03-18T12:10:00.000Z',
		},
		{
			db: {} as D1Database,
			prospects: [
				createProspect({ client: { id: 'pacli_one', slug: 'one' } }),
				createProspect({ client: { id: 'pacli_two', slug: 'two' } }),
			] as any[],
		},
	);

	assert.equal(batchedCalls, 1);
	assert.equal(prospects.length, 2);
	assert.equal(prospects[0]?.toolkit_accounts.length, 1);
	assert.equal(prospects[1]?.toolkit_accounts.length, 1);
});
