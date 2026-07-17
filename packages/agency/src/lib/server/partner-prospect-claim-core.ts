import {
	deriveProspectServiceTier,
	getProspectAvailabilityConflict,
	getProspectClaimConflict,
	resolveProspectClaimAuthorization,
	type ProspectClaimAuthorization,
} from './partner-prospect-claim-shared.js';
import type {
	AgencyEntitlementSnapshot,
	AgencyMcpEntitlementDecision,
	AgencyMcpEntitlementRow,
} from './mcp-entitlements.js';

interface ProspectClaimRequestBody {
	lane_slug?: string;
}

interface ProspectClaimRequestEventLike {
	cookies: unknown;
	params: Record<string, string | undefined>;
	platform?: App.Platform;
	request: Request;
}

interface ProspectClaimHttpErrorLike {
	status: number;
	code?: string;
	message?: string;
	body?: { message?: string };
}

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

interface AgencySessionUserLike {
	id: string;
	email: string;
	tier?: 'free' | 'pro' | 'agency';
	source?: string;
}

interface AgencyIdentitySeedLike {
	normalized_email: string;
	auth_subject: string | null;
	account_id: string;
	tenant_id: string;
	workspace_account_id: string | null;
	service_tier: string;
	status: string;
}

export interface PartnerProspectClaimDeps {
	partnerKey: string;
	buildAgencyEntitlementSnapshot: (
		row: AgencyMcpEntitlementRow | null,
		decision: AgencyMcpEntitlementDecision | null,
	) => AgencyEntitlementSnapshot;
	evaluateAgencyMcpEntitlement: (
		row: AgencyMcpEntitlementRow | null,
		expected?: { accountId?: string | null; tenantId?: string | null },
	) => AgencyMcpEntitlementDecision;
	findAgencyIdentitySeedByEmail: (
		db: D1Database,
		authEmail: string | null,
	) => Promise<AgencyIdentitySeedLike | null>;
	findAgencyMcpEntitlementByAuthSubject: (
		db: D1Database,
		authSubject: string,
	) => Promise<AgencyMcpEntitlementRow | null>;
	getPartnerAccessLaneBySlug: (
		db: D1Database,
		partnerClientId: string,
		laneSlug: string,
	) => Promise<ProspectLaneRowLike | null>;
	getPartnerClientBySlug: (
		db: D1Database,
		partnerKey: string,
		slug: string,
	) => Promise<ProspectClientRowLike | null>;
	isProspectGraduated: (metadata: Record<string, unknown>) => boolean;
	isProspectRecord: (metadata: Record<string, unknown>) => boolean;
	normalizeAgencyServiceTier: (value: string | null | undefined, fallback?: 'mcp_only' | 'policy_os_trial' | 'policy_os_core') => string;
	normalizeEmail: (raw: string | undefined) => string | null;
	normalizePartnerAccessLaneSlug: (value: string) => string;
	normalizePartnerSlug: (value: string) => string;
	parseJsonArray: (raw: string | null | undefined) => string[];
	parseJsonObject: (raw: string | null | undefined) => Record<string, unknown>;
	parseJsonStringArray: (raw: string | null | undefined) => string[];
	reconcileAgencyMcpEntitlement: (
		db: D1Database,
		input: {
			authSubject: string;
			authEmail?: string | null;
			accountId?: string | null;
			tenantId?: string | null;
			workspaceAccountId?: string | null;
			serviceTier?: string | null;
			metadata?: Record<string, unknown>;
		},
	) => Promise<AgencyMcpEntitlementRow | null>;
	requireAgencySessionUser: (input: {
		cookies: unknown;
		platform: App.Platform | undefined;
	}) => Promise<AgencySessionUserLike>;
	upsertAgencyIdentitySeed: (
		db: D1Database,
		input: {
			authEmail: string;
			authSubject?: string | null;
			accountId: string;
			tenantId: string;
			workspaceAccountId?: string | null;
			serviceTier?: string | null;
			managedBearerAllowed?: boolean;
			orgMembershipActive?: boolean;
			serviceEntitled?: boolean;
			policyAccepted?: boolean;
			contractActive?: boolean;
			billingActive?: boolean;
			status?: string;
			invitedAt?: string | null;
			boundAt?: string | null;
			metadata?: Record<string, unknown>;
		},
	) => Promise<AgencyIdentitySeedLike | null>;
	upsertPartnerAccessLane: (
		db: D1Database,
		input: {
			id: string;
			partnerClientId: string;
			slug: string;
			displayName: string;
			identityUserId: string | null;
			ownerEmail: string | null;
			hubUrl: string;
			hostKey: string;
			status: ProspectLaneRowLike['status'];
			toolkitProfile: string[];
			allowedToolPrefixes: string[];
			metadata: Record<string, unknown>;
		},
	) => Promise<ProspectLaneRowLike>;
	isHttpError: (error: unknown) => error is ProspectClaimHttpErrorLike;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
	return Response.json(body, { status });
}

