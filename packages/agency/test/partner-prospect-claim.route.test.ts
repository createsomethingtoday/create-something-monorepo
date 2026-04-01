import test from 'node:test';
import assert from 'node:assert/strict';

import { createPartnerProspectClaimPostHandler } from '../src/lib/server/partner-prospect-claim-core.ts';

function buildIdentitySeedRow(
	overrides: Partial<{
		normalized_email: string;
		auth_subject: string | null;
		account_id: string;
		tenant_id: string;
		workspace_account_id: string | null;
		service_tier: string;
		managed_bearer_allowed: number;
		org_membership_active: number;
		service_entitled: number;
		policy_accepted: number;
		contract_active: number;
		billing_active: number;
		status: string;
		invited_at: string | null;
		bound_at: string | null;
		metadata_json: string;
		created_at: string;
		updated_at: string;
	}> = {},
) {
	return {
		normalized_email: 'owner@example.com',
		auth_subject: 'auth0|claimant',
		account_id: 'acct_acme',
		tenant_id: 'acme',
		workspace_account_id: 'acct_acme',
		service_tier: 'policy_os_trial',
		managed_bearer_allowed: 0,
		org_membership_active: 1,
		service_entitled: 0,
		policy_accepted: 0,
		contract_active: 0,
		billing_active: 0,
		status: 'prospect_claimed',
		invited_at: null,
		bound_at: '2026-03-18T00:00:00.000Z',
		metadata_json: '{}',
		created_at: '2026-03-18T00:00:00.000Z',
		updated_at: '2026-03-18T00:00:00.000Z',
		...overrides,
	};
}

function buildEntitlementRow(
	overrides: Partial<{
		auth_subject: string;
		auth_email: string | null;
		account_id: string | null;
		tenant_id: string | null;
		workspace_account_id: string | null;
		service_tier: string;
		managed_bearer_allowed: number;
		org_membership_active: number;
		service_entitled: number;
		policy_accepted: number;
		contract_active: number;
		billing_active: number;
		denial_reason: string | null;
		metadata_json: string;
		created_at: string;
		updated_at: string;
	}> = {},
) {
	return {
		auth_subject: 'auth0|claimant',
		auth_email: 'owner@example.com',
		account_id: 'acct_acme',
		tenant_id: 'acme',
		workspace_account_id: 'acct_acme',
		service_tier: 'policy_os_trial',
		managed_bearer_allowed: 0,
		org_membership_active: 1,
		service_entitled: 0,
		policy_accepted: 0,
		contract_active: 0,
		billing_active: 0,
		denial_reason: null,
		metadata_json: '{}',
		created_at: '2026-03-18T00:00:00.000Z',
		updated_at: '2026-03-18T00:00:00.000Z',
		...overrides,
	};
}

