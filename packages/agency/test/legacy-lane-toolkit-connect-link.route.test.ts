import test from 'node:test';
import assert from 'node:assert/strict';

import { createLegacyLaneToolkitConnectLinkPostHandler } from '../src/lib/server/legacy-lane-toolkit-connect-link-core.ts';

function createLegacyAssignment() {
	return {
		source: 'legacy' as const,
		partnerClientId: null,
		clientSlug: null,
		laneKey: 'danny',
		displayName: 'Danny',
		hubUrl: 'https://danny.mcp.createsomething.agency/mcp',
		bridgeUrl: 'https://danny-notion.mcp.createsomething.agency/mcp',
		bridgeUsername: 'acct_danny',
		credentialSource: 'Vault + private operator handoff',
		hostKey: 'acct_danny',
		accountId: 'acct_danny',
		tenantId: 'danny',
		workspaceAccountId: 'acct_danny',
		toolkitProfile: ['gmail', 'notion'],
		allowedToolPrefixes: ['composio-toolkit-gmail__', 'composio-toolkit-notion__'],
	};
}

test('legacy shared-auth user can issue a self-serve toolkit connect link', async () => {
	const writes: Array<Record<string, unknown>> = [];
	const events: Array<Record<string, unknown>> = [];
	let ensureBindingCalls = 0;

	const handler = createLegacyLaneToolkitConnectLinkPostHandler({
		defaultToolkitComposioUserId: (_clientSlug, toolkit, accountSlug) => `legacy_${toolkit}_${accountSlug}`,
		ensureAgencyMcpEntitlement: async () => ({
			row: {
				account_id: 'acct_danny',
				tenant_id: 'danny',
				workspace_account_id: 'acct_danny',
			},
		}),
		ensureLegacyClientBinding: async () => {
			ensureBindingCalls += 1;
			return {
				id: 'pacli_legacy_danny',
				partner_key: 'agency-legacy',
				slug: 'legacy-danny-acct-danny',
				display_name: 'Danny',
				workspace_account_id: 'acct_danny',
				identity_account_id: 'acct_danny',
				identity_user_id: 'auth0|dm',
				identity_tenant_id: 'danny',
				owner_email: 'dm@example.com',
				status: 'active',
				required_toolkits_json: '["gmail","notion"]',
				metadata_json: '{}',
				created_at: '2026-03-19T00:00:00.000Z',
				updated_at: '2026-03-19T00:00:00.000Z',
			};
		},
		findToolkitAccount: async () => null,
		getComposioClient: () => ({
			connectedAccounts: {
				link: async (userId, authConfigId, options) => {
					assert.equal(userId, 'legacy_gmail_primary');
					assert.equal(authConfigId, 'authcfg_gmail');
					assert.equal(options?.callbackUrl, 'https://agency.example/mcp-access/tools?hub=danny&toolkit=gmail');
					return {
						id: 'connreq_123',
						redirectUrl: 'https://composio.example/connect',
					};
				},
			},
		}),
		insertToolkitEvent: async (_db, input) => {
			events.push(input as Record<string, unknown>);
		},
		isToolkitAuthorized: () => true,
		listMcpAccessAssignments: async () => [createLegacyAssignment()],
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		normalizeToolkitSlug: (value) => value.trim().toLowerCase(),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		randomId: (prefix) => `${prefix}_123`,
		requireAgencySessionUser: async () => ({
			id: 'auth0|dm',
			email: 'dm@example.com',
		}),
		resolveAuthConfigId: () => 'authcfg_gmail',
		upsertToolkitAccount: async (_db, input) => {
			writes.push(input as Record<string, unknown>);
		},
		isHttpError: (error): error is { status: number; code: string; message: string } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		params: { laneKey: 'danny', toolkit: 'gmail' },
		platform: { env: { DB: {} } },
		request: new Request('https://example.com/api/me/hubs/danny/toolkits/gmail/connect-link', {
			method: 'POST',
			body: JSON.stringify({
				callback_url: 'https://agency.example/mcp-access/tools?hub=danny&toolkit=gmail',
			}),
		}),
		url: new URL('https://example.com/api/me/hubs/danny/toolkits/gmail/connect-link'),
	} as any);

	assert.equal(response.status, 200);
	assert.equal(ensureBindingCalls, 1);
	assert.equal(writes.length, 1);
	assert.equal(writes[0]?.partnerClientId, 'pacli_legacy_danny');
	assert.equal(writes[0]?.toolkit, 'gmail');
	assert.equal(writes[0]?.accountSlug, 'primary');
	assert.equal(events.length, 1);

	const payload = (await response.json()) as { lane_key: string; client_slug: string; connect_link: string };
	assert.equal(payload.lane_key, 'danny');
	assert.equal(payload.client_slug, 'legacy-danny-acct-danny');
	assert.equal(payload.connect_link, 'https://composio.example/connect');
});

