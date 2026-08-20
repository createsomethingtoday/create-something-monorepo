import test from 'node:test';
import assert from 'node:assert/strict';

import { createPartnerProspectGraduatePostHandler } from '../src/lib/server/partner-prospect-graduate-core.ts';
import type { AgencyMcpEntitlementRow } from '../src/lib/server/mcp-entitlements.ts';

function createEntitlementRow(overrides: Partial<AgencyMcpEntitlementRow> = {}): AgencyMcpEntitlementRow {
	return {
		auth_subject: 'auth0|abc', auth_email: 'owner@example.com', account_id: 'acct_identity', tenant_id: 'tenant_identity', workspace_account_id: 'acct_identity',
		service_tier: 'mcp_only', managed_bearer_allowed: 0, org_membership_active: 0, service_entitled: 0, policy_accepted: 0, contract_active: 0, billing_active: 0,
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
			metadata_json: '{"onboarding_mode":"prospect","lifecycle_stage":"prospect","prospect_onboarding":{"stage":"prospect"}}',
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
		consentInserts: [] as Array<unknown[]>,
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
									display_name: args[0] as string,
									identity_account_id: args[1] as string,
									identity_user_id: args[2] as string,
									identity_tenant_id: args[3] as string,
									owner_email: args[4] as string | null,
									status: args[5] as typeof state.client.status,
									metadata_json: args[6] as string,
								};
							} else if (sql.includes('INSERT INTO partner_auth_consents')) {
								state.consentInserts.push(args);
							}
							return {};
						},
					};
				},
			};
		},
	};
}

function entitlementDecision(allowed: boolean, reason: string) {
	return {
		allowed,
		reason,
		account_id: 'acct_identity',
		tenant_id: 'tenant_identity',
		checks: {
			managed_bearer_allowed: allowed,
			org_membership_active: allowed,
			service_entitled: allowed,
			policy_accepted: allowed,
			contract_active: allowed,
			billing_active: allowed,
		},
	};
}

test('partner prospect graduation stays blocked until entitlement is ready', async () => {
	const state = createState();
	const db = createFakeDb(state);

	const handler = createPartnerProspectGraduatePostHandler({
		partnerKey: 'half-dozen',
		buildAgencyEntitlementSnapshot: (_row, decision) => ({
			service_tier: 'mcp_only',
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
				graduation_target: null,
				review_by: null,
			},
		}),
		evaluateAgencyMcpEntitlement: () => entitlementDecision(false, 'service_not_entitled'),
		getLatestActiveConsent: async () => null,
		getPartnerAccessLaneBySlug: async () => state.lane,
		getPartnerClientBySlug: async () => state.client,
		isProspectGraduated: (metadata) => metadata.lifecycle_stage === 'active' || metadata.lifecycle_stage === 'graduated',
		isProspectRecord: (metadata) => metadata.onboarding_mode === 'prospect' || metadata.lifecycle_stage === 'prospect',
		normalizeEmail: (raw) => raw?.trim().toLowerCase() ?? null,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseOptionalIsoTimestamp: (raw) => raw?.trim() ?? null,
		randomId: (prefix) => `${prefix}_test`,
		reconcileAgencyMcpEntitlement: async () => createEntitlementRow({
			account_id: 'acct_identity',
			tenant_id: 'tenant_identity',
			service_tier: 'mcp_only',
			managed_bearer_allowed: 0,
			org_membership_active: 0,
			service_entitled: 0,
			policy_accepted: 0,
			contract_active: 0,
			billing_active: 0,
		}),
		requirePartnerAdmin: () => 'partner_admin:test',
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
		isHttpError: (error): error is { status: number; code: string; message: string } =>
			Boolean(error && typeof error === 'object' && 'status' in error && 'code' in error && 'message' in error),
	});

	const response = await handler({
		request: new Request('https://example.com/api/partners/half-dozen/prospects/acme/graduate', {
			method: 'POST',
			body: JSON.stringify({
				identity_account_id: 'acct_identity',
				identity_user_id: 'auth0|abc',
				identity_tenant_id: 'tenant_identity',
			}),
		}),
		params: { slug: 'acme' },
		platform: { env: { DB: db } },
	} as any);

	assert.equal(response.status, 409);
	const payload = (await response.json()) as {
		error: string;
		issuance_state: { ready: boolean; blocked_reason: string };
		client: { status: string };
		lane: { status: string };
	};
	assert.equal(payload.error, 'graduation_blocked');
	assert.equal(payload.issuance_state.ready, false);
	assert.equal(payload.issuance_state.blocked_reason, 'service_not_entitled');
	assert.equal(payload.client.status, 'initialized');
	assert.equal(payload.lane.status, 'initialized');
});

