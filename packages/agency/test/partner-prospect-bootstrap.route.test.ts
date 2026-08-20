import test from 'node:test';
import assert from 'node:assert/strict';

import { createPartnerProspectBootstrapPostHandler } from '../src/lib/server/partner-prospect-bootstrap-core.ts';

function createFakeDb() {
	const statements: Array<{ sql: string; args: unknown[] }> = [];
	return {
		statements,
		db: {
			prepare(sql: string) {
				return {
					bind(...args: unknown[]) {
						return {
							async run() {
								statements.push({ sql, args });
								return {};
							},
						};
					},
				};
			},
		},
	};
}

test('partner prospect bootstrap creates initialized client and restricted lane records', async () => {
	const { db, statements } = createFakeDb();
	let clientLookupCount = 0;
	let upsertInput: {
		status: string;
		slug: string;
		toolkitProfile: string[];
		allowedToolPrefixes: string[];
	} | null = null;
	const capturedUpsertInput = () => upsertInput;

	const handler = createPartnerProspectBootstrapPostHandler({
		partnerKey: 'half-dozen',
		buildPartnerLaneHubUrl: (laneSlug) => `https://${laneSlug}.mcp.createsomething.agency/mcp`,
		defaultWorkspaceAccountId: (slug) => `acct_${slug}`,
		getPartnerAccessLaneBySlug: async () => null,
		getPartnerClientBySlug: async () => {
			clientLookupCount += 1;
			if (clientLookupCount === 1) {
				return null;
			}
			return {
				id: 'pacli_acme',
				partner_key: 'half-dozen',
				slug: 'acme',
				display_name: 'Acme',
				workspace_account_id: 'acct_acme',
				identity_account_id: null,
				identity_user_id: null,
				identity_tenant_id: null,
				owner_email: 'owner@example.com',
				status: 'initialized',
				required_toolkits_json: '["gmail","notion"]',
				metadata_json: '{"onboarding_mode":"prospect","lifecycle_stage":"prospect"}',
				created_at: '2026-03-18T00:00:00.000Z',
				updated_at: '2026-03-18T00:00:00.000Z',
			};
		},
		isProspectGraduated: () => false,
		isProspectRecord: (metadata) => metadata.onboarding_mode === 'prospect' || metadata.lifecycle_stage === 'prospect',
		normalizeAllowedToolPrefixes: (raw) => {
			if (!Array.isArray(raw)) return [];
			return [...new Set(raw.filter((value): value is string => typeof value === 'string'))];
		},
		normalizeEmail: (raw) => raw?.trim().toLowerCase() ?? null,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => {
			if (!raw) return [];
			return JSON.parse(raw) as string[];
		},
		parseJsonObject: (raw) => {
			if (!raw) return {};
			return JSON.parse(raw) as Record<string, unknown>;
		},
		parseJsonStringArray: (raw) => {
			if (!raw) return [];
			return JSON.parse(raw) as string[];
		},
		parseToolkitList: (raw) => {
			if (!Array.isArray(raw)) return [];
			return [...new Set(raw.filter((value): value is string => typeof value === 'string').map((value) => value.toLowerCase()))];
		},
		randomId: (prefix) => `${prefix}_test`,
		requirePartnerAdmin: () => 'partner_admin:test',
		resolveAllowedToolPrefixes: (toolkits, explicitPrefixes = []) =>
			[...new Set([...explicitPrefixes, ...toolkits.map((toolkit) => `composio-toolkit-${toolkit}__`)])],
		upsertPartnerAccessLane: async (_db, input) => {
			upsertInput = input;
			return {
				id: 'palane_test',
				partner_client_id: 'pacli_acme',
				slug: input.slug,
				display_name: input.displayName,
				identity_user_id: input.identityUserId,
				owner_email: input.ownerEmail,
				hub_url: input.hubUrl,
				host_key: input.hostKey,
				status: input.status,
				toolkit_profile_json: JSON.stringify(input.toolkitProfile),
				allowed_tool_prefixes_json: JSON.stringify(input.allowedToolPrefixes),
				metadata_json: JSON.stringify(input.metadata),
				created_at: '2026-03-18T00:00:00.000Z',
				updated_at: '2026-03-18T00:00:00.000Z',
			};
		},
		isHttpError: (error): error is { status: number; code: string; message: string } =>
			Boolean(error && typeof error === 'object' && 'status' in error && 'code' in error && 'message' in error),
	});

	const response = await handler({
		request: new Request('https://example.com/api/partners/half-dozen/prospects/acme/bootstrap', {
			method: 'POST',
			body: JSON.stringify({
				display_name: 'Acme',
				owner_email: 'Owner@Example.com',
				required_toolkits: ['gmail'],
				toolkit_profile: ['gmail', 'notion'],
				allowed_tool_prefixes: ['composio-toolkit-notion__', 'hub-half-dozen-prospect__'],
			}),
		}),
		params: {
			slug: 'Acme',
		},
		platform: {
			env: {
				DB: db,
			},
		},
	} as any);

	assert.equal(response.status, 200);
	assert.equal(statements.length, 1);
	assert.match(statements[0]?.sql ?? '', /INSERT INTO partner_auth_clients/);
	assert.equal(capturedUpsertInput()?.status, 'initialized');
	assert.equal(capturedUpsertInput()?.slug, 'prospect-acme');
	assert.deepEqual(capturedUpsertInput()?.toolkitProfile, ['gmail', 'notion']);
	assert.deepEqual(capturedUpsertInput()?.allowedToolPrefixes, [
		'composio-toolkit-notion__',
		'hub-half-dozen-prospect__',
		'composio-toolkit-gmail__',
	]);

	const payload = (await response.json()) as {
		client: { slug: string; status: string };
		lane: { slug: string; status: string };
		issuance_state: { ready: boolean; blocked_reason: string; required_graduation_checks: string[] };
	};
	assert.equal(payload.client.slug, 'acme');
	assert.equal(payload.client.status, 'initialized');
	assert.equal(payload.lane.slug, 'prospect-acme');
	assert.equal(payload.lane.status, 'initialized');
	assert.equal(payload.issuance_state.ready, false);
	assert.equal(payload.issuance_state.blocked_reason, 'prospect_not_ready');
	assert.deepEqual(payload.issuance_state.required_graduation_checks, [
		'service_entitled',
		'policy_accepted',
		'contract_active',
		'billing_active',
		'identity_account_id',
		'identity_user_id',
	]);
});