test('legacy self-serve connect remains blocked for partner-managed lanes', async () => {
	const handler = createLegacyLaneToolkitConnectLinkPostHandler({
		defaultToolkitComposioUserId: () => 'unused',
		ensureAgencyMcpEntitlement: async () => ({
			row: {
				account_id: 'acct_client',
				tenant_id: 'client',
				workspace_account_id: 'acct_client',
			},
		}),
		ensureLegacyClientBinding: async () => {
			throw new Error('ensureLegacyClientBinding should not be called');
		},
		findToolkitAccount: async () => null,
		getComposioClient: () => {
			throw new Error('getComposioClient should not be called');
		},
		insertToolkitEvent: async () => {
			throw new Error('insertToolkitEvent should not be called');
		},
		isToolkitAuthorized: () => true,
		listMcpAccessAssignments: async () => [
			{
				...createLegacyAssignment(),
				source: 'partner_lane' as const,
				partnerClientId: 'pacli_partner',
				clientSlug: 'client-a',
			},
		],
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		normalizeToolkitSlug: (value) => value.trim().toLowerCase(),
		parseJsonObject: () => ({}),
		randomId: (prefix) => `${prefix}_123`,
		requireAgencySessionUser: async () => ({
			id: 'auth0|user',
			email: 'user@example.com',
		}),
		resolveAuthConfigId: () => 'authcfg_gmail',
		upsertToolkitAccount: async () => {
			throw new Error('upsertToolkitAccount should not be called');
		},
		isHttpError: (error): error is { status: number; code: string; message: string } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		params: { laneKey: 'danny', toolkit: 'gmail' },
		platform: { env: { DB: {} } },
		request: new Request('https://example.com/api/me/hubs/danny/toolkits/gmail/connect-link', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		url: new URL('https://example.com/api/me/hubs/danny/toolkits/gmail/connect-link'),
	} as any);

	assert.equal(response.status, 403);
	const payload = (await response.json()) as { error: string };
	assert.equal(payload.error, 'partner_admin_required');
});

test('legacy self-serve connect rejects toolkits that are out of scope', async () => {
	const handler = createLegacyLaneToolkitConnectLinkPostHandler({
		defaultToolkitComposioUserId: () => 'unused',
		ensureAgencyMcpEntitlement: async () => ({
			row: {
				account_id: 'acct_danny',
				tenant_id: 'danny',
				workspace_account_id: 'acct_danny',
			},
		}),
		ensureLegacyClientBinding: async () => {
			throw new Error('ensureLegacyClientBinding should not be called');
		},
		findToolkitAccount: async () => null,
		getComposioClient: () => {
			throw new Error('getComposioClient should not be called');
		},
		insertToolkitEvent: async () => {
			throw new Error('insertToolkitEvent should not be called');
		},
		isToolkitAuthorized: () => false,
		listMcpAccessAssignments: async () => [createLegacyAssignment()],
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		normalizeToolkitSlug: (value) => value.trim().toLowerCase(),
		parseJsonObject: () => ({}),
		randomId: (prefix) => `${prefix}_123`,
		requireAgencySessionUser: async () => ({
			id: 'auth0|dm',
			email: 'dm@example.com',
		}),
		resolveAuthConfigId: () => 'authcfg_gmail',
		upsertToolkitAccount: async () => {
			throw new Error('upsertToolkitAccount should not be called');
		},
		isHttpError: (error): error is { status: number; code: string; message: string } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		params: { laneKey: 'danny', toolkit: 'slack' },
		platform: { env: { DB: {} } },
		request: new Request('https://example.com/api/me/hubs/danny/toolkits/slack/connect-link', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		url: new URL('https://example.com/api/me/hubs/danny/toolkits/slack/connect-link'),
	} as any);

	assert.equal(response.status, 403);
	const payload = (await response.json()) as { error: string };
	assert.equal(payload.error, 'toolkit_not_enabled');
});