export function createPartnerProspectClaimPostHandler(deps: PartnerProspectClaimDeps) {
	return async ({ cookies, params, platform, request }: ProspectClaimRequestEventLike): Promise<Response> => {
		try {
			const db = platform?.env?.DB;
			if (!db) {
				return jsonResponse({ error: 'unavailable', message: 'Database is unavailable' }, 503);
			}

			const user = await deps.requireAgencySessionUser({ cookies, platform });
			const slug = deps.normalizePartnerSlug(params.slug ?? '');
			if (!slug) {
				return jsonResponse({ error: 'invalid_request', message: 'Prospect slug is required' }, 400);
			}

			const body = (await request.json().catch(() => null)) as ProspectClaimRequestBody | null;
			const laneSlug = deps.normalizePartnerAccessLaneSlug(body?.lane_slug?.trim() || `prospect-${slug}`);

			const client = await deps.getPartnerClientBySlug(db, deps.partnerKey, slug);
			if (!client) {
				return jsonResponse({ error: 'not_found', message: 'Prospect client not found' }, 404);
			}

			const clientMetadata = deps.parseJsonObject(client.metadata_json);
			if (!deps.isProspectRecord(clientMetadata)) {
				return jsonResponse(
					{ error: 'not_prospect', message: 'This workspace is not an active prospect record.' },
					409,
				);
			}
			if (deps.isProspectGraduated(clientMetadata)) {
				return jsonResponse(
					{
						error: 'already_graduated',
						message: 'This prospect has already graduated. Use the normal authenticated account path instead.',
					},
					409,
				);
			}

			const lane = await deps.getPartnerAccessLaneBySlug(db, client.id, laneSlug);
			if (!lane) {
				return jsonResponse({ error: 'not_found', message: 'Prospect lane not found' }, 404);
			}
			const laneMetadata = deps.parseJsonObject(lane.metadata_json);
			if (!deps.isProspectRecord(laneMetadata) || deps.isProspectGraduated(laneMetadata)) {
				return jsonResponse(
					{ error: 'lane_not_prospect', message: 'This lane is not marked as an active prospect lane.' },
					409,
				);
			}
			const availabilityConflict = getProspectAvailabilityConflict({
				clientStatus: client.status,
				laneStatus: lane.status,
			});
			if (availabilityConflict) {
				return jsonResponse(
					{
						error: availabilityConflict.code,
						message: availabilityConflict.message,
					},
					409,
				);
			}

			const normalizedUserEmail = deps.normalizeEmail(user.email);
			if (!normalizedUserEmail) {
				return jsonResponse({ error: 'invalid_request', message: 'User email is required' }, 400);
			}

			const authorizedVia = resolveProspectClaimAuthorization({
				userEmail: normalizedUserEmail,
				clientOwnerEmail: client.owner_email,
				clientMetadata,
				laneOwnerEmail: lane.owner_email,
				laneMetadata,
				normalizeEmail: deps.normalizeEmail,
			});
			if (!authorizedVia) {
				return jsonResponse(
					{
						error: 'claim_not_authorized',
						message: 'This CREATE SOMETHING Identity account is not authorized to claim the prospect workspace.',
					},
					403,
				);
			}

			if (client.identity_user_id && client.identity_user_id !== user.id) {
				return jsonResponse(
					{
						error: 'already_claimed',
						message: 'This prospect is already claimed by another CREATE SOMETHING Identity subject.',
					},
					409,
				);
			}
			if (lane.identity_user_id && lane.identity_user_id !== user.id) {
				return jsonResponse(
					{
						error: 'lane_already_claimed',
						message: 'This prospect lane is already claimed by another CREATE SOMETHING Identity subject.',
					},
					409,
				);
			}

			const identityAccountId = client.identity_account_id ?? client.workspace_account_id;
			const identityTenantId = client.identity_tenant_id ?? client.slug;
			const serviceTier = deriveProspectServiceTier(clientMetadata, deps.normalizeAgencyServiceTier);
			const existingSeed = await deps.findAgencyIdentitySeedByEmail(db, normalizedUserEmail);
			const existingEntitlement = await deps.findAgencyMcpEntitlementByAuthSubject(db, user.id);
			const claimConflict = getProspectClaimConflict({
				userId: user.id,
				identityAccountId,
				identityTenantId,
				existingSeed,
				existingEntitlement,
				existingEntitlementMetadata: deps.parseJsonObject(existingEntitlement?.metadata_json),
			});
			if (claimConflict) {
				return jsonResponse(
					{
						error: claimConflict.code,
						message: claimConflict.message,
					},
					409,
				);
			}

			const now = new Date().toISOString();
			const seed = await deps.upsertAgencyIdentitySeed(db, {
				authEmail: normalizedUserEmail,
				authSubject: user.id,
				accountId: identityAccountId,
				tenantId: identityTenantId,
				workspaceAccountId: client.workspace_account_id,
				serviceTier,
				managedBearerAllowed: false,
				orgMembershipActive: true,
				serviceEntitled: false,
				policyAccepted: false,
				contractActive: false,
				billingActive: false,
				status: 'prospect_claimed',
				boundAt: now,
				metadata: {
					source: 'partner_prospect_claim',
					partner_key: deps.partnerKey,
					client_slug: client.slug,
					lane_slug: lane.slug,
					claim_authorized_via: authorizedVia,
					claimed_at: now,
					claimed_by_auth_subject: user.id,
					claimed_by_email: normalizedUserEmail,
				},
			});

			await updateProspectClient(db, {
				client,
				ownerEmail: client.owner_email ?? normalizedUserEmail,
				identityAccountId,
				identityUserId: user.id,
				identityTenantId,
				metadata: buildClaimedMetadata({
					existingMetadata: clientMetadata,
					now,
					user,
					authorizedVia,
				}),
			});

			const claimedLane = await deps.upsertPartnerAccessLane(db, {
				id: lane.id,
				partnerClientId: client.id,
				slug: lane.slug,
				displayName: lane.display_name,
				identityUserId: user.id,
				ownerEmail: lane.owner_email ?? client.owner_email ?? normalizedUserEmail,
				hubUrl: lane.hub_url,
				hostKey: lane.host_key,
				status: lane.status,
				toolkitProfile: deps.parseJsonArray(lane.toolkit_profile_json),
				allowedToolPrefixes: deps.parseJsonStringArray(lane.allowed_tool_prefixes_json),
				metadata: buildClaimedMetadata({
					existingMetadata: laneMetadata,
					now,
					user,
					authorizedVia,
				}),
			});

			const claimedClient = await deps.getPartnerClientBySlug(db, deps.partnerKey, slug);
			if (!claimedClient) {
				return jsonResponse({ error: 'internal_error', message: 'Failed to reload claimed prospect' }, 500);
			}

			const entitlementRow = await deps.reconcileAgencyMcpEntitlement(db, {
				authSubject: user.id,
				authEmail: normalizedUserEmail,
				accountId: identityAccountId,
				tenantId: identityTenantId,
				workspaceAccountId: client.workspace_account_id,
				serviceTier,
				metadata: {
					source: 'partner_prospect_claim',
					partner_key: deps.partnerKey,
					client_slug: client.slug,
					lane_slug: lane.slug,
					claim_authorized_via: authorizedVia,
					claimed_at: now,
				},
			});
			const entitlementDecision = deps.evaluateAgencyMcpEntitlement(entitlementRow, {
				accountId: identityAccountId,
				tenantId: identityTenantId,
			});
			const entitlementSnapshot = deps.buildAgencyEntitlementSnapshot(entitlementRow, entitlementDecision);

			return jsonResponse({
				prospect_claim: {
					status: 'claimed',
					authorized_via: authorizedVia,
					claimant_auth_subject: user.id,
					claimant_email: normalizedUserEmail,
				},
				client: serializeClient(claimedClient, deps),
				lane: serializeLane(claimedLane, deps),
				identity_seed: seed,
				entitlement: {
					decision: entitlementDecision,
					snapshot: entitlementSnapshot,
				},
			});
		} catch (error) {
			if (deps.isHttpError(error)) {
				const status = typeof error.status === 'number' ? error.status : 500;
				const message = error.message ?? error.body?.message ?? 'Request failed';
				return jsonResponse({ error: error.code ?? 'request_failed', message }, status);
			}

			return jsonResponse(
				{ error: 'internal_error', message: error instanceof Error ? error.message : 'Unexpected error' },
				500,
			);
		}
	};
}

