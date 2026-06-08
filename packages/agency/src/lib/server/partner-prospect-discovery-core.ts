import {
	deriveProspectServiceTier,
	getProspectAvailabilityConflict,
	getProspectClaimConflict,
	resolveProspectClaimAuthorization,
	type ProspectClaimAuthorization,
	type ProspectClaimConflictCode,
} from './partner-prospect-claim-shared.js';
import type {
	AgencyCanonicalServiceTier,
	AgencyEntitlementSnapshot,
	AgencyMcpEntitlementDecision,
	AgencyMcpEntitlementRow,
} from './mcp-entitlements.js';

interface ProspectClientRowLike {
	id: string;
	partner_key: string;
	slug: string;
	display_name: string | null;
	workspace_account_id: string;
	identity_account_id: string | null;
	identity_user_id: string | null;
	identity_tenant_id: string | null;
	owner_email: string | null;
	status: 'initialized' | 'active' | 'paused' | 'sunset' | 'disabled';
	required_toolkits_json: string;
	metadata_json: string;
	created_at: string;
	updated_at: string;
}

interface ProspectLaneRowLike {
	id: string;
	partner_client_id: string;
	slug: string;
	display_name: string;
	identity_user_id: string | null;
	owner_email: string | null;
	hub_url: string;
	host_key: string;
	status: 'initialized' | 'active' | 'paused' | 'sunset' | 'disabled';
	toolkit_profile_json: string;
	allowed_tool_prefixes_json: string;
	metadata_json: string;
	created_at: string;
	updated_at: string;
}

interface AgencyIdentitySeedLike {
	auth_subject: string | null;
	account_id: string;
	tenant_id: string;
}

export type ProspectClaimDiscoveryState = 'claimable' | 'claimed_by_you' | 'claimed_by_other';
export type ProspectClaimDiscoveryBlockedReason = ProspectClaimConflictCode | 'already_claimed';

export interface ProspectClaimDiscoveryItem {
	client: {
		id: string;
		partner_key: string;
		slug: string;
		display_name: string | null;
		workspace_account_id: string;
		identity_account_id: string | null;
		identity_user_id: string | null;
		identity_tenant_id: string | null;
		owner_email: string | null;
		status: ProspectClientRowLike['status'];
		required_toolkits: string[];
		metadata: Record<string, unknown>;
		created_at: string;
		updated_at: string;
	};
	lane: {
		id: string;
		slug: string;
		display_name: string;
		identity_user_id: string | null;
		owner_email: string | null;
		hub_url: string;
		host_key: string;
		status: ProspectLaneRowLike['status'];
		toolkit_profile: string[];
		allowed_tool_prefixes: string[];
		metadata: Record<string, unknown>;
		created_at: string;
		updated_at: string;
	};
	prospect_claim: {
		state: ProspectClaimDiscoveryState;
		can_claim_now: boolean;
		authorized_via: ProspectClaimAuthorization;
		blocked_reason: ProspectClaimDiscoveryBlockedReason | null;
		blocked_message: string | null;
		service_tier: AgencyCanonicalServiceTier;
	};
	issuance_state: {
		ready: false;
		blocked_reason: 'prospect_not_ready';
		message: string;
	};
	graduation_readiness: {
		ready: boolean;
		blocked_reason: string | null;
		blocked_message: string;
		account_id: AgencyMcpEntitlementDecision['account_id'];
		tenant_id: AgencyMcpEntitlementDecision['tenant_id'];
		checks: AgencyMcpEntitlementDecision['checks'];
		snapshot: AgencyEntitlementSnapshot | null;
	} | null;
}

