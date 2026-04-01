import {
	assessProspectClaimBinding,
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
	managed_bearer_allowed?: number;
	org_membership_active?: number;
	service_entitled?: number;
	policy_accepted?: number;
	contract_active?: number;
	billing_active?: number;
	status: string;
	invited_at?: string | null;
	bound_at?: string | null;
	metadata_json?: string;
}

interface ProspectClaimRollbackContext {
	client: ProspectClientRowLike;
	lane: ProspectLaneRowLike;
	claimedByUserId: string;
	normalizedEmail: string;
	previousSeed: AgencyIdentitySeedLike | null;
	previousEntitlement: AgencyMcpEntitlementRow | null;
}

type ProspectClaimBindingRollbackContext = Pick<
	ProspectClaimRollbackContext,
	'client' | 'lane' | 'claimedByUserId'
>;

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
	isHttpError: (error: unknown) => error is ProspectClaimHttpErrorLike;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
	return Response.json(body, { status });
}

export function createPartnerProspectClaimPostHandler(deps: PartnerProspectClaimDeps) {
	return async ({ cookies, params, platform, request }: ProspectClaimRequestEventLike): Promise<Response> => {
		let db: D1Database | undefined;
		let rollbackContext: ProspectClaimRollbackContext | null = null;

		try {
			db = platform?.env?.DB;
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
						message: 'This Auth0 account is not authorized to claim the prospect workspace.',
					},
					403,
				);
			}

			const bindingAssessment = assessProspectClaimBinding({
				userId: user.id,
				clientIdentityUserId: client.identity_user_id,
				laneIdentityUserId: lane.identity_user_id,
			});
			if (bindingAssessment.claimedByOther) {
				if (client.identity_user_id && client.identity_user_id !== user.id) {
					return jsonResponse(
						{
							error: 'already_claimed',
							message: 'This prospect is already claimed by another Auth0 subject.',
						},
						409,
					);
				}
				return jsonResponse(
					{
						error: 'lane_already_claimed',
						message: 'This prospect lane is already claimed by another Auth0 subject.',
					},
					409,
				);
			}
			if (bindingAssessment.repairableByYou) {
				console.warn('Prospect claim repair requested for partially claimed workspace', {
					clientSlug: client.slug,
					laneSlug: lane.slug,
					userId: user.id,
				});
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
			rollbackContext = {
				client,
				lane,
				claimedByUserId: user.id,
				normalizedEmail: normalizedUserEmail,
				previousSeed: existingSeed,
				previousEntitlement: existingEntitlement,
			};
			let claimedClient = client;
			let claimedLane = lane;
			if (!bindingAssessment.fullyClaimedByYou) {
				const claimBinding = await applyProspectClaimBinding(deps, db, {
					partnerKey: deps.partnerKey,
					client,
					clientMetadata,
					lane,
					laneMetadata,
					now,
					user,
					authorizedVia,
					normalizedUserEmail,
				});
				if (!claimBinding.ok) {
					return jsonResponse(
						{
							error: claimBinding.error,
							message: claimBinding.message,
						},
						claimBinding.status,
					);
				}
				claimedClient = claimBinding.client;
				claimedLane = claimBinding.lane;
			}

			const seed = await deps.upsertAgencyIdentitySeed(db, {
				authEmail: normalizedUserEmail,
				authSubject: user.id,
				accountId: identityAccountId,
				tenantId: identityTenantId,
				workspaceAccountId: claimedClient.workspace_account_id,
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
					client_slug: claimedClient.slug,
					lane_slug: claimedLane.slug,
					claim_authorized_via: authorizedVia,
					claimed_at: now,
					claimed_by_auth_subject: user.id,
					claimed_by_email: normalizedUserEmail,
				},
			});

			const entitlementRow = await deps.reconcileAgencyMcpEntitlement(db, {
				authSubject: user.id,
				authEmail: normalizedUserEmail,
				accountId: identityAccountId,
				tenantId: identityTenantId,
				workspaceAccountId: claimedClient.workspace_account_id,
				serviceTier,
				metadata: {
					source: 'partner_prospect_claim',
					partner_key: deps.partnerKey,
					client_slug: claimedClient.slug,
					lane_slug: claimedLane.slug,
					claim_authorized_via: authorizedVia,
					claimed_at: now,
				},
			});
			const entitlementDecision = deps.evaluateAgencyMcpEntitlement(entitlementRow, {
				accountId: identityAccountId,
				tenantId: identityTenantId,
			});
			const entitlementSnapshot = deps.buildAgencyEntitlementSnapshot(entitlementRow, entitlementDecision);
			rollbackContext = null;

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
			if (db && rollbackContext) {
				try {
					await rollbackProspectClaimArtifacts(db, rollbackContext);
				} catch (rollbackError) {
					console.warn('Failed to roll back prospect claim binding after error', {
						clientSlug: rollbackContext.client.slug,
						laneSlug: rollbackContext.lane.slug,
						userId: rollbackContext.claimedByUserId,
						error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
					});
				}
			}
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