test('partner prospect bootstrap refuses to overwrite non-prospect clients', async () => {
	const { db } = createFakeDb();

	const handler = createPartnerProspectBootstrapPostHandler({
		partnerKey: 'half-dozen',
		buildPartnerLaneHubUrl: (laneSlug) => `https://${laneSlug}.mcp.createsomething.agency/mcp`,
		defaultWorkspaceAccountId: (slug) => `acct_${slug}`,
		getPartnerAccessLaneBySlug: async () => null,
		getPartnerClientBySlug: async () => ({
			id: 'pacli_existing',
			partner_key: 'half-dozen',
			slug: 'acme',
			display_name: 'Acme',
			workspace_account_id: 'acct_acme',
			identity_account_id: 'acct_real',
			identity_user_id: 'auth0|abc',
			identity_tenant_id: 'tenant_real',
			owner_email: 'owner@example.com',
			status: 'active',
			required_toolkits_json: '["gmail"]',
			metadata_json: '{"onboarding_mode":"client","lifecycle_stage":"active"}',
			created_at: '2026-03-18T00:00:00.000Z',
			updated_at: '2026-03-18T00:00:00.000Z',
		}),
		isProspectGraduated: () => false,
		isProspectRecord: () => false,
		normalizeAllowedToolPrefixes: () => [],
		normalizeEmail: (raw) => raw?.trim().toLowerCase() ?? null,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseToolkitList: () => [],
		randomId: (prefix) => `${prefix}_test`,
		requirePartnerAdmin: () => 'partner_admin:test',
		resolveAllowedToolPrefixes: () => [],
		upsertPartnerAccessLane: async () => {
			throw new Error('upsertPartnerAccessLane should not be called');
		},
		isHttpError: (error): error is { status: number; code: string; message: string } =>
			Boolean(error && typeof error === 'object' && 'status' in error && 'code' in error && 'message' in error),
	});

	const response = await handler({
		request: new Request('https://example.com/api/partners/half-dozen/prospects/acme/bootstrap', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		params: {
			slug: 'acme',
		},
		platform: {
			env: {
				DB: db,
			},
		},
	} as any);

	assert.equal(response.status, 409);
	const payload = (await response.json()) as { error: string };
	assert.equal(payload.error, 'client_already_exists');
});