function updateProspectClient(
	db: D1Database,
	input: {
		client: ProspectClientRowLike;
		ownerEmail: string | null;
		identityAccountId: string;
		identityUserId: string;
		identityTenantId: string;
		metadata: Record<string, unknown>;
	},
) {
	return db
		.prepare(
			`UPDATE partner_auth_clients
       SET owner_email = ?, identity_account_id = ?, identity_user_id = ?, identity_tenant_id = ?,
           metadata_json = ?, updated_at = datetime('now')
       WHERE id = ?`,
		)
		.bind(
			input.ownerEmail,
			input.identityAccountId,
			input.identityUserId,
			input.identityTenantId,
			JSON.stringify(input.metadata),
			input.client.id,
		)
		.run();
}

function buildClaimedMetadata(input: {
	existingMetadata: Record<string, unknown>;
	now: string;
	user: AgencySessionUserLike;
	authorizedVia: ProspectClaimAuthorization;
}): Record<string, unknown> {
	const prospect = asMetadataObject(input.existingMetadata.prospect_onboarding);
	return {
		...input.existingMetadata,
		last_updated_by: input.user.id,
		prospect_onboarding: {
			...prospect,
			claimed_at: input.now,
			claimed_by_auth_subject: input.user.id,
			claimed_by_email: input.user.email.trim().toLowerCase(),
			claim_authorized_via: input.authorizedVia,
			claim_source: 'agency_self_service',
			customer_credential_issuance_blocked: true,
		},
	};
}

function serializeClient(client: ProspectClientRowLike, deps: PartnerProspectClaimDeps) {
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

function serializeLane(lane: ProspectLaneRowLike, deps: PartnerProspectClaimDeps) {
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

function asMetadataObject(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	return value as Record<string, unknown>;
}