function createDeferred<T = void>() {
	let resolve!: (value: T | PromiseLike<T>) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

function createBarrier(count: number) {
	let remaining = count;
	const release = createDeferred<void>();
	return {
		async wait() {
			remaining -= 1;
			if (remaining === 0) {
				release.resolve();
			}
			await release.promise;
		},
	};
}

function createState() {
	return {
		client: {
			id: 'pacli_acme',
			partner_key: 'half-dozen',
			slug: 'acme',
			display_name: 'Acme',
			workspace_account_id: 'acct_acme',
			identity_account_id: null,
			identity_user_id: null,
			identity_tenant_id: null,
			owner_email: 'owner@example.com',
			status: 'initialized' as const,
			required_toolkits_json: '["gmail"]',
			metadata_json: '{"onboarding_mode":"prospect","lifecycle_stage":"prospect","prospect_onboarding":{"stage":"prospect","graduation_target":"policy_os_trial"}}',
			created_at: '2026-03-18T00:00:00.000Z',
			updated_at: '2026-03-18T00:00:00.000Z',
		},
		lane: {
			id: 'palane_acme',
			partner_client_id: 'pacli_acme',
			slug: 'prospect-acme',
			display_name: 'Prospect Workspace - Acme',
			identity_user_id: null,
			owner_email: 'owner@example.com',
			hub_url: 'https://prospect-acme.mcp.createsomething.agency/mcp',
			host_key: 'prospect-acme',
			status: 'initialized' as const,
			toolkit_profile_json: '["gmail"]',
			allowed_tool_prefixes_json: '["composio-toolkit-gmail__"]',
			metadata_json: '{"onboarding_mode":"prospect","lifecycle_stage":"prospect","prospect_onboarding":{"stage":"prospect"}}',
			created_at: '2026-03-18T00:00:00.000Z',
			updated_at: '2026-03-18T00:00:00.000Z',
		},
		seeds: [] as Array<Record<string, unknown>>,
		identitySeed: null as ReturnType<typeof buildIdentitySeedRow> | null,
		entitlement: null as ReturnType<typeof buildEntitlementRow> | null,
	};
}

function createFakeDb(
	state: ReturnType<typeof createState>,
	options: {
		beforeClientClaimEvaluate?: (userId: string) => Promise<void> | void;
		afterClientClaimUpdate?: (userId: string, updated: boolean) => Promise<void> | void;
	} = {},
) {
	return {
		prepare(sql: string) {
			return {
				bind(...args: unknown[]) {
					return {
						async run() {
							if (
								sql.includes('UPDATE partner_auth_clients') &&
								sql.includes('(identity_user_id IS NULL OR identity_user_id = ?)')
							) {
								const userId = args[2] as string;
								await options.beforeClientClaimEvaluate?.(userId);
								let updated = false;
								if (
									state.client.id === args[5] &&
									(state.client.identity_user_id === null || state.client.identity_user_id === args[6])
								) {
									state.client = {
										...state.client,
										owner_email: args[0] as string,
										identity_account_id: args[1] as string,
										identity_user_id: args[2] as string,
										identity_tenant_id: args[3] as string,
										metadata_json: args[4] as string,
									};
									updated = true;
								}
								await options.afterClientClaimUpdate?.(userId, updated);
								return {};
							}
							if (sql.includes('UPDATE partner_auth_clients') && sql.includes('WHERE id = ? AND identity_user_id = ?')) {
								if (state.client.id === args[5] && state.client.identity_user_id === args[6]) {
									state.client = {
										...state.client,
										owner_email: args[0] as string | null,
										identity_account_id: args[1] as string | null,
										identity_user_id: args[2] as string | null,
										identity_tenant_id: args[3] as string | null,
										metadata_json: args[4] as string,
									};
								}
								return {};
							}
							if (
								sql.includes('UPDATE partner_auth_access_lanes') &&
								sql.includes('(identity_user_id IS NULL OR identity_user_id = ?)')
							) {
								const clientBindingSatisfied =
									args.length < 13 ||
									(state.client.id === args[11] && state.client.identity_user_id === args[12]);
								if (
									state.lane.id === args[9] &&
									(state.lane.identity_user_id === null || state.lane.identity_user_id === args[10]) &&
									clientBindingSatisfied
								) {
									state.lane = {
										...state.lane,
										display_name: args[0] as string,
										identity_user_id: args[1] as string | null,
										owner_email: args[2] as string | null,
										hub_url: args[3] as string,
										host_key: args[4] as string,
										status: args[5] as typeof state.lane.status,
										toolkit_profile_json: args[6] as string,
										allowed_tool_prefixes_json: args[7] as string,
										metadata_json: args[8] as string,
									};
								}
								return {};
							}
							if (sql.includes('UPDATE partner_auth_access_lanes') && sql.includes('WHERE id = ? AND identity_user_id = ?')) {
								if (state.lane.id === args[9] && state.lane.identity_user_id === args[10]) {
									state.lane = {
										...state.lane,
										display_name: args[0] as string,
										identity_user_id: args[1] as string | null,
										owner_email: args[2] as string | null,
										hub_url: args[3] as string,
										host_key: args[4] as string,
										status: args[5] as typeof state.lane.status,
										toolkit_profile_json: args[6] as string,
										allowed_tool_prefixes_json: args[7] as string,
										metadata_json: args[8] as string,
									};
								}
								return {};
							}
							if (sql.includes('UPDATE partner_auth_clients')) {
								state.client = {
									...state.client,
									owner_email: args[0] as string,
									identity_account_id: args[1] as string,
									identity_user_id: args[2] as string,
									identity_tenant_id: args[3] as string,
									metadata_json: args[4] as string,
								};
								return {};
							}
							if (sql.includes('INSERT INTO agency_identity_seeds')) {
								state.identitySeed = buildIdentitySeedRow({
									normalized_email: args[0] as string,
									auth_subject: (args[1] as string | null) ?? null,
									account_id: args[2] as string,
									tenant_id: args[3] as string,
									workspace_account_id: (args[4] as string | null) ?? null,
									service_tier: args[5] as string,
									managed_bearer_allowed: Number(args[6] ?? 0),
									org_membership_active: Number(args[7] ?? 0),
									service_entitled: Number(args[8] ?? 0),
									policy_accepted: Number(args[9] ?? 0),
									contract_active: Number(args[10] ?? 0),
									billing_active: Number(args[11] ?? 0),
									status: args[12] as string,
									invited_at: (args[13] as string | null) ?? null,
									bound_at: (args[14] as string | null) ?? null,
									metadata_json: args[15] as string,
								});
								return {};
							}
							if (sql.includes('DELETE FROM agency_identity_seeds')) {
								if (state.identitySeed?.normalized_email === args[0]) {
									state.identitySeed = null;
								}
								return {};
							}
							if (sql.includes('INSERT INTO agency_mcp_entitlements')) {
								state.entitlement = buildEntitlementRow({
									auth_subject: args[0] as string,
									auth_email: (args[1] as string | null) ?? null,
									account_id: (args[2] as string | null) ?? null,
									tenant_id: (args[3] as string | null) ?? null,
									workspace_account_id: (args[4] as string | null) ?? null,
									service_tier: args[5] as string,
									managed_bearer_allowed: Number(args[6] ?? 0),
									org_membership_active: Number(args[7] ?? 0),
									service_entitled: Number(args[8] ?? 0),
									policy_accepted: Number(args[9] ?? 0),
									contract_active: Number(args[10] ?? 0),
									billing_active: Number(args[11] ?? 0),
									denial_reason: (args[12] as string | null) ?? null,
									metadata_json: args[13] as string,
								});
								return {};
							}
							if (sql.includes('DELETE FROM agency_mcp_entitlements')) {
								if (state.entitlement?.auth_subject === args[0]) {
									state.entitlement = null;
								}
								return {};
							}
							return {};
						},
					};
				},
			};
		},
	};
}

test('agency session user can claim an authorized prospect and receive blocked entitlement context', async () => {
	const state = createState();
	const db = createFakeDb(state);

	const handler = createPartnerProspectClaimPostHandler({
		partnerKey: 'half-dozen',
		buildAgencyEntitlementSnapshot: (_row, decision) => ({
			service_tier: 'policy_os_trial',
			managed_bearer_allowed: Boolean(decision?.checks.managed_bearer_allowed),
			org_membership_active: Boolean(decision?.checks.org_membership_active),
			service_entitled: Boolean(decision?.checks.service_entitled),
			policy_accepted: Boolean(decision?.checks.policy_accepted),
			contract_active: Boolean(decision?.checks.contract_active),
			billing_active: Boolean(decision?.checks.billing_active),
			approved_exception: {
				present: false,
				type: null,
				allowed_scope: null,
				graduation_target: 'policy_os_trial',
				review_by: null,
			},
		}),
		evaluateAgencyMcpEntitlement: () => ({
			allowed: false,
			reason: 'service_not_entitled',
			account_id: 'acct_acme',
			tenant_id: 'acme',
			checks: {
				managed_bearer_allowed: false,
				org_membership_active: true,
				service_entitled: false,
				policy_accepted: false,
				contract_active: false,
				billing_active: false,
			},
		}),
		findAgencyIdentitySeedByEmail: async () => null,
		findAgencyMcpEntitlementByAuthSubject: async () => null,
		getPartnerAccessLaneBySlug: async () => state.lane,
		getPartnerClientBySlug: async () => state.client,
		isProspectGraduated: (metadata) => metadata.lifecycle_stage === 'active' || metadata.lifecycle_stage === 'graduated',
		isProspectRecord: (metadata) => metadata.onboarding_mode === 'prospect' || metadata.lifecycle_stage === 'prospect',
		normalizeAgencyServiceTier: (value, fallback = 'mcp_only') => (value?.includes('trial') ? 'policy_os_trial' : fallback),
		normalizeEmail: (raw) => raw?.trim().toLowerCase() ?? null,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		reconcileAgencyMcpEntitlement: async () => ({
			auth_subject: 'auth0|claimant',
			account_id: 'acct_acme',
			tenant_id: 'acme',
			workspace_account_id: 'acct_acme',
			service_tier: 'policy_os_trial',
			managed_bearer_allowed: 0,
			org_membership_active: 1,
			service_entitled: 0,
			policy_accepted: 0,
			contract_active: 0,
			billing_active: 0,
			metadata_json: '{}',
		}),
		requireAgencySessionUser: async () => ({
			id: 'auth0|claimant',
			email: 'owner@example.com',
			source: 'io',
		}),
		upsertAgencyIdentitySeed: async (_db, input) => {
			state.seeds.push(input as Record<string, unknown>);
			return {
				normalized_email: input.authEmail.toLowerCase(),
				auth_subject: input.authSubject ?? null,
				account_id: input.accountId,
				tenant_id: input.tenantId,
				workspace_account_id: input.workspaceAccountId ?? null,
				service_tier: input.serviceTier ?? 'mcp_only',
				status: input.status ?? 'seeded',
			};
		},
		isHttpError: (error): error is { status: number; code?: string; message?: string; body?: { message?: string } } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		request: new Request('https://example.com/api/me/prospects/acme/claim', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		params: { slug: 'acme' },
		platform: { env: { DB: db } },
	} as any);

	assert.equal(response.status, 200);
	assert.equal(state.client.identity_user_id, 'auth0|claimant');
	assert.equal(state.lane.identity_user_id, 'auth0|claimant');
	assert.equal(state.seeds.length, 1);
	assert.equal(state.seeds[0]?.status, 'prospect_claimed');

	const payload = await response.json();
	assert.equal(payload.prospect_claim.status, 'claimed');
	assert.equal(payload.prospect_claim.authorized_via, 'owner_email');
	assert.equal(payload.client.identity_user_id, 'auth0|claimant');
	assert.equal(payload.identity_seed.service_tier, 'policy_os_trial');
	assert.equal(payload.entitlement.decision.allowed, false);
	assert.equal(payload.entitlement.decision.reason, 'service_not_entitled');
});

test('agency session user cannot claim an unauthorized prospect', async () => {
	const state = createState();
	const db = createFakeDb(state);

	const handler = createPartnerProspectClaimPostHandler({
		partnerKey: 'half-dozen',
		buildAgencyEntitlementSnapshot: () => {
			throw new Error('buildAgencyEntitlementSnapshot should not be called');
		},
		evaluateAgencyMcpEntitlement: () => {
			throw new Error('evaluateAgencyMcpEntitlement should not be called');
		},
		findAgencyIdentitySeedByEmail: async () => null,
		findAgencyMcpEntitlementByAuthSubject: async () => null,
		getPartnerAccessLaneBySlug: async () => state.lane,
		getPartnerClientBySlug: async () => state.client,
		isProspectGraduated: () => false,
		isProspectRecord: () => true,
		normalizeAgencyServiceTier: (value, fallback = 'mcp_only') => value ?? fallback,
		normalizeEmail: (raw) => raw?.trim().toLowerCase() ?? null,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		reconcileAgencyMcpEntitlement: async () => {
			throw new Error('reconcileAgencyMcpEntitlement should not be called');
		},
		requireAgencySessionUser: async () => ({
			id: 'auth0|other',
			email: 'other@example.com',
			source: 'io',
		}),
		upsertAgencyIdentitySeed: async () => {
			throw new Error('upsertAgencyIdentitySeed should not be called');
		},
		isHttpError: (error): error is { status: number; code?: string; message?: string; body?: { message?: string } } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		request: new Request('https://example.com/api/me/prospects/acme/claim', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		params: { slug: 'acme' },
		platform: { env: { DB: db } },
	} as any);

	assert.equal(response.status, 403);
	const payload = await response.json();
	assert.equal(payload.error, 'claim_not_authorized');
});

test('agency session user cannot claim a prospect when the email is already seeded elsewhere', async () => {
	const state = createState();
	const db = createFakeDb(state);

	const handler = createPartnerProspectClaimPostHandler({
		partnerKey: 'half-dozen',
		buildAgencyEntitlementSnapshot: () => {
			throw new Error('buildAgencyEntitlementSnapshot should not be called');
		},
		evaluateAgencyMcpEntitlement: () => {
			throw new Error('evaluateAgencyMcpEntitlement should not be called');
		},
		findAgencyIdentitySeedByEmail: async () => ({
			normalized_email: 'owner@example.com',
			auth_subject: 'auth0|different',
			account_id: 'acct_other',
			tenant_id: 'tenant_other',
			workspace_account_id: 'acct_other',
			service_tier: 'policy_os_trial',
			status: 'bound',
		}),
		findAgencyMcpEntitlementByAuthSubject: async () => null,
		getPartnerAccessLaneBySlug: async () => state.lane,
		getPartnerClientBySlug: async () => state.client,
		isProspectGraduated: () => false,
		isProspectRecord: () => true,
		normalizeAgencyServiceTier: (value, fallback = 'mcp_only') => value ?? fallback,
		normalizeEmail: (raw) => raw?.trim().toLowerCase() ?? null,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		reconcileAgencyMcpEntitlement: async () => {
			throw new Error('reconcileAgencyMcpEntitlement should not be called');
		},
		requireAgencySessionUser: async () => ({
			id: 'auth0|claimant',
			email: 'owner@example.com',
			source: 'io',
		}),
		upsertAgencyIdentitySeed: async () => {
			throw new Error('upsertAgencyIdentitySeed should not be called');
		},
		isHttpError: (error): error is { status: number; code?: string; message?: string; body?: { message?: string } } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		request: new Request('https://example.com/api/me/prospects/acme/claim', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		params: { slug: 'acme' },
		platform: { env: { DB: db } },
	} as any);

	assert.equal(response.status, 409);
	const payload = await response.json();
	assert.equal(payload.error, 'identity_seed_conflict');
});

test('agency session user can claim through prospect_onboarding.allowed_claim_emails', async () => {
	const state = createState();
	state.client = {
		...state.client,
		owner_email: 'owner@example.com',
		metadata_json:
			'{"onboarding_mode":"prospect","lifecycle_stage":"prospect","prospect_onboarding":{"stage":"prospect","graduation_target":"policy_os_trial","allowed_claim_emails":["ops@example.com"]}}',
	};
	const db = createFakeDb(state);

	const handler = createPartnerProspectClaimPostHandler({
		partnerKey: 'half-dozen',
		buildAgencyEntitlementSnapshot: (_row, decision) => ({
			service_tier: 'policy_os_trial',
			managed_bearer_allowed: Boolean(decision?.checks.managed_bearer_allowed),
			org_membership_active: Boolean(decision?.checks.org_membership_active),
			service_entitled: Boolean(decision?.checks.service_entitled),
			policy_accepted: Boolean(decision?.checks.policy_accepted),
			contract_active: Boolean(decision?.checks.contract_active),
			billing_active: Boolean(decision?.checks.billing_active),
			approved_exception: {
				present: false,
				type: null,
				allowed_scope: null,
				graduation_target: 'policy_os_trial',
				review_by: null,
			},
		}),
		evaluateAgencyMcpEntitlement: () => ({
			allowed: false,
			reason: 'service_not_entitled',
			account_id: 'acct_acme',
			tenant_id: 'acme',
			checks: {
				managed_bearer_allowed: false,
				org_membership_active: true,
				service_entitled: false,
				policy_accepted: false,
				contract_active: false,
				billing_active: false,
			},
		}),
		findAgencyIdentitySeedByEmail: async () => null,
		findAgencyMcpEntitlementByAuthSubject: async () => null,
		getPartnerAccessLaneBySlug: async () => state.lane,
		getPartnerClientBySlug: async () => state.client,
		isProspectGraduated: (metadata) => metadata.lifecycle_stage === 'active' || metadata.lifecycle_stage === 'graduated',
		isProspectRecord: (metadata) => metadata.onboarding_mode === 'prospect' || metadata.lifecycle_stage === 'prospect',
		normalizeAgencyServiceTier: (value, fallback = 'mcp_only') => (value?.includes('trial') ? 'policy_os_trial' : fallback),
		normalizeEmail: (raw) => raw?.trim().toLowerCase() ?? null,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		reconcileAgencyMcpEntitlement: async () => ({
			auth_subject: 'auth0|claimant',
			account_id: 'acct_acme',
			tenant_id: 'acme',
			workspace_account_id: 'acct_acme',
			service_tier: 'policy_os_trial',
			managed_bearer_allowed: 0,
			org_membership_active: 1,
			service_entitled: 0,
			policy_accepted: 0,
			contract_active: 0,
			billing_active: 0,
			metadata_json: '{}',
		}),
		requireAgencySessionUser: async () => ({
			id: 'auth0|ops',
			email: 'ops@example.com',
			source: 'io',
		}),
		upsertAgencyIdentitySeed: async (_db, input) => {
			state.seeds.push(input as Record<string, unknown>);
			return {
				normalized_email: input.authEmail.toLowerCase(),
				auth_subject: input.authSubject ?? null,
				account_id: input.accountId,
				tenant_id: input.tenantId,
				workspace_account_id: input.workspaceAccountId ?? null,
				service_tier: input.serviceTier ?? 'mcp_only',
				status: input.status ?? 'seeded',
			};
		},
		isHttpError: (error): error is { status: number; code?: string; message?: string; body?: { message?: string } } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		request: new Request('https://example.com/api/me/prospects/acme/claim', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		params: { slug: 'acme' },
		platform: { env: { DB: db } },
	} as any);

	assert.equal(response.status, 200);
	const payload = await response.json();
	assert.equal(payload.prospect_claim.authorized_via, 'claim_emails');
	assert.equal(payload.client.identity_user_id, 'auth0|ops');
});

test('agency session user cannot claim across a manual entitlement override for another account', async () => {
	const state = createState();
	const db = createFakeDb(state);

	const handler = createPartnerProspectClaimPostHandler({
		partnerKey: 'half-dozen',
		buildAgencyEntitlementSnapshot: () => {
			throw new Error('buildAgencyEntitlementSnapshot should not be called');
		},
		evaluateAgencyMcpEntitlement: () => {
			throw new Error('evaluateAgencyMcpEntitlement should not be called');
		},
		findAgencyIdentitySeedByEmail: async () => null,
		findAgencyMcpEntitlementByAuthSubject: async () => ({
			auth_subject: 'auth0|claimant',
			account_id: 'acct_other',
			tenant_id: 'other',
			workspace_account_id: 'acct_other',
			service_tier: 'policy_os_trial',
			managed_bearer_allowed: 0,
			org_membership_active: 1,
			service_entitled: 1,
			policy_accepted: 1,
			contract_active: 1,
			billing_active: 1,
			metadata_json: '{"manual_override":true}',
		}),
		getPartnerAccessLaneBySlug: async () => state.lane,
		getPartnerClientBySlug: async () => state.client,
		isProspectGraduated: () => false,
		isProspectRecord: () => true,
		normalizeAgencyServiceTier: (value, fallback = 'mcp_only') => value ?? fallback,
		normalizeEmail: (raw) => raw?.trim().toLowerCase() ?? null,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		reconcileAgencyMcpEntitlement: async () => {
			throw new Error('reconcileAgencyMcpEntitlement should not be called');
		},
		requireAgencySessionUser: async () => ({
			id: 'auth0|claimant',
			email: 'owner@example.com',
			source: 'io',
		}),
		upsertAgencyIdentitySeed: async () => {
			throw new Error('upsertAgencyIdentitySeed should not be called');
		},
		isHttpError: (error): error is { status: number; code?: string; message?: string; body?: { message?: string } } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		request: new Request('https://example.com/api/me/prospects/acme/claim', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		params: { slug: 'acme' },
		platform: { env: { DB: db } },
	} as any);

	assert.equal(response.status, 409);
	const payload = await response.json();
	assert.equal(payload.error, 'manual_override_conflict');
});

test('agency session user cannot claim a prospect lane that is paused', async () => {
	const state = createState();
	state.client = {
		...state.client,
		status: 'paused',
	};
	state.lane = {
		...state.lane,
		status: 'paused',
	};
	const db = createFakeDb(state);

	const handler = createPartnerProspectClaimPostHandler({
		partnerKey: 'half-dozen',
		buildAgencyEntitlementSnapshot: () => {
			throw new Error('buildAgencyEntitlementSnapshot should not be called');
		},
		evaluateAgencyMcpEntitlement: () => {
			throw new Error('evaluateAgencyMcpEntitlement should not be called');
		},
		findAgencyIdentitySeedByEmail: async () => null,
		findAgencyMcpEntitlementByAuthSubject: async () => null,
		getPartnerAccessLaneBySlug: async () => state.lane,
		getPartnerClientBySlug: async () => state.client,
		isProspectGraduated: () => false,
		isProspectRecord: () => true,
		normalizeAgencyServiceTier: (value, fallback = 'mcp_only') => value ?? fallback,
		normalizeEmail: (raw) => raw?.trim().toLowerCase() ?? null,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		reconcileAgencyMcpEntitlement: async () => {
			throw new Error('reconcileAgencyMcpEntitlement should not be called');
		},
		requireAgencySessionUser: async () => ({
			id: 'auth0|claimant',
			email: 'owner@example.com',
			source: 'io',
		}),
		upsertAgencyIdentitySeed: async () => {
			throw new Error('upsertAgencyIdentitySeed should not be called');
		},
		isHttpError: (error): error is { status: number; code?: string; message?: string; body?: { message?: string } } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		request: new Request('https://example.com/api/me/prospects/acme/claim', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		params: { slug: 'acme' },
		platform: { env: { DB: db } },
	} as any);

	assert.equal(response.status, 409);
	const payload = await response.json();
	assert.equal(payload.error, 'prospect_unavailable');
	assert.match(payload.message, /client status is paused/i);
});

test('agency session user can repair a partial prospect claim binding', async () => {
	const state = createState();
	state.client = {
		...state.client,
		identity_account_id: 'acct_acme',
		identity_user_id: 'auth0|claimant',
		identity_tenant_id: 'acme',
	};
	const db = createFakeDb(state);

	const handler = createPartnerProspectClaimPostHandler({
		partnerKey: 'half-dozen',
		buildAgencyEntitlementSnapshot: (_row, decision) => ({
			service_tier: 'policy_os_trial',
			managed_bearer_allowed: Boolean(decision?.checks.managed_bearer_allowed),
			org_membership_active: Boolean(decision?.checks.org_membership_active),
			service_entitled: Boolean(decision?.checks.service_entitled),
			policy_accepted: Boolean(decision?.checks.policy_accepted),
			contract_active: Boolean(decision?.checks.contract_active),
			billing_active: Boolean(decision?.checks.billing_active),
			approved_exception: {
				present: false,
				type: null,
				allowed_scope: null,
				graduation_target: 'policy_os_trial',
				review_by: null,
			},
		}),
		evaluateAgencyMcpEntitlement: () => ({
			allowed: false,
			reason: 'service_not_entitled',
			account_id: 'acct_acme',
			tenant_id: 'acme',
			checks: {
				managed_bearer_allowed: false,
				org_membership_active: true,
				service_entitled: false,
				policy_accepted: false,
				contract_active: false,
				billing_active: false,
			},
		}),
		findAgencyIdentitySeedByEmail: async () => null,
		findAgencyMcpEntitlementByAuthSubject: async () => null,
		getPartnerAccessLaneBySlug: async () => state.lane,
		getPartnerClientBySlug: async () => state.client,
		isProspectGraduated: (metadata) => metadata.lifecycle_stage === 'active' || metadata.lifecycle_stage === 'graduated',
		isProspectRecord: (metadata) => metadata.onboarding_mode === 'prospect' || metadata.lifecycle_stage === 'prospect',
		normalizeAgencyServiceTier: (value, fallback = 'mcp_only') => (value?.includes('trial') ? 'policy_os_trial' : fallback),
		normalizeEmail: (raw) => raw?.trim().toLowerCase() ?? null,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		reconcileAgencyMcpEntitlement: async () => ({
			auth_subject: 'auth0|claimant',
			account_id: 'acct_acme',
			tenant_id: 'acme',
			workspace_account_id: 'acct_acme',
			service_tier: 'policy_os_trial',
			managed_bearer_allowed: 0,
			org_membership_active: 1,
			service_entitled: 0,
			policy_accepted: 0,
			contract_active: 0,
			billing_active: 0,
			metadata_json: '{}',
		}),
		requireAgencySessionUser: async () => ({
			id: 'auth0|claimant',
			email: 'owner@example.com',
			source: 'io',
		}),
		upsertAgencyIdentitySeed: async (_db, input) => {
			state.seeds.push(input as Record<string, unknown>);
			return {
				normalized_email: input.authEmail.toLowerCase(),
				auth_subject: input.authSubject ?? null,
				account_id: input.accountId,
				tenant_id: input.tenantId,
				workspace_account_id: input.workspaceAccountId ?? null,
				service_tier: input.serviceTier ?? 'mcp_only',
				status: input.status ?? 'seeded',
			};
		},
		isHttpError: (error): error is { status: number; code?: string; message?: string; body?: { message?: string } } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		request: new Request('https://example.com/api/me/prospects/acme/claim', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		params: { slug: 'acme' },
		platform: { env: { DB: db } },
	} as any);

	assert.equal(response.status, 200);
	assert.equal(state.client.identity_user_id, 'auth0|claimant');
	assert.equal(state.lane.identity_user_id, 'auth0|claimant');
	assert.equal(state.seeds.length, 1);

	const payload = await response.json();
	assert.equal(payload.prospect_claim.status, 'claimed');
	assert.equal(payload.lane.identity_user_id, 'auth0|claimant');
});

test('concurrent prospect claims produce one winner and a fully bound workspace', async () => {
	const state = createState();
	state.client = {
		...state.client,
		metadata_json:
			'{"onboarding_mode":"prospect","lifecycle_stage":"prospect","prospect_onboarding":{"stage":"prospect","graduation_target":"policy_os_trial","allowed_claim_emails":["alice@example.com","bob@example.com"]}}',
	};
	state.lane = {
		...state.lane,
		metadata_json:
			'{"onboarding_mode":"prospect","lifecycle_stage":"prospect","prospect_onboarding":{"stage":"prospect","allowed_claim_emails":["alice@example.com","bob@example.com"]}}',
	};

	const initialLaneBarrier = createBarrier(2);
	const aliceClientUpdated = createDeferred<void>();
	const allowAliceLaneUpdate = createDeferred<void>();
	let initialLaneReadCount = 0;
	const identitySeeds = new Map<string, ReturnType<typeof buildIdentitySeedRow>>();
	const entitlements = new Map<string, ReturnType<typeof buildEntitlementRow>>();
	const db = createFakeDb(state, {
		beforeClientClaimEvaluate: async (userId) => {
			if (userId === 'auth0|bob') {
				await aliceClientUpdated.promise;
			}
		},
		afterClientClaimUpdate: async (userId, updated) => {
			if (userId === 'auth0|alice' && updated) {
				aliceClientUpdated.resolve();
				await allowAliceLaneUpdate.promise;
			}
		},
	});

	function createHandler(userId: string, email: string) {
		return createPartnerProspectClaimPostHandler({
			partnerKey: 'half-dozen',
			buildAgencyEntitlementSnapshot: (_row, decision) => ({
				service_tier: 'policy_os_trial',
				managed_bearer_allowed: Boolean(decision?.checks.managed_bearer_allowed),
				org_membership_active: Boolean(decision?.checks.org_membership_active),
				service_entitled: Boolean(decision?.checks.service_entitled),
				policy_accepted: Boolean(decision?.checks.policy_accepted),
				contract_active: Boolean(decision?.checks.contract_active),
				billing_active: Boolean(decision?.checks.billing_active),
				approved_exception: {
					present: false,
					type: null,
					allowed_scope: null,
					graduation_target: 'policy_os_trial',
					review_by: null,
				},
			}),
			evaluateAgencyMcpEntitlement: () => ({
				allowed: false,
				reason: 'service_not_entitled',
				account_id: 'acct_acme',
				tenant_id: 'acme',
				checks: {
					managed_bearer_allowed: false,
					org_membership_active: true,
					service_entitled: false,
					policy_accepted: false,
					contract_active: false,
					billing_active: false,
				},
			}),
			findAgencyIdentitySeedByEmail: async (_db, authEmail) =>
				authEmail ? identitySeeds.get(authEmail.trim().toLowerCase()) ?? null : null,
			findAgencyMcpEntitlementByAuthSubject: async (_db, authSubject) =>
				entitlements.get(authSubject) ?? null,
			getPartnerAccessLaneBySlug: async () => {
				if (initialLaneReadCount < 2) {
					initialLaneReadCount += 1;
					await initialLaneBarrier.wait();
				}
				return { ...state.lane };
			},
			getPartnerClientBySlug: async () => ({ ...state.client }),
			isProspectGraduated: (metadata) => metadata.lifecycle_stage === 'active' || metadata.lifecycle_stage === 'graduated',
			isProspectRecord: (metadata) => metadata.onboarding_mode === 'prospect' || metadata.lifecycle_stage === 'prospect',
			normalizeAgencyServiceTier: (value, fallback = 'mcp_only') => (value?.includes('trial') ? 'policy_os_trial' : fallback),
			normalizeEmail: (raw) => raw?.trim().toLowerCase() ?? null,
			normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
			normalizePartnerSlug: (value) => value.trim().toLowerCase(),
			parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
			parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
			parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
			reconcileAgencyMcpEntitlement: async (_db, input) => {
				const row = buildEntitlementRow({
					auth_subject: input.authSubject,
					auth_email: input.authEmail ?? null,
					account_id: input.accountId ?? null,
					tenant_id: input.tenantId ?? null,
					workspace_account_id: input.workspaceAccountId ?? null,
					service_tier: input.serviceTier ?? 'mcp_only',
					managed_bearer_allowed: 0,
					org_membership_active: 1,
					service_entitled: 0,
					policy_accepted: 0,
					contract_active: 0,
					billing_active: 0,
					metadata_json: JSON.stringify(input.metadata ?? {}),
				});
				entitlements.set(input.authSubject, row);
				return row;
			},
			requireAgencySessionUser: async () => ({
				id: userId,
				email,
				source: 'io',
			}),
			upsertAgencyIdentitySeed: async (_db, input) => {
				const row = buildIdentitySeedRow({
					normalized_email: input.authEmail.toLowerCase(),
					auth_subject: input.authSubject ?? null,
					account_id: input.accountId,
					tenant_id: input.tenantId,
					workspace_account_id: input.workspaceAccountId ?? null,
					service_tier: input.serviceTier ?? 'mcp_only',
					managed_bearer_allowed: input.managedBearerAllowed === false ? 0 : 1,
					org_membership_active: input.orgMembershipActive === false ? 0 : 1,
					service_entitled: input.serviceEntitled === false ? 0 : 1,
					policy_accepted: input.policyAccepted === true ? 1 : 0,
					contract_active: input.contractActive === false ? 0 : 1,
					billing_active: input.billingActive === false ? 0 : 1,
					status: input.status ?? 'seeded',
					bound_at: input.boundAt ?? null,
					metadata_json: JSON.stringify(input.metadata ?? {}),
				});
				identitySeeds.set(row.normalized_email, row);
				state.seeds.push(input as Record<string, unknown>);
				return row;
			},
			isHttpError: (error): error is { status: number; code?: string; message?: string; body?: { message?: string } } =>
				Boolean(error && typeof error === 'object' && 'status' in error),
		});
	}

	const aliceHandler = createHandler('auth0|alice', 'alice@example.com');
	const bobHandler = createHandler('auth0|bob', 'bob@example.com');
	const aliceResponsePromise = aliceHandler({
		cookies: {},
		request: new Request('https://example.com/api/me/prospects/acme/claim', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		params: { slug: 'acme' },
		platform: { env: { DB: db } },
	} as any);
	const bobResponsePromise = bobHandler({
		cookies: {},
		request: new Request('https://example.com/api/me/prospects/acme/claim', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		params: { slug: 'acme' },
		platform: { env: { DB: db } },
	} as any);

	await aliceClientUpdated.promise;
	const bobResponse = await bobResponsePromise;
	allowAliceLaneUpdate.resolve();
	const aliceResponse = await aliceResponsePromise;

	assert.equal(aliceResponse.status, 200);
	assert.equal(bobResponse.status, 409);
	assert.equal(state.client.identity_user_id, 'auth0|alice');
	assert.equal(state.lane.identity_user_id, 'auth0|alice');
	assert.equal(identitySeeds.size, 1);
	assert.equal(entitlements.size, 1);
	assert.equal(state.seeds.length, 1);
	assert.equal(identitySeeds.get('alice@example.com')?.auth_subject, 'auth0|alice');
	assert.equal(entitlements.get('auth0|alice')?.auth_subject, 'auth0|alice');

	const alicePayload = await aliceResponse.json();
	assert.equal(alicePayload.prospect_claim.claimant_auth_subject, 'auth0|alice');

	const bobPayload = await bobResponse.json();
	assert.equal(bobPayload.error, 'already_claimed');
});

test('agency session user claim rolls back binding changes when entitlement reconciliation fails', async () => {
	const state = createState();
	const db = createFakeDb(state);

	const handler = createPartnerProspectClaimPostHandler({
		partnerKey: 'half-dozen',
		buildAgencyEntitlementSnapshot: () => {
			throw new Error('buildAgencyEntitlementSnapshot should not be called');
		},
		evaluateAgencyMcpEntitlement: () => {
			throw new Error('evaluateAgencyMcpEntitlement should not be called');
		},
		findAgencyIdentitySeedByEmail: async () => null,
		findAgencyMcpEntitlementByAuthSubject: async () => null,
		getPartnerAccessLaneBySlug: async () => state.lane,
		getPartnerClientBySlug: async () => state.client,
		isProspectGraduated: (metadata) => metadata.lifecycle_stage === 'active' || metadata.lifecycle_stage === 'graduated',
		isProspectRecord: (metadata) => metadata.onboarding_mode === 'prospect' || metadata.lifecycle_stage === 'prospect',
		normalizeAgencyServiceTier: (value, fallback = 'mcp_only') => (value?.includes('trial') ? 'policy_os_trial' : fallback),
		normalizeEmail: (raw) => raw?.trim().toLowerCase() ?? null,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		reconcileAgencyMcpEntitlement: async () => {
			state.entitlement = buildEntitlementRow({
				auth_subject: 'auth0|claimant',
				auth_email: 'owner@example.com',
				account_id: 'acct_acme',
				tenant_id: 'acme',
				workspace_account_id: 'acct_acme',
				metadata_json: '{"source":"partner_prospect_claim"}',
			});
			throw new Error('reconcile failed');
		},
		requireAgencySessionUser: async () => ({
			id: 'auth0|claimant',
			email: 'owner@example.com',
			source: 'io',
		}),
		upsertAgencyIdentitySeed: async (_db, input) => {
			state.seeds.push(input as Record<string, unknown>);
			state.identitySeed = buildIdentitySeedRow({
				normalized_email: input.authEmail.toLowerCase(),
				auth_subject: input.authSubject ?? null,
				account_id: input.accountId,
				tenant_id: input.tenantId,
				workspace_account_id: input.workspaceAccountId ?? null,
				service_tier: input.serviceTier ?? 'mcp_only',
				managed_bearer_allowed: input.managedBearerAllowed === false ? 0 : 1,
				org_membership_active: input.orgMembershipActive === false ? 0 : 1,
				service_entitled: input.serviceEntitled === false ? 0 : 1,
				policy_accepted: input.policyAccepted === true ? 1 : 0,
				contract_active: input.contractActive === false ? 0 : 1,
				billing_active: input.billingActive === false ? 0 : 1,
				status: input.status ?? 'seeded',
				bound_at: input.boundAt ?? null,
				metadata_json: JSON.stringify(input.metadata ?? {}),
			});
			return state.identitySeed;
		},
		isHttpError: (error): error is { status: number; code?: string; message?: string; body?: { message?: string } } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		request: new Request('https://example.com/api/me/prospects/acme/claim', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		params: { slug: 'acme' },
		platform: { env: { DB: db } },
	} as any);

	assert.equal(response.status, 500);
	assert.equal(state.client.identity_user_id, null);
	assert.equal(state.lane.identity_user_id, null);
	assert.equal(state.identitySeed, null);
	assert.equal(state.entitlement, null);

	const payload = await response.json();
	assert.equal(payload.error, 'internal_error');
	assert.match(payload.message, /reconcile failed/i);
});

test('agency session user claim restores prior entitlement artifacts when a fully claimed workspace errors', async () => {
	const state = createState();
	state.client = {
		...state.client,
		identity_account_id: 'acct_acme',
		identity_user_id: 'auth0|claimant',
		identity_tenant_id: 'acme',
	};
	state.lane = {
		...state.lane,
		identity_user_id: 'auth0|claimant',
	};
	state.identitySeed = buildIdentitySeedRow({
		account_id: 'acct_acme',
		tenant_id: 'acme',
		workspace_account_id: 'acct_acme',
		service_tier: 'mcp_only',
		status: 'bound',
		metadata_json: '{"existing":true}',
	});
	state.entitlement = buildEntitlementRow({
		account_id: 'acct_acme',
		tenant_id: 'acme',
		workspace_account_id: 'acct_acme',
		service_tier: 'mcp_only',
		managed_bearer_allowed: 1,
		org_membership_active: 1,
		service_entitled: 1,
		policy_accepted: 1,
		contract_active: 1,
		billing_active: 1,
		metadata_json: '{"existing":true}',
	});
	const db = createFakeDb(state);

	const handler = createPartnerProspectClaimPostHandler({
		partnerKey: 'half-dozen',
		buildAgencyEntitlementSnapshot: () => {
			throw new Error('buildAgencyEntitlementSnapshot should not be called');
		},
		evaluateAgencyMcpEntitlement: () => {
			throw new Error('evaluateAgencyMcpEntitlement should not be called');
		},
		findAgencyIdentitySeedByEmail: async () => state.identitySeed,
		findAgencyMcpEntitlementByAuthSubject: async () => state.entitlement,
		getPartnerAccessLaneBySlug: async () => state.lane,
		getPartnerClientBySlug: async () => state.client,
		isProspectGraduated: (metadata) => metadata.lifecycle_stage === 'active' || metadata.lifecycle_stage === 'graduated',
		isProspectRecord: (metadata) => metadata.onboarding_mode === 'prospect' || metadata.lifecycle_stage === 'prospect',
		normalizeAgencyServiceTier: (value, fallback = 'mcp_only') => (value?.includes('trial') ? 'policy_os_trial' : fallback),
		normalizeEmail: (raw) => raw?.trim().toLowerCase() ?? null,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		reconcileAgencyMcpEntitlement: async (dbArg, input) => {
			state.entitlement = buildEntitlementRow({
				auth_subject: input.authSubject,
				auth_email: input.authEmail ?? null,
				account_id: input.accountId ?? null,
				tenant_id: input.tenantId ?? null,
				workspace_account_id: input.workspaceAccountId ?? null,
				service_tier: input.serviceTier ?? 'mcp_only',
				managed_bearer_allowed: 0,
				org_membership_active: 1,
				service_entitled: 0,
				policy_accepted: 0,
				contract_active: 0,
				billing_active: 0,
				metadata_json: JSON.stringify(input.metadata ?? {}),
			});
			void dbArg;
			throw new Error('reconcile failed');
		},
		requireAgencySessionUser: async () => ({
			id: 'auth0|claimant',
			email: 'owner@example.com',
			source: 'io',
		}),
		upsertAgencyIdentitySeed: async (_db, input) => {
			state.identitySeed = buildIdentitySeedRow({
				normalized_email: input.authEmail.toLowerCase(),
				auth_subject: input.authSubject ?? null,
				account_id: input.accountId,
				tenant_id: input.tenantId,
				workspace_account_id: input.workspaceAccountId ?? null,
				service_tier: input.serviceTier ?? 'mcp_only',
				managed_bearer_allowed: input.managedBearerAllowed === false ? 0 : 1,
				org_membership_active: input.orgMembershipActive === false ? 0 : 1,
				service_entitled: input.serviceEntitled === false ? 0 : 1,
				policy_accepted: input.policyAccepted === true ? 1 : 0,
				contract_active: input.contractActive === false ? 0 : 1,
				billing_active: input.billingActive === false ? 0 : 1,
				status: input.status ?? 'seeded',
				bound_at: input.boundAt ?? null,
				metadata_json: JSON.stringify(input.metadata ?? {}),
			});
			return state.identitySeed;
		},
		isHttpError: (error): error is { status: number; code?: string; message?: string; body?: { message?: string } } =>
			Boolean(error && typeof error === 'object' && 'status' in error),
	});

	const response = await handler({
		cookies: {},
		request: new Request('https://example.com/api/me/prospects/acme/claim', {
			method: 'POST',
			body: JSON.stringify({}),
		}),
		params: { slug: 'acme' },
		platform: { env: { DB: db } },
	} as any);

	assert.equal(response.status, 500);
	assert.equal(state.client.identity_user_id, 'auth0|claimant');
	assert.equal(state.lane.identity_user_id, 'auth0|claimant');
	assert.equal(state.identitySeed?.account_id, 'acct_acme');
	assert.equal(state.identitySeed?.tenant_id, 'acme');
	assert.equal(state.identitySeed?.service_tier, 'mcp_only');
	assert.equal(state.identitySeed?.status, 'bound');
	assert.equal(state.identitySeed?.metadata_json, '{"existing":true}');
	assert.equal(state.entitlement?.account_id, 'acct_acme');
	assert.equal(state.entitlement?.tenant_id, 'acme');
	assert.equal(state.entitlement?.service_tier, 'mcp_only');
	assert.equal(state.entitlement?.managed_bearer_allowed, 1);
	assert.equal(state.entitlement?.metadata_json, '{"existing":true}');

	const payload = await response.json();
	assert.equal(payload.error, 'internal_error');
	assert.match(payload.message, /reconcile failed/i);
});