export interface PartnerProspectDiscoveryDeps {
	partnerKey: string;
	findAgencyIdentitySeedByEmail: (
		db: D1Database,
		authEmail: string | null,
	) => Promise<AgencyIdentitySeedLike | null>;
	findAgencyMcpEntitlementByAuthSubject: (
		db: D1Database,
		authSubject: string,
	) => Promise<AgencyMcpEntitlementRow | null>;
	listPartnerClients: (
		db: D1Database,
		partnerKey: string,
		options?: { limit?: number; search?: string },
	) => Promise<ProspectClientRowLike[]>;
	listPartnerAccessLanes: (
		db: D1Database,
		partnerClientId: string,
	) => Promise<ProspectLaneRowLike[]>;
	isProspectRecord: (metadata: Record<string, unknown>) => boolean;
	isProspectGraduated: (metadata: Record<string, unknown>) => boolean;
	normalizeAgencyServiceTier: (
		value: string | null | undefined,
		fallback?: AgencyCanonicalServiceTier,
	) => AgencyCanonicalServiceTier;
	normalizeEmail: (raw: string | undefined) => string | null;
	parseJsonArray: (raw: string | null | undefined) => string[];
	parseJsonObject: (raw: string | null | undefined) => Record<string, unknown>;
	parseJsonStringArray: (raw: string | null | undefined) => string[];
	buildAgencyEntitlementSnapshot?: (
		row: AgencyMcpEntitlementRow | null,
		decision: AgencyMcpEntitlementDecision | null,
	) => AgencyEntitlementSnapshot;
	evaluateAgencyMcpEntitlement?: (
		row: AgencyMcpEntitlementRow | null,
		expected?: { accountId?: string | null; tenantId?: string | null },
	) => AgencyMcpEntitlementDecision;
}

export async function listPartnerProspectClaimsForUser(
	deps: PartnerProspectDiscoveryDeps,
	input: {
		db: D1Database;
		authSubject: string;
		email: string;
	},
): Promise<ProspectClaimDiscoveryItem[]> {
	const normalizedEmail = deps.normalizeEmail(input.email);
	if (!normalizedEmail) {
		return [];
	}

	const [clients, existingSeed, existingEntitlement] = await Promise.all([
		deps.listPartnerClients(input.db, deps.partnerKey, { limit: 250 }),
		deps.findAgencyIdentitySeedByEmail(input.db, normalizedEmail),
		deps.findAgencyMcpEntitlementByAuthSubject(input.db, input.authSubject),
	]);
	const existingEntitlementMetadata = deps.parseJsonObject(existingEntitlement?.metadata_json);

	const prospects = await Promise.all(
		clients.map(async (client) => {
			const clientMetadata = deps.parseJsonObject(client.metadata_json);
			if (!deps.isProspectRecord(clientMetadata) || deps.isProspectGraduated(clientMetadata)) {
				return [] as ProspectClaimDiscoveryItem[];
			}

			const lanes = await deps.listPartnerAccessLanes(input.db, client.id);
			const results: ProspectClaimDiscoveryItem[] = [];
			for (const lane of lanes) {
				const laneMetadata = deps.parseJsonObject(lane.metadata_json);
				if (!deps.isProspectRecord(laneMetadata) || deps.isProspectGraduated(laneMetadata)) {
					continue;
				}

				const authorizedVia = resolveProspectClaimAuthorization({
					userEmail: normalizedEmail,
					clientOwnerEmail: client.owner_email,
					clientMetadata,
					laneOwnerEmail: lane.owner_email,
					laneMetadata,
					normalizeEmail: deps.normalizeEmail,
				});
				if (!authorizedVia) {
					continue;
				}

				const identityAccountId = client.identity_account_id ?? client.workspace_account_id;
				const identityTenantId = client.identity_tenant_id ?? client.slug;
				const serviceTier = deriveProspectServiceTier(
					clientMetadata,
					deps.normalizeAgencyServiceTier,
				) as AgencyCanonicalServiceTier;
				const availabilityConflict = getProspectAvailabilityConflict({
					clientStatus: client.status,
					laneStatus: lane.status,
				});
				const claimConflict = getProspectClaimConflict({
					userId: input.authSubject,
					identityAccountId,
					identityTenantId,
					existingSeed,
					existingEntitlement,
					existingEntitlementMetadata,
				});
				const claimedByOther =
					(client.identity_user_id && client.identity_user_id !== input.authSubject) ||
					(lane.identity_user_id && lane.identity_user_id !== input.authSubject);
				const claimedByYou =
					!claimedByOther &&
					(client.identity_user_id === input.authSubject || lane.identity_user_id === input.authSubject);
				const state: ProspectClaimDiscoveryState = claimedByOther
					? 'claimed_by_other'
					: claimedByYou
						? 'claimed_by_you'
						: 'claimable';
				const blockedReason: ProspectClaimDiscoveryBlockedReason | null = claimedByOther
					? 'already_claimed'
					: claimConflict?.code ?? availabilityConflict?.code ?? null;
					const blockedMessage = claimedByOther
						? 'This prospect is already claimed by another identity subject.'
						: claimConflict?.message ?? availabilityConflict?.message ?? null;
				const graduationReadiness = claimedByYou
					? buildProspectGraduationReadiness(
							deps,
							existingEntitlement,
							identityAccountId,
							identityTenantId,
							serviceTier,
						)
					: null;

				results.push({
					client: serializeClient(client, deps),
					lane: serializeLane(lane, deps),
					prospect_claim: {
						state,
						can_claim_now: blockedReason === null,
						authorized_via: authorizedVia,
						blocked_reason: blockedReason,
						blocked_message: blockedMessage,
						service_tier: serviceTier,
					},
					issuance_state: {
						ready: false,
						blocked_reason: 'prospect_not_ready',
						message:
							'Customer credential issuance remains blocked until prospect graduation is recorded and governed entitlement state is active.',
					},
					graduation_readiness: graduationReadiness,
				});
			}

			return results;
		}),
	);

	return prospects
		.flat()
		.sort((left, right) => compareDiscoveryState(left.prospect_claim.state, right.prospect_claim.state));
}