async function applyProspectClaimBinding(
	deps: Pick<
		PartnerProspectClaimDeps,
		'getPartnerAccessLaneBySlug' | 'getPartnerClientBySlug' | 'parseJsonArray' | 'parseJsonStringArray'
	>,
	db: D1Database,
	input: {
		partnerKey: string;
		client: ProspectClientRowLike;
		clientMetadata: Record<string, unknown>;
		lane: ProspectLaneRowLike;
		laneMetadata: Record<string, unknown>;
		now: string;
		user: AgencySessionUserLike;
		authorizedVia: ProspectClaimAuthorization;
		normalizedUserEmail: string;
	},
): Promise<
	| {
			ok: true;
			client: ProspectClientRowLike;
			lane: ProspectLaneRowLike;
	  }
	| {
			ok: false;
			status: number;
			error: string;
			message: string;
	  }
> {
	await executeStatements(db, [
		buildProspectClientClaimStatement(db, {
			client: input.client,
			ownerEmail: input.client.owner_email ?? input.normalizedUserEmail,
			identityAccountId: input.client.identity_account_id ?? input.client.workspace_account_id,
			identityUserId: input.user.id,
			identityTenantId: input.client.identity_tenant_id ?? input.client.slug,
			metadata: buildClaimedMetadata({
				existingMetadata: input.clientMetadata,
				now: input.now,
				user: input.user,
				authorizedVia: input.authorizedVia,
			}),
		}),
		buildProspectLaneClaimStatement(db, {
			lane: input.lane,
			partnerClientId: input.client.id,
			ownerEmail: input.lane.owner_email ?? input.client.owner_email ?? input.normalizedUserEmail,
			identityUserId: input.user.id,
			metadata: buildClaimedMetadata({
				existingMetadata: input.laneMetadata,
				now: input.now,
				user: input.user,
				authorizedVia: input.authorizedVia,
			}),
			toolkitProfile: deps.parseJsonArray(input.lane.toolkit_profile_json),
			allowedToolPrefixes: deps.parseJsonStringArray(input.lane.allowed_tool_prefixes_json),
		}),
	]);

	const [claimedClient, claimedLane] = await Promise.all([
		deps.getPartnerClientBySlug(db, input.partnerKey, input.client.slug),
		deps.getPartnerAccessLaneBySlug(db, input.client.id, input.lane.slug),
	]);
	if (!claimedClient || !claimedLane) {
		await rollbackProspectClaimBinding(db, {
			client: input.client,
			lane: input.lane,
			claimedByUserId: input.user.id,
		});
		return {
			ok: false,
			status: 500,
			error: 'internal_error',
			message: 'Failed to reload claimed prospect after applying claim binding.',
		};
	}

	const bindingAssessment = assessProspectClaimBinding({
		userId: input.user.id,
		clientIdentityUserId: claimedClient.identity_user_id,
		laneIdentityUserId: claimedLane.identity_user_id,
	});
	if (bindingAssessment.fullyClaimedByYou) {
		return {
			ok: true,
			client: claimedClient,
			lane: claimedLane,
		};
	}

	console.warn('Prospect claim write detected inconsistent binding state', {
		clientSlug: claimedClient.slug,
		laneSlug: claimedLane.slug,
		userId: input.user.id,
		bindingState: bindingAssessment,
	});
	await rollbackProspectClaimBinding(db, {
		client: input.client,
		lane: input.lane,
		claimedByUserId: input.user.id,
	});

	if (claimedClient.identity_user_id && claimedClient.identity_user_id !== input.user.id) {
		return {
			ok: false,
			status: 409,
			error: 'already_claimed',
			message: 'This prospect is already claimed by another Auth0 subject.',
		};
	}
	if (claimedLane.identity_user_id && claimedLane.identity_user_id !== input.user.id) {
		return {
			ok: false,
			status: 409,
			error: 'lane_already_claimed',
			message: 'This prospect lane is already claimed by another Auth0 subject.',
		};
	}
	return {
		ok: false,
		status: 409,
		error: 'inconsistent_claim_state',
		message:
			bindingAssessment.blockedMessage ??
			'This prospect has a partial claim binding. Re-run claim to repair it before continuing.',
	};
}

