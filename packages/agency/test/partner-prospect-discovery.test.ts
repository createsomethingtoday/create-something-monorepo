import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildAgencyEntitlementSnapshot,
	evaluateAgencyMcpEntitlement,
} from '../src/lib/server/mcp-entitlements.ts';
import { listPartnerProspectClaimsForUser } from '../src/lib/server/partner-prospect-discovery-core.ts';

function createClient(overrides: Partial<Record<string, unknown>> = {}) {
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
		status: 'initialized' as const,
		required_toolkits_json: '["gmail"]',
		metadata_json: '{"onboarding_mode":"prospect","lifecycle_stage":"prospect","prospect_onboarding":{"stage":"prospect","graduation_target":"policy_os_trial"}}',
		created_at: '2026-03-18T00:00:00.000Z',
		updated_at: '2026-03-18T00:00:00.000Z',
		...overrides,
	};
}

function createLane(
	partnerClientId: string,
	slug: string,
	overrides: Partial<Record<string, unknown>> = {},
) {
	return {
		id: `palane_${slug}`,
		partner_client_id: partnerClientId,
		slug,
		display_name: `Prospect Workspace - ${slug}`,
		identity_user_id: null,
		owner_email: 'owner@example.com',
		hub_url: `https://${slug}.mcp.createsomething.agency/mcp`,
		host_key: slug,
		status: 'initialized' as const,
		toolkit_profile_json: '["gmail"]',
		allowed_tool_prefixes_json: '["composio-toolkit-gmail__"]',
		metadata_json: '{"onboarding_mode":"prospect","lifecycle_stage":"prospect","prospect_onboarding":{"stage":"prospect"}}',
		created_at: '2026-03-18T00:00:00.000Z',
		updated_at: '2026-03-18T00:00:00.000Z',
		...overrides,
	};
}

test('prospect discovery lists claimable workspaces for the signed-in agency user', async () => {
	const clients = [
		createClient(),
		createClient({
			id: 'pacli_bravo',
			slug: 'bravo',
			display_name: 'Bravo',
			owner_email: 'sales@other.example',
			metadata_json:
				'{"onboarding_mode":"prospect","lifecycle_stage":"prospect","prospect_onboarding":{"stage":"prospect","allowed_claim_email_domains":["example.com"]}}',
		}),
		createClient({
			id: 'pacli_charlie',
			slug: 'charlie',
			display_name: 'Charlie',
			identity_user_id: 'auth0|other',
			metadata_json:
				'{"onboarding_mode":"prospect","lifecycle_stage":"prospect","prospect_onboarding":{"stage":"prospect","allowed_claim_emails":["owner@example.com"]}}',
		}),
		createClient({
			id: 'pacli_delta',
			slug: 'delta',
			display_name: 'Delta',
			owner_email: 'outside@example.net',
		}),
		createClient({
			id: 'pacli_echo',
			slug: 'echo',
			display_name: 'Echo',
			metadata_json: '{"onboarding_mode":"client","lifecycle_stage":"active"}',
		}),
	];

	const lanesByClient = new Map<string, any[]>([
		['pacli_acme', [createLane('pacli_acme', 'prospect-acme')]],
		[
			'pacli_bravo',
			[
				createLane('pacli_bravo', 'prospect-bravo', {
					owner_email: 'ops@other.example',
					metadata_json:
						'{"onboarding_mode":"prospect","lifecycle_stage":"prospect","prospect_onboarding":{"stage":"prospect","allowed_claim_email_domains":["example.com"]}}',
				}),
			],
		],
		['pacli_charlie', [createLane('pacli_charlie', 'prospect-charlie', { identity_user_id: 'auth0|other' })]],
		['pacli_delta', [createLane('pacli_delta', 'prospect-delta', { owner_email: 'outside@example.net' })]],
		['pacli_echo', [createLane('pacli_echo', 'prospect-echo')]],
	]);

	const prospects = await listPartnerProspectClaimsForUser(
		{
			partnerKey: 'half-dozen',
			findAgencyIdentitySeedByEmail: async () => null,
			findAgencyMcpEntitlementByAuthSubject: async () => null,
			listPartnerClients: async () => clients as any[],
			listPartnerAccessLanes: async (_db, clientId) => lanesByClient.get(clientId) ?? [],
			isProspectRecord: (metadata) => metadata.onboarding_mode === 'prospect' || metadata.lifecycle_stage === 'prospect',
			isProspectGraduated: (metadata) => metadata.lifecycle_stage === 'graduated' || metadata.lifecycle_stage === 'active',
			normalizeAgencyServiceTier: (value, fallback = 'mcp_only') => (value?.includes('trial') ? 'policy_os_trial' : fallback),
			normalizeEmail: (raw) => raw?.trim().toLowerCase() ?? null,
			parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
			parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
			parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		},
		{
			db: {} as D1Database,
			authSubject: 'auth0|claimant',
			email: 'owner@example.com',
		},
	);

	assert.equal(prospects.length, 3);
	assert.equal(prospects[0]?.client.slug, 'acme');
	assert.equal(prospects[0]?.prospect_claim.state, 'claimable');
	assert.equal(prospects[0]?.prospect_claim.authorized_via, 'owner_email');
	assert.equal(prospects[1]?.client.slug, 'bravo');
	assert.equal(prospects[1]?.prospect_claim.authorized_via, 'claim_email_domains');
	assert.equal(prospects[2]?.client.slug, 'charlie');
	assert.equal(prospects[2]?.prospect_claim.state, 'claimed_by_other');
	assert.equal(prospects[2]?.prospect_claim.blocked_reason, 'already_claimed');
});