function buildProspectGraduationReadiness(
	deps: Pick<
		PartnerProspectDiscoveryDeps,
		'buildAgencyEntitlementSnapshot' | 'evaluateAgencyMcpEntitlement' | 'normalizeAgencyServiceTier'
	>,
	row: AgencyMcpEntitlementRow | null,
	identityAccountId: string,
	identityTenantId: string,
	serviceTier: string,
) {
	const decision = deps.evaluateAgencyMcpEntitlement
		? deps.evaluateAgencyMcpEntitlement(row, {
				accountId: identityAccountId,
				tenantId: identityTenantId,
			})
		: buildFallbackEntitlementDecision(row, identityAccountId, identityTenantId);
	const snapshot =
		deps.buildAgencyEntitlementSnapshot?.(row, decision) ??
		buildFallbackEntitlementSnapshot(row, decision, serviceTier, deps.normalizeAgencyServiceTier);

	return {
		ready: decision.allowed,
		blocked_reason: decision.allowed ? null : decision.reason,
		blocked_message: describeGraduationReadiness(decision.reason),
		account_id: decision.account_id,
		tenant_id: decision.tenant_id,
		checks: decision.checks,
		snapshot,
	};
}

function buildFallbackEntitlementDecision(
	row: AgencyMcpEntitlementRow | null,
	identityAccountId: string,
	identityTenantId: string,
): AgencyMcpEntitlementDecision {
	const checks = {
		managed_bearer_allowed: row?.managed_bearer_allowed === 1,
		org_membership_active: row?.org_membership_active === 1,
		service_entitled: row?.service_entitled === 1,
		policy_accepted: row?.policy_accepted === 1,
		contract_active: row?.contract_active === 1,
		billing_active: row?.billing_active === 1,
	};

	if (!row) {
		return {
			allowed: false,
			reason: 'missing_entitlement_record',
			account_id: null,
			tenant_id: null,
			checks,
		};
	}
	if (!checks.managed_bearer_allowed) {
		return { allowed: false, reason: row.denial_reason ?? 'managed_bearer_disabled', account_id: row.account_id, tenant_id: row.tenant_id, checks };
	}
	if (!checks.org_membership_active) {
		return { allowed: false, reason: row.denial_reason ?? 'org_membership_inactive', account_id: row.account_id, tenant_id: row.tenant_id, checks };
	}
	if (!checks.service_entitled) {
		return { allowed: false, reason: row.denial_reason ?? 'service_not_entitled', account_id: row.account_id, tenant_id: row.tenant_id, checks };
	}
	if (!checks.policy_accepted) {
		return { allowed: false, reason: row.denial_reason ?? 'policy_acceptance_required', account_id: row.account_id, tenant_id: row.tenant_id, checks };
	}
	if (!checks.contract_active) {
		return { allowed: false, reason: row.denial_reason ?? 'contract_inactive', account_id: row.account_id, tenant_id: row.tenant_id, checks };
	}
	if (!checks.billing_active) {
		return { allowed: false, reason: row.denial_reason ?? 'billing_inactive', account_id: row.account_id, tenant_id: row.tenant_id, checks };
	}
	if (row.account_id && row.account_id !== identityAccountId) {
		return { allowed: false, reason: 'account_mismatch', account_id: row.account_id, tenant_id: row.tenant_id, checks };
	}
	if (row.tenant_id && row.tenant_id !== identityTenantId) {
		return { allowed: false, reason: 'tenant_mismatch', account_id: row.account_id, tenant_id: row.tenant_id, checks };
	}

	return {
		allowed: true,
		reason: 'allowed',
		account_id: row.account_id,
		tenant_id: row.tenant_id,
		checks,
	};
}

