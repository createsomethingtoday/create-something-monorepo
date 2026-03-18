import {
	deriveProspectServiceTier,
	getProspectAvailabilityConflict,
	getProspectClaimConflict,
	resolveProspectClaimAuthorization,
	type ProspectClaimAuthorization,
	type ProspectClaimConflictCode,
} from './partner-prospect-claim-shared.js';

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

interface AgencyMcpEntitlementRowLike {
	account_id: string | null;
	tenant_id: string | null;
	metadata_json: string;
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
		service_tier: string;
	};
	issuance_state: {
		ready: false;
		blocked_reason: 'prospect_not_ready';
		message: string;
	};
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
	) => Promise<AgencyMcpEntitlementRowLike | null>;
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
		fallback?: 'mcp_only' | 'policy_os_trial' | 'policy_os_core',
	) => string;
	normalizeEmail: (raw: string | undefined) => string | null;
	parseJsonArray: (raw: string | null | undefined) => string[];
	parseJsonObject: (raw: string | null | undefined) => Record<string, unknown>;
	parseJsonStringArray: (raw: string | null | undefined) => string[];
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
				const serviceTier = deriveProspectServiceTier(clientMetadata, deps.normalizeAgencyServiceTier);
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
					? 'This prospect is already claimed by another Auth0 subject.'
					: claimConflict?.message ?? availabilityConflict?.message ?? null;

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
				});
			}

			return results;
		}),
	);

	return prospects
		.flat()
		.sort((left, right) => compareDiscoveryState(left.prospect_claim.state, right.prospect_claim.state));
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