test('prospect discovery surfaces identity conflicts that block immediate claim', async () => {
	const client = createClient({
		id: 'pacli_conflict',
		slug: 'conflict',
		display_name: 'Conflict',
	});
	const lane = createLane('pacli_conflict', 'prospect-conflict');

	const prospects = await listPartnerProspectClaimsForUser(
		{
			partnerKey: 'half-dozen',
			findAgencyIdentitySeedByEmail: async () => ({
				auth_subject: 'auth0|elsewhere',
				account_id: 'acct_other',
				tenant_id: 'other',
			}),
			findAgencyMcpEntitlementByAuthSubject: async () => null,
			listPartnerClients: async () => [client] as any[],
			listPartnerAccessLanes: async () => [lane] as any[],
			isProspectRecord: () => true,
			isProspectGraduated: () => false,
			normalizeAgencyServiceTier: (value, fallback = 'mcp_only') => value === 'policy_os_trial' ? value : fallback,
			normalizeEmail: (raw) => raw?.trim().toLowerCase() ?? null,
			parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
			parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
			parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		},
		{
			db: {} as D1Database,
			authSubject: 'auth0|claimant',
			email: 'owner@example.com',
		},
	);

	assert.equal(prospects.length, 1);
	assert.equal(prospects[0]?.prospect_claim.can_claim_now, false);
	assert.equal(prospects[0]?.prospect_claim.blocked_reason, 'identity_seed_conflict');
});

test('prospect discovery marks paused prospect workspaces unavailable for self-service claim', async () => {
	const client = createClient({
		id: 'pacli_paused',
		slug: 'paused',
		display_name: 'Paused',
		status: 'paused',
	});
	const lane = createLane('pacli_paused', 'prospect-paused', {
		status: 'paused',
	});

	const prospects = await listPartnerProspectClaimsForUser(
		{
			partnerKey: 'half-dozen',
			findAgencyIdentitySeedByEmail: async () => null,
			findAgencyMcpEntitlementByAuthSubject: async () => null,
			listPartnerClients: async () => [client] as any[],
			listPartnerAccessLanes: async () => [lane] as any[],
			isProspectRecord: () => true,
			isProspectGraduated: () => false,
			normalizeAgencyServiceTier: (value, fallback = 'mcp_only') => value === 'policy_os_trial' ? value : fallback,
			normalizeEmail: (raw) => raw?.trim().toLowerCase() ?? null,
			parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
			parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
			parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
		},
		{
			db: {} as D1Database,
			authSubject: 'auth0|claimant',
			email: 'owner@example.com',
		},
	);

	assert.equal(prospects.length, 1);
	assert.equal(prospects[0]?.prospect_claim.state, 'claimable');
	assert.equal(prospects[0]?.prospect_claim.can_claim_now, false);
	assert.equal(prospects[0]?.prospect_claim.blocked_reason, 'prospect_unavailable');
	assert.match(prospects[0]?.prospect_claim.blocked_message ?? '', /client status is paused/i);
});

test('prospect discovery surfaces graduation readiness for a claimed workspace', async () => {
	const client = createClient({
		id: 'pacli_claimed',
		slug: 'claimed',
		display_name: 'Claimed',
		identity_user_id: 'auth0|claimant',
		identity_account_id: 'acct_claimed',
		identity_tenant_id: 'claimed',
	});
	const lane = createLane('pacli_claimed', 'prospect-claimed', {
		identity_user_id: 'auth0|claimant',
	});

	const prospects = await listPartnerProspectClaimsForUser(
		{
			partnerKey: 'half-dozen',
			findAgencyIdentitySeedByEmail: async () => null,
			findAgencyMcpEntitlementByAuthSubject: async () => ({
				auth_subject: 'auth0|claimant',
				auth_email: 'owner@example.com',
				account_id: 'acct_claimed',
				tenant_id: 'claimed',
				workspace_account_id: 'acct_claimed',
				service_tier: 'policy_os_trial',
				managed_bearer_allowed: 0,
				org_membership_active: 1,
				service_entitled: 0,
				policy_accepted: 1,
				contract_active: 0,
				billing_active: 0,
				denial_reason: 'service_not_entitled',
				metadata_json: '{}',
				created_at: '2026-03-18T00:00:00.000Z',
				updated_at: '2026-03-18T00:00:00.000Z',
			}),
			listPartnerClients: async () => [client] as any[],
			listPartnerAccessLanes: async () => [lane] as any[],
			isProspectRecord: () => true,
			isProspectGraduated: () => false,
			normalizeAgencyServiceTier: (value, fallback = 'mcp_only') => value === 'policy_os_trial' ? value : fallback,
			normalizeEmail: (raw) => raw?.trim().toLowerCase() ?? null,
			parseJsonArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
			parseJsonObject: (raw) => (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}),
			parseJsonStringArray: (raw) => (raw ? (JSON.parse(raw) as string[]) : []),
			buildAgencyEntitlementSnapshot,
			evaluateAgencyMcpEntitlement,
		},
		{
			db: {} as D1Database,
			authSubject: 'auth0|claimant',
			email: 'owner@example.com',
		},
	);

	assert.equal(prospects.length, 1);
	assert.equal(prospects[0]?.prospect_claim.state, 'claimed_by_you');
	assert.equal(prospects[0]?.graduation_readiness?.ready, false);
	assert.equal(prospects[0]?.graduation_readiness?.blocked_reason, 'service_not_entitled');
	assert.equal(prospects[0]?.graduation_readiness?.checks.service_entitled, false);
	assert.equal(prospects[0]?.graduation_readiness?.snapshot?.service_tier, 'policy_os_trial');
	assert.match(prospects[0]?.graduation_readiness?.blocked_message ?? '', /commercial entitlement/i);
});