function buildFallbackEntitlementSnapshot(
	row: AgencyMcpEntitlementRow | null,
	decision: AgencyMcpEntitlementDecision,
	serviceTier: string,
	normalizeAgencyServiceTier: PartnerProspectDiscoveryDeps['normalizeAgencyServiceTier'],
): AgencyEntitlementSnapshot {
	return {
		service_tier: row?.service_tier
			? normalizeAgencyServiceTier(row.service_tier)
			: normalizeAgencyServiceTier(serviceTier),
		managed_bearer_allowed: decision.checks.managed_bearer_allowed,
		org_membership_active: decision.checks.org_membership_active,
		service_entitled: decision.checks.service_entitled,
		policy_accepted: decision.checks.policy_accepted,
		contract_active: decision.checks.contract_active,
		billing_active: decision.checks.billing_active,
		approved_exception: {
			present: false,
			type: null,
			allowed_scope: null,
			graduation_target: null,
			review_by: null,
		},
	};
}

function describeGraduationReadiness(reason: string): string {
	switch (reason) {
		case 'allowed':
			return 'This workspace is ready for operator graduation once consent is active.';
			case 'missing_entitlement_record':
				return 'No governed entitlement record is bound to this identity subject yet.';
		case 'managed_bearer_disabled':
			return 'Managed bearer issuance is still disabled for this workspace.';
		case 'org_membership_inactive':
			return 'Org membership is not active for this workspace yet.';
		case 'service_not_entitled':
			return 'Commercial entitlement is not active for this workspace yet.';
		case 'policy_acceptance_required':
			return 'Policy acceptance is still required before this workspace can graduate.';
		case 'contract_inactive':
			return 'The contract is not active for this workspace yet.';
		case 'billing_inactive':
			return 'Billing is not active for this workspace yet.';
		case 'account_mismatch':
			return 'The current entitlement record is bound to a different account.';
		case 'tenant_mismatch':
			return 'The current entitlement record is bound to a different tenant.';
		default:
			return `Graduation is blocked: ${reason.replace(/_/g, ' ')}.`;
	}
}

function compareDiscoveryState(
	left: ProspectClaimDiscoveryState,
	right: ProspectClaimDiscoveryState,
): number {
	return discoveryStateRank(left) - discoveryStateRank(right);
}

function discoveryStateRank(value: ProspectClaimDiscoveryState): number {
	switch (value) {
		case 'claimable':
			return 0;
		case 'claimed_by_you':
			return 1;
		case 'claimed_by_other':
			return 2;
	}
}

function serializeClient(
	client: ProspectClientRowLike,
	deps: Pick<PartnerProspectDiscoveryDeps, 'parseJsonArray' | 'parseJsonObject'>,
) {
	return {
		id: client.id,
		partner_key: client.partner_key,
		slug: client.slug,
		display_name: client.display_name,
		workspace_account_id: client.workspace_account_id,
		identity_account_id: client.identity_account_id,
		identity_user_id: client.identity_user_id,
		identity_tenant_id: client.identity_tenant_id,
		owner_email: client.owner_email,
		status: client.status,
		required_toolkits: deps.parseJsonArray(client.required_toolkits_json),
		metadata: deps.parseJsonObject(client.metadata_json),
		created_at: client.created_at,
		updated_at: client.updated_at,
	};
}

function serializeLane(
	lane: ProspectLaneRowLike,
	deps: Pick<PartnerProspectDiscoveryDeps, 'parseJsonArray' | 'parseJsonObject' | 'parseJsonStringArray'>,
) {
	return {
		id: lane.id,
		slug: lane.slug,
		display_name: lane.display_name,
		identity_user_id: lane.identity_user_id,
		owner_email: lane.owner_email,
		hub_url: lane.hub_url,
		host_key: lane.host_key,
		status: lane.status,
		toolkit_profile: deps.parseJsonArray(lane.toolkit_profile_json),
		allowed_tool_prefixes: deps.parseJsonStringArray(lane.allowed_tool_prefixes_json),
		metadata: deps.parseJsonObject(lane.metadata_json),
		created_at: lane.created_at,
		updated_at: lane.updated_at,
	};
}