function buildProspectClientClaimStatement(
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
	       WHERE id = ? AND (identity_user_id IS NULL OR identity_user_id = ?)`,
		)
		.bind(
			input.ownerEmail,
			input.identityAccountId,
			input.identityUserId,
			input.identityTenantId,
			JSON.stringify(input.metadata),
			input.client.id,
			input.identityUserId,
		);
}

function buildProspectLaneClaimStatement(
	db: D1Database,
	input: {
		lane: ProspectLaneRowLike;
		partnerClientId: string;
		identityUserId: string;
		ownerEmail: string | null;
		metadata: Record<string, unknown>;
		toolkitProfile: string[];
		allowedToolPrefixes: string[];
	},
) {
	return db
		.prepare(
			`UPDATE partner_auth_access_lanes
	       SET display_name = ?, identity_user_id = ?, owner_email = ?, hub_url = ?, host_key = ?, status = ?,
	           toolkit_profile_json = ?, allowed_tool_prefixes_json = ?, metadata_json = ?, updated_at = datetime('now')
	       WHERE id = ? AND (identity_user_id IS NULL OR identity_user_id = ?)
	         AND EXISTS (
	           SELECT 1 FROM partner_auth_clients
	           WHERE id = ? AND identity_user_id = ?
	         )`,
		)
		.bind(
			input.lane.display_name,
			input.identityUserId,
			input.ownerEmail,
			input.lane.hub_url,
			input.lane.host_key,
			input.lane.status,
			JSON.stringify(input.toolkitProfile),
			JSON.stringify(input.allowedToolPrefixes),
			JSON.stringify(input.metadata),
			input.lane.id,
			input.identityUserId,
			input.partnerClientId,
			input.identityUserId,
		);
}

async function rollbackProspectClaimBinding(db: D1Database, input: ProspectClaimBindingRollbackContext) {
	const statements: D1PreparedStatement[] = [];
	if (input.client.identity_user_id !== input.claimedByUserId) {
		statements.push(
			db
				.prepare(
					`UPDATE partner_auth_clients
	         SET owner_email = ?, identity_account_id = ?, identity_user_id = ?, identity_tenant_id = ?,
	             metadata_json = ?, updated_at = datetime('now')
	         WHERE id = ? AND identity_user_id = ?`,
				)
				.bind(
					input.client.owner_email,
					input.client.identity_account_id,
					input.client.identity_user_id,
					input.client.identity_tenant_id,
					input.client.metadata_json,
					input.client.id,
					input.claimedByUserId,
				),
		);
	}
	if (input.lane.identity_user_id !== input.claimedByUserId) {
		statements.push(
			db
				.prepare(
					`UPDATE partner_auth_access_lanes
	         SET display_name = ?, identity_user_id = ?, owner_email = ?, hub_url = ?, host_key = ?, status = ?,
	             toolkit_profile_json = ?, allowed_tool_prefixes_json = ?, metadata_json = ?, updated_at = datetime('now')
	         WHERE id = ? AND identity_user_id = ?`,
				)
				.bind(
					input.lane.display_name,
					input.lane.identity_user_id,
					input.lane.owner_email,
					input.lane.hub_url,
					input.lane.host_key,
					input.lane.status,
					input.lane.toolkit_profile_json,
					input.lane.allowed_tool_prefixes_json,
					input.lane.metadata_json,
					input.lane.id,
					input.claimedByUserId,
				),
		);
	}
	if (statements.length > 0) {
		await executeStatements(db, statements);
	}
}

async function rollbackProspectClaimArtifacts(db: D1Database, input: ProspectClaimRollbackContext) {
	await rollbackProspectClaimBinding(db, input);
	await restoreAgencyIdentitySeed(db, input.normalizedEmail, input.previousSeed);
	await restoreAgencyMcpEntitlement(db, input.claimedByUserId, input.previousEntitlement);
}

async function restoreAgencyIdentitySeed(
	db: D1Database,
	normalizedEmail: string,
	previousSeed: AgencyIdentitySeedLike | null,
) {
	if (!previousSeed) {
		await db.prepare(`DELETE FROM agency_identity_seeds WHERE normalized_email = ?`).bind(normalizedEmail).run();
		return;
	}
	await db
		.prepare(
			`INSERT INTO agency_identity_seeds (
	       normalized_email, auth_subject, account_id, tenant_id, workspace_account_id, service_tier,
	       managed_bearer_allowed, org_membership_active, service_entitled, policy_accepted,
	       contract_active, billing_active, status, invited_at, bound_at, metadata_json
	     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	     ON CONFLICT(normalized_email) DO UPDATE SET
	       auth_subject = excluded.auth_subject,
	       account_id = excluded.account_id,
	       tenant_id = excluded.tenant_id,
	       workspace_account_id = excluded.workspace_account_id,
	       service_tier = excluded.service_tier,
	       managed_bearer_allowed = excluded.managed_bearer_allowed,
	       org_membership_active = excluded.org_membership_active,
	       service_entitled = excluded.service_entitled,
	       policy_accepted = excluded.policy_accepted,
	       contract_active = excluded.contract_active,
	       billing_active = excluded.billing_active,
	       status = excluded.status,
	       invited_at = excluded.invited_at,
	       bound_at = excluded.bound_at,
	       metadata_json = excluded.metadata_json,
	       updated_at = datetime('now')`,
		)
		.bind(
			previousSeed.normalized_email,
			previousSeed.auth_subject,
			previousSeed.account_id,
			previousSeed.tenant_id,
			previousSeed.workspace_account_id,
			previousSeed.service_tier,
			previousSeed.managed_bearer_allowed ?? 1,
			previousSeed.org_membership_active ?? 1,
			previousSeed.service_entitled ?? 1,
			previousSeed.policy_accepted ?? 0,
			previousSeed.contract_active ?? 1,
			previousSeed.billing_active ?? 1,
			previousSeed.status,
			previousSeed.invited_at ?? null,
			previousSeed.bound_at ?? null,
			previousSeed.metadata_json ?? '{}',
		)
		.run();
}

async function restoreAgencyMcpEntitlement(
	db: D1Database,
	authSubject: string,
	previousEntitlement: AgencyMcpEntitlementRow | null,
) {
	if (!previousEntitlement) {
		await db.prepare(`DELETE FROM agency_mcp_entitlements WHERE auth_subject = ?`).bind(authSubject).run();
		return;
	}
	await db
		.prepare(
			`INSERT INTO agency_mcp_entitlements (
	       auth_subject, auth_email, account_id, tenant_id, workspace_account_id, service_tier,
	       managed_bearer_allowed, org_membership_active, service_entitled, policy_accepted,
	       contract_active, billing_active, denial_reason, metadata_json
	     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	     ON CONFLICT(auth_subject) DO UPDATE SET
	       auth_email = excluded.auth_email,
	       account_id = excluded.account_id,
	       tenant_id = excluded.tenant_id,
	       workspace_account_id = excluded.workspace_account_id,
	       service_tier = excluded.service_tier,
	       managed_bearer_allowed = excluded.managed_bearer_allowed,
	       org_membership_active = excluded.org_membership_active,
	       service_entitled = excluded.service_entitled,
	       policy_accepted = excluded.policy_accepted,
	       contract_active = excluded.contract_active,
	       billing_active = excluded.billing_active,
	       denial_reason = excluded.denial_reason,
	       metadata_json = excluded.metadata_json,
	       updated_at = datetime('now')`,
		)
		.bind(
			previousEntitlement.auth_subject,
			previousEntitlement.auth_email,
			previousEntitlement.account_id,
			previousEntitlement.tenant_id,
			previousEntitlement.workspace_account_id,
			previousEntitlement.service_tier,
			previousEntitlement.managed_bearer_allowed,
			previousEntitlement.org_membership_active,
			previousEntitlement.service_entitled,
			previousEntitlement.policy_accepted,
			previousEntitlement.contract_active,
			previousEntitlement.billing_active,
			previousEntitlement.denial_reason,
			previousEntitlement.metadata_json,
		)
		.run();
}

async function executeStatements(db: D1Database, statements: D1PreparedStatement[]) {
	if (statements.length === 0) {
		return;
	}
	if (typeof db.batch === 'function') {
		await db.batch(statements);
		return;
	}
	for (const statement of statements) {
		await statement.run();
	}
}
