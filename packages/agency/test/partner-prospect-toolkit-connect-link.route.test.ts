import test from 'node:test';
import assert from 'node:assert/strict';

import { createPartnerProspectToolkitConnectLinkPostHandler } from '../src/lib/server/partner-prospect-toolkit-connect-link-core.ts';

function createClient(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'pacli_acme',
		slug: 'acme',
		display_name: 'Acme',
		workspace_account_id: 'acct_acme',
		identity_user_id: 'auth0|claimant',
		status: 'initialized' as const,
		required_toolkits_json: '["gmail","notion"]',
		metadata_json: '{"onboarding_mode":"prospect","lifecycle_stage":"prospect"}',
		...overrides,
	};
}

function createLane(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: 'palane_acme',
		slug: 'prospect-acme',
		identity_user_id: 'auth0|claimant',
		status: 'initialized' as const,
		toolkit_profile_json: '["gmail","notion"]',
		metadata_json: '{"onboarding_mode":"prospect","lifecycle_stage":"prospect"}',
		...overrides,
	};
}

test('claimed prospect user can issue a self-service toolkit connect link', async () => {
	const writes: Array<Record<string, unknown>> = [];
	const events: Array<Record<string, unknown>> = [];
	let callbackUrl: string | undefined;

	const handler = createPartnerProspectToolkitConnectLinkPostHandler({
		partnerKey: 'half-dozen',
		defaultToolkitComposioUserId: (_clientSlug, toolkit, accountSlug) => `hd_${toolkit}_${accountSlug}`,
		findToolkitAccount: async () => null,
		getComposioClient: () => ({
			connectedAccounts: {
				link: async (_userId, _authConfigId, options) => {
					callbackUrl = options?.callbackUrl;
					return {
						id: 'connreq_123',
						redirectUrl: 'https://composio.example/connect',
					};
				},
			},
		}),
		getPartnerAccessLaneBySlug: async () => createLane(),
		getPartnerClientBySlug: async () => createClient(),
		insertToolkitEvent: async (_db, input) => {
			events.push(input as Record<string, unknown>);
		},
		isProspectGraduated: () => false,
		isProspectRecord: () => true,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		normalizeToolkitSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		randomId: (prefix) => `${prefix}_123`,
		requireAgencySessionUser: async () => ({
			id: 'auth0|claimant',
			email: 'owner@example.com',
		}),
		resolveAuthConfigId: () => 'authcfg_123',
		upsertToolkitAccount: async (_db, input) => {
			writes.push(input as Record<string, unknown>);
		},
		isHttpError: (error): error is { status: number; code: string; message: string } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		params: { slug: 'acme', toolkit: 'gmail' },
		platform: { env: { DB: {} } },
		request: new Request('https://example.com/api/me/prospects/acme/toolkits/gmail/connect-link', {
			method: 'POST',
			body: JSON.stringify({ callback_url: 'https://example.com/dashboard?tab=prospects' }),
		}),
		url: new URL('https://example.com/api/me/prospects/acme/toolkits/gmail/connect-link'),
	} as any);

	assert.equal(response.status, 200);
	assert.equal(writes.length, 1);
	assert.equal(writes[0]?.toolkit, 'gmail');
	assert.equal(writes[0]?.accountSlug, 'primary');
	assert.equal(events.length, 1);
	assert.equal(callbackUrl, 'https://example.com/dashboard?tab=prospects');
	assert.equal(events[0]?.metadata?.callback_path, '/dashboard?tab=prospects');
	assert.equal(events[0]?.metadata?.callback_source, 'validated_same_origin');
	const payload = await response.json();
	assert.equal(payload.connect_link, 'https://composio.example/connect');
	assert.equal(payload.composio_user_id, 'hd_gmail_primary');
});

