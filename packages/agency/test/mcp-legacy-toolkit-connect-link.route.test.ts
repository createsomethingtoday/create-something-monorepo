import test from 'node:test';
import assert from 'node:assert/strict';

import type { McpAccessAssignment } from '../src/lib/server/mcp-access-assignments.ts';
import { createLegacyMcpToolkitConnectLinkPostHandler } from '../src/lib/server/mcp-legacy-toolkit-connect-link-core.ts';

function createLegacyAssignment(
	overrides: Partial<McpAccessAssignment> = {},
): McpAccessAssignment {
	return {
		source: 'legacy',
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
		tenantId: 'tenant_halfdozen_co',
		workspaceAccountId: 'acct_danny',
		toolkitProfile: ['gmail', 'notion'],
		allowedToolPrefixes: ['composio-toolkit-gmail__', 'composio-toolkit-notion__'],
		...overrides,
	};
}

test('legacy lane user can issue a self-serve toolkit connect link', async () => {
	const writes: Array<Record<string, unknown>> = [];
	const events: Array<Record<string, unknown>> = [];

	const handler = createLegacyMcpToolkitConnectLinkPostHandler({
		buildBindingId: () => 'legacy_lane_danny',
		buildBindingSlug: () => 'legacy-danny',
		defaultToolkitComposioUserId: (_clientSlug, toolkit, accountSlug) => `hd_${toolkit}_${accountSlug}`,
		findToolkitAccount: async () => null,
		getComposioClient: () => ({
			connectedAccounts: {
				link: async (userId, authConfigId, options) => {
					assert.equal(userId, 'hd_gmail_primary');
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
		normalizeAccountSlug: (value) => value.trim().toLowerCase(),
		normalizeLegacyLaneKey: (value) => value.trim().toLowerCase(),
		normalizeToolkitSlug: (value) => value.trim().toLowerCase(),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		randomId: (prefix) => `${prefix}_123`,
		requireAgencySessionUser: async () => ({
			id: 'auth0|dm',
			email: 'dm@halfdozen.co',
		}),
		resolveAccessAssignment: async () => createLegacyAssignment(),
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
	assert.equal(writes.length, 1);
	assert.equal(writes[0]?.bindingId, 'legacy_lane_danny');
	assert.equal(writes[0]?.toolkit, 'gmail');
	assert.equal(writes[0]?.accountSlug, 'primary');
	assert.equal(events.length, 1);

	const payload = await response.json();
	assert.equal(payload.connect_link, 'https://composio.example/connect');
	assert.equal(payload.composio_user_id, 'hd_gmail_primary');
});

test('legacy self-serve connect blocks toolkits that are outside the lane scope', async () => {
	const handler = createLegacyMcpToolkitConnectLinkPostHandler({
		buildBindingId: () => 'legacy_lane_danny',
		buildBindingSlug: () => 'legacy-danny',
		defaultToolkitComposioUserId: () => 'unused',
		findToolkitAccount: async () => null,
		getComposioClient: () => {
			throw new Error('getComposioClient should not be called');
		},
		insertToolkitEvent: async () => {
			throw new Error('insertToolkitEvent should not be called');
		},
		normalizeAccountSlug: (value) => value.trim().toLowerCase(),
		normalizeLegacyLaneKey: (value) => value.trim().toLowerCase(),
		normalizeToolkitSlug: (value) => value.trim().toLowerCase(),
		parseJsonObject: () => ({}),
		randomId: (prefix) => `${prefix}_123`,
		requireAgencySessionUser: async () => ({
			id: 'auth0|dm',
			email: 'dm@halfdozen.co',
		}),
		resolveAccessAssignment: async () => createLegacyAssignment(),
		resolveAuthConfigId: () => 'authcfg_youtube',
		upsertToolkitAccount: async () => {
			throw new Error('upsertToolkitAccount should not be called');
		},
		isHttpError: (error): error is { status: number; code: string; message: string } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		params: { laneKey: 'danny', toolkit: 'youtube' },
		platform: { env: { DB: {} } },
		request: new Request('https://example.com/api/me/hubs/danny/toolkits/youtube/connect-link', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		url: new URL('https://example.com/api/me/hubs/danny/toolkits/youtube/connect-link'),
	} as any);

	assert.equal(response.status, 403);
	const payload = await response.json();
	assert.equal(payload.error, 'toolkit_not_authorized');
});

test('legacy self-serve connect stays disabled for non-Composio legacy reviewer lanes', async () => {
	const handler = createLegacyMcpToolkitConnectLinkPostHandler({
		buildBindingId: () => 'legacy_lane_wf_eric',
		buildBindingSlug: () => 'legacy-wf-eric',
		defaultToolkitComposioUserId: () => 'unused',
		findToolkitAccount: async () => null,
		getComposioClient: () => {
			throw new Error('getComposioClient should not be called');
		},
		insertToolkitEvent: async () => {
			throw new Error('insertToolkitEvent should not be called');
		},
		normalizeAccountSlug: (value) => value.trim().toLowerCase(),
		normalizeLegacyLaneKey: (value) => value.trim().toLowerCase(),
		normalizeToolkitSlug: (value) => value.trim().toLowerCase(),
		parseJsonObject: () => ({}),
		randomId: (prefix) => `${prefix}_123`,
		requireAgencySessionUser: async () => ({
			id: 'auth0|reviewer',
			email: 'reviewer@webflow.com',
		}),
		resolveAccessAssignment: async () =>
			createLegacyAssignment({
				laneKey: 'wf_eric',
				displayName: 'Eric Unger',
				toolkitProfile: [],
				allowedToolPrefixes: [],
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
		params: { laneKey: 'wf_eric', toolkit: 'gmail' },
		platform: { env: { DB: {} } },
		request: new Request('https://example.com/api/me/hubs/wf_eric/toolkits/gmail/connect-link', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		url: new URL('https://example.com/api/me/hubs/wf_eric/toolkits/gmail/connect-link'),
	} as any);

	assert.equal(response.status, 409);
	const payload = await response.json();
	assert.equal(payload.error, 'self_serve_unavailable');
});
