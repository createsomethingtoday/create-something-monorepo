import test from 'node:test';
import assert from 'node:assert/strict';

import { createPartnerProspectClaimPostHandler } from '../src/lib/server/partner-prospect-claim-core.ts';
import type { AgencyMcpEntitlementRow } from '../src/lib/server/mcp-entitlements.ts';

function createEntitlementRow(overrides: Partial<AgencyMcpEntitlementRow> = {}): AgencyMcpEntitlementRow {
	return {
		auth_subject: 'auth0|claimant', auth_email: 'owner@example.com', account_id: 'acct_acme', tenant_id: 'acme', workspace_account_id: 'acct_acme',
		service_tier: 'policy_os_trial', managed_bearer_allowed: 0, org_membership_active: 1, service_entitled: 0, policy_accepted: 0, contract_active: 0, billing_active: 0,
		denial_reason: 'service_not_entitled', metadata_json: '{}', created_at: '2026-03-18T00:00:00.000Z', updated_at: '2026-03-18T00:00:00.000Z',
		...overrides
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
			identity_account_id: null as string | null,
			identity_user_id: null as string | null,
			identity_tenant_id: null as string | null,
			owner_email: 'owner@example.com' as string | null,
			status: 'initialized' as 'active' | 'initialized' | 'paused' | 'sunset' | 'disabled',
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
			identity_user_id: null as string | null,
			owner_email: 'owner@example.com' as string | null,
			hub_url: 'https://prospect-acme.mcp.createsomething.agency/mcp',
			host_key: 'prospect-acme',
			status: 'initialized' as 'active' | 'initialized' | 'paused' | 'sunset' | 'disabled',
			toolkit_profile_json: '["gmail"]',
			allowed_tool_prefixes_json: '["composio-toolkit-gmail__"]',
			metadata_json: '{"onboarding_mode":"prospect","lifecycle_stage":"prospect","prospect_onboarding":{"stage":"prospect"}}',
			created_at: '2026-03-18T00:00:00.000Z',
			updated_at: '2026-03-18T00:00:00.000Z',
		},
		seeds: [] as Array<Record<string, unknown>>,
	};
}

function createFakeDb(state: ReturnType<typeof createState>) {
	return {
		prepare(sql: string) {
			return {
				bind(...args: unknown[]) {
					return {
						async run() {
							if (sql.includes('UPDATE partner_auth_clients')) {
								state.client = {
									...state.client,
									owner_email: args[0] as string,
									identity_account_id: args[1] as string,
									identity_user_id: args[2] as string,
									identity_tenant_id: args[3] as string,
									metadata_json: args[4] as string,
								};
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
		reconcileAgencyMcpEntitlement: async () => createEntitlementRow({
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
		upsertPartnerAccessLane: async (_db, input) => {
			state.lane = {
				...state.lane,
				display_name: input.displayName,
				identity_user_id: input.identityUserId,
				owner_email: input.ownerEmail,
				status: input.status,
				toolkit_profile_json: JSON.stringify(input.toolkitProfile),
				allowed_tool_prefixes_json: JSON.stringify(input.allowedToolPrefixes),
				metadata_json: JSON.stringify(input.metadata),
			};
			return state.lane;
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

	const payload = (await response.json()) as {
		prospect_claim: { status: string; authorized_via: string };
		client: { identity_user_id: string };
		identity_seed: { service_tier: string };
		entitlement: { decision: { allowed: boolean; reason: string } };
	};
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
		upsertPartnerAccessLane: async () => {
			throw new Error('upsertPartnerAccessLane should not be called');
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
	const payload = (await response.json()) as { error: string };
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
		upsertPartnerAccessLane: async () => {
			throw new Error('upsertPartnerAccessLane should not be called');
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
	const payload = (await response.json()) as { error: string };
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
		reconcileAgencyMcpEntitlement: async () => createEntitlementRow({
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
		upsertPartnerAccessLane: async (_db, input) => {
			state.lane = {
				...state.lane,
				display_name: input.displayName,
				identity_user_id: input.identityUserId,
				owner_email: input.ownerEmail,
				status: input.status,
				toolkit_profile_json: JSON.stringify(input.toolkitProfile),
				allowed_tool_prefixes_json: JSON.stringify(input.allowedToolPrefixes),
				metadata_json: JSON.stringify(input.metadata),
			};
			return state.lane;
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
	const payload = (await response.json()) as {
		prospect_claim: { authorized_via: string };
		client: { identity_user_id: string };
	};
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
		findAgencyMcpEntitlementByAuthSubject: async () => createEntitlementRow({
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
		upsertPartnerAccessLane: async () => {
			throw new Error('upsertPartnerAccessLane should not be called');
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
	const payload = (await response.json()) as { error: string };
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
		upsertPartnerAccessLane: async () => {
			throw new Error('upsertPartnerAccessLane should not be called');
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
	const payload = (await response.json()) as { error: string; message: string };
	assert.equal(payload.error, 'prospect_unavailable');
	assert.match(payload.message, /client status is paused/i);
});