test('prospect toolkit connect link requires the prospect to already be claimed by this user', async () => {
	const handler = createPartnerProspectToolkitConnectLinkPostHandler({
		partnerKey: 'half-dozen',
		defaultToolkitComposioUserId: () => 'unused',
		findToolkitAccount: async () => null,
		getComposioClient: () => {
			throw new Error('getComposioClient should not be called');
		},
		getPartnerAccessLaneBySlug: async () => createLane({ identity_user_id: null }),
		getPartnerClientBySlug: async () => createClient({ identity_user_id: null }),
		insertToolkitEvent: async () => {
			throw new Error('insertToolkitEvent should not be called');
		},
		isProspectGraduated: () => false,
		isProspectRecord: () => true,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		normalizeToolkitSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		randomId: (prefix) => `${prefix}_123`,
		requireAgencySessionUser: async () => ({
			id: 'auth0|claimant',
			email: 'owner@example.com',
		}),
		resolveAuthConfigId: () => 'authcfg_123',
		upsertToolkitAccount: async () => {
			throw new Error('upsertToolkitAccount should not be called');
		},
		isHttpError: (error): error is { status: number; code: string; message: string } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		params: { slug: 'acme', toolkit: 'gmail' },
		platform: { env: { DB: {} } },
		request: new Request('https://example.com/api/me/prospects/acme/toolkits/gmail/connect-link', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		url: new URL('https://example.com/api/me/prospects/acme/toolkits/gmail/connect-link'),
	} as any);

	assert.equal(response.status, 403);
	const payload = await response.json();
	assert.equal(payload.error, 'prospect_not_claimed');
});

test('prospect toolkit connect link rejects partial claim state until claim is repaired', async () => {
	const handler = createPartnerProspectToolkitConnectLinkPostHandler({
		partnerKey: 'half-dozen',
		defaultToolkitComposioUserId: () => 'unused',
		findToolkitAccount: async () => null,
		getComposioClient: () => {
			throw new Error('getComposioClient should not be called');
		},
		getPartnerAccessLaneBySlug: async () => createLane({ identity_user_id: null }),
		getPartnerClientBySlug: async () => createClient({ identity_user_id: 'auth0|claimant' }),
		insertToolkitEvent: async () => {
			throw new Error('insertToolkitEvent should not be called');
		},
		isProspectGraduated: () => false,
		isProspectRecord: () => true,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		normalizeToolkitSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		randomId: (prefix) => `${prefix}_123`,
		requireAgencySessionUser: async () => ({
			id: 'auth0|claimant',
			email: 'owner@example.com',
		}),
		resolveAuthConfigId: () => 'authcfg_123',
		upsertToolkitAccount: async () => {
			throw new Error('upsertToolkitAccount should not be called');
		},
		isHttpError: (error): error is { status: number; code: string; message: string } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		params: { slug: 'acme', toolkit: 'gmail' },
		platform: { env: { DB: {} } },
		request: new Request('https://example.com/api/me/prospects/acme/toolkits/gmail/connect-link', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		url: new URL('https://example.com/api/me/prospects/acme/toolkits/gmail/connect-link'),
	} as any);

	assert.equal(response.status, 409);
	const payload = await response.json();
	assert.equal(payload.error, 'inconsistent_claim_state');
});

test('prospect toolkit connect link blocks toolkits that are not enabled for the prospect lane', async () => {
	const handler = createPartnerProspectToolkitConnectLinkPostHandler({
		partnerKey: 'half-dozen',
		defaultToolkitComposioUserId: () => 'unused',
		findToolkitAccount: async () => null,
		getComposioClient: () => {
			throw new Error('getComposioClient should not be called');
		},
		getPartnerAccessLaneBySlug: async () => createLane({ toolkit_profile_json: '["gmail"]' }),
		getPartnerClientBySlug: async () => createClient({ required_toolkits_json: '["gmail"]' }),
		insertToolkitEvent: async () => {
			throw new Error('insertToolkitEvent should not be called');
		},
		isProspectGraduated: () => false,
		isProspectRecord: () => true,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		normalizeToolkitSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		randomId: (prefix) => `${prefix}_123`,
		requireAgencySessionUser: async () => ({
			id: 'auth0|claimant',
			email: 'owner@example.com',
		}),
		resolveAuthConfigId: () => 'authcfg_123',
		upsertToolkitAccount: async () => {
			throw new Error('upsertToolkitAccount should not be called');
		},
		isHttpError: (error): error is { status: number; code: string; message: string } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		params: { slug: 'acme', toolkit: 'notion' },
		platform: { env: { DB: {} } },
		request: new Request('https://example.com/api/me/prospects/acme/toolkits/notion/connect-link', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		url: new URL('https://example.com/api/me/prospects/acme/toolkits/notion/connect-link'),
	} as any);

	assert.equal(response.status, 403);
	const payload = await response.json();
	assert.equal(payload.error, 'toolkit_not_enabled');
});

test('prospect toolkit connect link rejects external callback URLs', async () => {
	const handler = createPartnerProspectToolkitConnectLinkPostHandler({
		partnerKey: 'half-dozen',
		defaultToolkitComposioUserId: () => 'unused',
		findToolkitAccount: async () => null,
		getComposioClient: () => {
			throw new Error('getComposioClient should not be called');
		},
		getPartnerAccessLaneBySlug: async () => createLane(),
		getPartnerClientBySlug: async () => createClient(),
		insertToolkitEvent: async () => {
			throw new Error('insertToolkitEvent should not be called');
		},
		isProspectGraduated: () => false,
		isProspectRecord: () => true,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		normalizeToolkitSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		randomId: (prefix) => `${prefix}_123`,
		requireAgencySessionUser: async () => ({
			id: 'auth0|claimant',
			email: 'owner@example.com',
		}),
		resolveAuthConfigId: () => 'authcfg_123',
		upsertToolkitAccount: async () => {
			throw new Error('upsertToolkitAccount should not be called');
		},
		isHttpError: (error): error is { status: number; code: string; message: string } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		params: { slug: 'acme', toolkit: 'gmail' },
		platform: { env: { DB: {} } },
		request: new Request('https://example.com/api/me/prospects/acme/toolkits/gmail/connect-link', {
			method: 'POST',
			body: JSON.stringify({ callback_url: 'https://evil.example/steal' }),
		}),
		url: new URL('https://example.com/api/me/prospects/acme/toolkits/gmail/connect-link'),
	} as any);

	assert.equal(response.status, 400);
	const payload = await response.json();
	assert.equal(payload.error, 'invalid_callback_url');
});

test('prospect toolkit connect link defaults the callback to the prospect portal when none is provided', async () => {
	let callbackUrl: string | undefined;

	const handler = createPartnerProspectToolkitConnectLinkPostHandler({
		partnerKey: 'half-dozen',
		defaultToolkitComposioUserId: () => 'unused',
		findToolkitAccount: async () => null,
		getComposioClient: () => ({
			connectedAccounts: {
				link: async (_userId, _authConfigId, options) => {
					callbackUrl = options?.callbackUrl;
					return {
						id: 'connreq_123',
						redirectUrl: 'https://composio.example/connect',
					};
				},
			},
		}),
		getPartnerAccessLaneBySlug: async () => createLane(),
		getPartnerClientBySlug: async () => createClient(),
		insertToolkitEvent: async () => {},
		isProspectGraduated: () => false,
		isProspectRecord: () => true,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		normalizeToolkitSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		randomId: (prefix) => `${prefix}_123`,
		requireAgencySessionUser: async () => ({
			id: 'auth0|claimant',
			email: 'owner@example.com',
		}),
		resolveAuthConfigId: () => 'authcfg_123',
		upsertToolkitAccount: async () => {},
		isHttpError: (error): error is { status: number; code: string; message: string } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		params: { slug: 'acme', toolkit: 'gmail' },
		platform: { env: { DB: {} } },
		request: new Request('https://example.com/api/me/prospects/acme/toolkits/gmail/connect-link', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		url: new URL('https://example.com/api/me/prospects/acme/toolkits/gmail/connect-link'),
	} as any);

	assert.equal(response.status, 200);
	assert.equal(callbackUrl, 'https://example.com/prospects');
});