test('partner prospect graduation promotes the prospect once entitlement and consent are ready', async () => {
	const state = createState();
	const db = createFakeDb(state);

	const handler = createPartnerProspectGraduatePostHandler({
		partnerKey: 'half-dozen',
		buildAgencyEntitlementSnapshot: (_row, decision) => ({
			service_tier: 'mcp_only',
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
				graduation_target: null,
				review_by: null,
			},
		}),
		evaluateAgencyMcpEntitlement: () => entitlementDecision(true, 'allowed'),
		getLatestActiveConsent: async () => null,
		getPartnerAccessLaneBySlug: async () => state.lane,
		getPartnerClientBySlug: async () => state.client,
		isProspectGraduated: (metadata) => metadata.lifecycle_stage === 'active' || metadata.lifecycle_stage === 'graduated',
		isProspectRecord: (metadata) => metadata.onboarding_mode === 'prospect' || metadata.lifecycle_stage === 'prospect',
		normalizeEmail: (raw) => raw?.trim().toLowerCase() ?? null,
		normalizePartnerAccessLaneSlug: (value) => value.trim().toLowerCase(),
		normalizePartnerSlug: (value) => value.trim().toLowerCase(),
		parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
		parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		parseOptionalIsoTimestamp: (raw) => raw?.trim() ?? null,
		randomId: (prefix) => `${prefix}_test`,
		reconcileAgencyMcpEntitlement: async () => createEntitlementRow({
			account_id: 'acct_identity',
			tenant_id: 'tenant_identity',
			service_tier: 'mcp_only',
			managed_bearer_allowed: 1,
			org_membership_active: 1,
			service_entitled: 1,
			policy_accepted: 1,
			contract_active: 1,
			billing_active: 1,
		}),
		requirePartnerAdmin: () => 'partner_admin:test',
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
		isHttpError: (error): error is { status: number; code: string; message: string } =>
			Boolean(error && typeof error === 'object' && 'status' in error && 'code' in error && 'message' in error),
	});

	const response = await handler({
		request: new Request('https://example.com/api/partners/half-dozen/prospects/acme/graduate', {
			method: 'POST',
			body: JSON.stringify({
				identity_account_id: 'acct_identity',
				identity_user_id: 'auth0|abc',
				identity_tenant_id: 'tenant_identity',
				consent: {
					granted_by: 'owner@example.com',
				},
			}),
		}),
		params: { slug: 'acme' },
		platform: { env: { DB: db } },
	} as any);

	assert.equal(response.status, 200);
	assert.equal(state.client.status, 'active');
	assert.equal(state.lane.status, 'active');
	assert.equal(state.consentInserts.length, 1);

	const payload = (await response.json()) as {
		client: { status: string; metadata: { onboarding_mode: string } };
		lane: { status: string };
		issuance_state: { ready: boolean };
		entitlement: { decision: { reason: string } };
		consent_record_id: string;
	};
	assert.equal(payload.client.status, 'active');
	assert.equal(payload.client.metadata.onboarding_mode, 'client');
	assert.equal(payload.lane.status, 'active');
	assert.equal(payload.issuance_state.ready, true);
	assert.equal(payload.entitlement.decision.reason, 'allowed');
	assert.equal(payload.consent_record_id, 'paconsent_test');
});
