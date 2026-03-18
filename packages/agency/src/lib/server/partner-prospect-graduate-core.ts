interface ProspectGraduateRequestBody {
	display_name?: string;
	owner_email?: string;
	identity_account_id?: string;
	identity_user_id?: string;
	identity_tenant_id?: string;
	lane_slug?: string;
	lane_display_name?: string;
	lane_identity_user_id?: string;
	service_tier?: string;
	metadata?: Record<string, unknown>;
	lane_metadata?: Record<string, unknown>;
	consent?: {
		consent_version?: string;
		granted_by?: string;
		channel?: string;
		reference?: string;
		granted_at?: string;
		expires_at?: string;
		metadata?: Record<string, unknown>;
	};
}

interface ProspectGraduateRequestEventLike {
	request: Request;
	params: Record<string, string | undefined>;
	platform?: {
		env?: {
			DB?: D1Database;
			[key: string]: unknown;
		};
	};
}

interface ProspectGraduateHttpErrorLike {
	status: number;
	code: string;
	message: string;
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

interface ProspectConsentRowLike {
	id: string;
	granted_at: string;
}

interface AgencyMcpEntitlementRowLike {
	account_id: string | null;
	tenant_id: string | null;
	service_tier: string;
	managed_bearer_allowed: number;
	org_membership_active: number;
	service_entitled: number;
	policy_accepted: number;
	contract_active: number;
	billing_active: number;
}

interface AgencyMcpEntitlementDecisionLike {
	allowed: boolean;
	reason: string;
	account_id: string | null;
	tenant_id: string | null;
	checks: {
		managed_bearer_allowed: boolean;
		org_membership_active: boolean;
		service_entitled: boolean;
		policy_accepted: boolean;
		contract_active: boolean;
		billing_active: boolean;
	};
}

interface AgencyEntitlementSnapshotLike {
	service_tier: string;
	managed_bearer_allowed: boolean;
	org_membership_active: boolean;
	service_entitled: boolean;
	policy_accepted: boolean;
	contract_active: boolean;
	billing_active: boolean;
	approved_exception: {
		present: boolean;
		type: string | null;
		allowed_scope: string | null;
		graduation_target: string | null;
		review_by: string | null;
	};
}

export interface PartnerProspectGraduateDeps {
	partnerKey: string;
	buildAgencyEntitlementSnapshot: (
		row: AgencyMcpEntitlementRowLike | null,
		decision: AgencyMcpEntitlementDecisionLike | null,
	) => AgencyEntitlementSnapshotLike;
	evaluateAgencyMcpEntitlement: (
		row: AgencyMcpEntitlementRowLike | null,
		expected?: { accountId?: string | null; tenantId?: string | null },
	) => AgencyMcpEntitlementDecisionLike;
	getLatestActiveConsent: (db: D1Database, partnerClientId: string) => Promise<ProspectConsentRowLike | null>;
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
	normalizeEmail: (raw: string | undefined) => string | null;
	normalizePartnerAccessLaneSlug: (value: string) => string;
	normalizePartnerSlug: (value: string) => string;
	parseJsonArray: (raw: string | null | undefined) => string[];
	parseJsonObject: (raw: string | null | undefined) => Record<string, unknown>;
	parseJsonStringArray: (raw: string | null | undefined) => string[];
	parseOptionalIsoTimestamp: (raw: string | undefined) => string | null;
	randomId: (prefix: string) => string;
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
	) => Promise<AgencyMcpEntitlementRowLike | null>;
	requirePartnerAdmin: (request: Request, env: Record<string, unknown> & { DB: D1Database }) => string;
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
	isHttpError: (error: unknown) => error is ProspectGraduateHttpErrorLike;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
	return Response.json(body, { status });
}

export function createPartnerProspectGraduatePostHandler(deps: PartnerProspectGraduateDeps) {
	return async ({ request, params, platform }: ProspectGraduateRequestEventLike): Promise<Response> => {
		try {
			const env = platform?.env;
			if (!env?.DB) {
				return jsonResponse({ error: 'unavailable', message: 'Database is unavailable' }, 503);
			}

			const actor = deps.requirePartnerAdmin(request, env);
			const slug = deps.normalizePartnerSlug(params.slug ?? '');
			if (!slug) {
				return jsonResponse({ error: 'invalid_request', message: 'Prospect slug is required' }, 400);
			}

			const body = (await request.json().catch(() => null)) as ProspectGraduateRequestBody | null;
			if (!body || typeof body !== 'object') {
				return jsonResponse({ error: 'invalid_request', message: 'Invalid JSON body' }, 400);
			}

			const client = await deps.getPartnerClientBySlug(env.DB, deps.partnerKey, slug);
			if (!client) {
				return jsonResponse({ error: 'not_found', message: 'Prospect client not found' }, 404);
			}
			const clientMetadata = deps.parseJsonObject(client.metadata_json);
			if (!deps.isProspectRecord(clientMetadata) || deps.isProspectGraduated(clientMetadata)) {
				return jsonResponse(
					{
						error: 'not_prospect',
						message: 'This client is not an active prospect record. Use the standard client/lane init flow instead.',
					},
					409,
				);
			}

			const laneSlug = deps.normalizePartnerAccessLaneSlug(body.lane_slug?.trim() || `prospect-${slug}`);
			const lane = await deps.getPartnerAccessLaneBySlug(env.DB, client.id, laneSlug);
			if (!lane) {
				return jsonResponse({ error: 'not_found', message: 'Prospect lane not found' }, 404);
			}
			const laneMetadata = deps.parseJsonObject(lane.metadata_json);
			if (!deps.isProspectRecord(laneMetadata) || deps.isProspectGraduated(laneMetadata)) {
				return jsonResponse(
					{
						error: 'lane_not_prospect',
						message: 'This lane is not an active prospect lane.',
					},
					409,
				);
			}

			const identityAccountId = normalizeIdentifier(body.identity_account_id) ?? client.identity_account_id;
			const identityUserId = normalizeIdentifier(body.identity_user_id) ?? client.identity_user_id;
			const identityTenantId = normalizeIdentifier(body.identity_tenant_id) ?? client.identity_tenant_id;
			if (!identityAccountId || !identityUserId || !identityTenantId) {
				return jsonResponse(
					{
						error: 'missing_identity_mapping',
						message: 'identity_account_id, identity_user_id, and identity_tenant_id are required for prospect graduation.',
					},
					409,
				);
			}

			const ownerEmail = deps.normalizeEmail(body.owner_email) ?? client.owner_email ?? null;
			const displayName = body.display_name?.trim() || client.display_name || titleizeSlug(slug);
			const laneDisplayName = body.lane_display_name?.trim() || lane.display_name;
			const now = new Date().toISOString();
			const incomingClientMetadata =
				body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {};
			const incomingLaneMetadata =
				body.lane_metadata && typeof body.lane_metadata === 'object' && !Array.isArray(body.lane_metadata)
					? body.lane_metadata
					: {};

			const pendingClientMetadata = buildProspectPendingMetadata({
				existingMetadata: clientMetadata,
				incomingMetadata: incomingClientMetadata,
				actor,
				now,
				entitlementReason: null,
			});
			await updateProspectClient(env.DB, {
				client,
				displayName,
				ownerEmail,
				identityAccountId,
				identityUserId,
				identityTenantId,
				status: 'initialized',
				metadata: pendingClientMetadata,
			});

			const pendingLane = await deps.upsertPartnerAccessLane(env.DB, {
				id: lane.id,
				partnerClientId: client.id,
				slug: lane.slug,
				displayName: laneDisplayName,
				identityUserId: normalizeIdentifier(body.lane_identity_user_id) ?? identityUserId,
				ownerEmail: ownerEmail ?? lane.owner_email ?? null,
				hubUrl: lane.hub_url,
				hostKey: lane.host_key,
				status: 'initialized',
				toolkitProfile: deps.parseJsonArray(lane.toolkit_profile_json),
				allowedToolPrefixes: deps.parseJsonStringArray(lane.allowed_tool_prefixes_json),
				metadata: buildProspectPendingMetadata({
					existingMetadata: laneMetadata,
					incomingMetadata: incomingLaneMetadata,
					actor,
					now,
					entitlementReason: null,
				}),
			});

			const updatedClient = await deps.getPartnerClientBySlug(env.DB, deps.partnerKey, slug);
			if (!updatedClient) {
				return jsonResponse({ error: 'internal_error', message: 'Failed to load updated prospect client' }, 500);
			}

			const entitlementRow = await deps.reconcileAgencyMcpEntitlement(env.DB, {
				authSubject: identityUserId,
				authEmail: ownerEmail,
				accountId: identityAccountId,
				tenantId: identityTenantId,
				workspaceAccountId: updatedClient.workspace_account_id,
				serviceTier: body.service_tier ?? 'mcp_only',
				metadata: {
					source: 'partner_prospect_graduation',
					partner_key: deps.partnerKey,
					client_slug: updatedClient.slug,
					partner_access_lane_slug: pendingLane.slug,
					partner_access_lane_host_key: pendingLane.host_key,
				},
			});
			const entitlementDecision = deps.evaluateAgencyMcpEntitlement(entitlementRow, {
				accountId: identityAccountId,
				tenantId: identityTenantId,
			});
			const entitlementSnapshot = deps.buildAgencyEntitlementSnapshot(entitlementRow, entitlementDecision);

			if (!entitlementDecision.allowed) {
				const blockedReason = entitlementDecision.reason;
				await updateProspectClient(env.DB, {
					client: updatedClient,
					displayName,
					ownerEmail,
					identityAccountId,
					identityUserId,
					identityTenantId,
					status: 'initialized',
					metadata: buildProspectPendingMetadata({
						existingMetadata: pendingClientMetadata,
						incomingMetadata: incomingClientMetadata,
						actor,
						now,
						entitlementReason: blockedReason,
					}),
				});

				const blockedLane = await deps.upsertPartnerAccessLane(env.DB, {
					id: pendingLane.id,
					partnerClientId: updatedClient.id,
					slug: pendingLane.slug,
					displayName: pendingLane.display_name,
					identityUserId: pendingLane.identity_user_id,
					ownerEmail: pendingLane.owner_email,
					hubUrl: pendingLane.hub_url,
					hostKey: pendingLane.host_key,
					status: 'initialized',
					toolkitProfile: deps.parseJsonArray(pendingLane.toolkit_profile_json),
					allowedToolPrefixes: deps.parseJsonStringArray(pendingLane.allowed_tool_prefixes_json),
					metadata: buildProspectPendingMetadata({
						existingMetadata: deps.parseJsonObject(pendingLane.metadata_json),
						incomingMetadata: incomingLaneMetadata,
						actor,
						now,
						entitlementReason: blockedReason,
					}),
				});

				const blockedClient = await deps.getPartnerClientBySlug(env.DB, deps.partnerKey, slug);
				return jsonResponse(
					{
						error: 'graduation_blocked',
						message: `Prospect graduation is blocked: ${blockedReason}`,
						client: blockedClient ? serializeClient(blockedClient, deps) : null,
						lane: serializeLane(blockedLane, deps),
						entitlement: {
							decision: entitlementDecision,
							snapshot: entitlementSnapshot,
						},
						issuance_state: {
							ready: false,
							blocked_reason: blockedReason,
						},
					},
					409,
				);
			}

			const existingConsent = await deps.getLatestActiveConsent(env.DB, client.id);
			let consentRecordId = existingConsent?.id ?? null;
			if (!existingConsent) {
				const grantedBy = body.consent?.granted_by?.trim();
				if (!grantedBy) {
					return jsonResponse(
						{
							error: 'consent_required',
							message: 'Prospect graduation requires an active consent record or consent.granted_by in the request body.',
							client: serializeClient(updatedClient, deps),
							lane: serializeLane(pendingLane, deps),
							entitlement: {
								decision: entitlementDecision,
								snapshot: entitlementSnapshot,
							},
							issuance_state: {
								ready: false,
								blocked_reason: 'consent_required',
							},
						},
						409,
					);
				}

				consentRecordId = deps.randomId('paconsent');
				await env.DB.prepare(
					`INSERT INTO partner_auth_consents (
           id, partner_client_id, consent_version, consent_granted_by, consent_channel,
           consent_reference, granted_at, expires_at, metadata_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				)
					.bind(
						consentRecordId,
						client.id,
						body.consent?.consent_version?.trim() || 'v1',
						grantedBy.slice(0, 255),
						body.consent?.channel?.trim() || 'portal',
						body.consent?.reference?.trim() || null,
						deps.parseOptionalIsoTimestamp(body.consent?.granted_at) ?? now,
						deps.parseOptionalIsoTimestamp(body.consent?.expires_at),
						JSON.stringify(
							body.consent?.metadata &&
								typeof body.consent.metadata === 'object' &&
								!Array.isArray(body.consent.metadata)
								? body.consent.metadata
								: {},
						),
					)
					.run();
			}

			await updateProspectClient(env.DB, {
				client: updatedClient,
				displayName,
				ownerEmail,
				identityAccountId,
				identityUserId,
				identityTenantId,
				status: 'active',
				metadata: buildProspectGraduatedMetadata({
					existingMetadata: pendingClientMetadata,
					incomingMetadata: incomingClientMetadata,
					actor,
					now,
					entitlementReason: entitlementDecision.reason,
				}),
			});

			const graduatedLane = await deps.upsertPartnerAccessLane(env.DB, {
				id: pendingLane.id,
				partnerClientId: updatedClient.id,
				slug: pendingLane.slug,
				displayName: pendingLane.display_name,
				identityUserId: pendingLane.identity_user_id,
				ownerEmail: pendingLane.owner_email,
				hubUrl: pendingLane.hub_url,
				hostKey: pendingLane.host_key,
				status: 'active',
				toolkitProfile: deps.parseJsonArray(pendingLane.toolkit_profile_json),
				allowedToolPrefixes: deps.parseJsonStringArray(pendingLane.allowed_tool_prefixes_json),
				metadata: buildProspectGraduatedMetadata({
					existingMetadata: deps.parseJsonObject(pendingLane.metadata_json),
					incomingMetadata: incomingLaneMetadata,
					actor,
					now,
					entitlementReason: entitlementDecision.reason,
				}),
			});

			const graduatedClient = await deps.getPartnerClientBySlug(env.DB, deps.partnerKey, slug);
			if (!graduatedClient) {
				return jsonResponse({ error: 'internal_error', message: 'Failed to load graduated client' }, 500);
			}

			return jsonResponse({
				client: serializeClient(graduatedClient, deps),
				lane: serializeLane(graduatedLane, deps),
				consent_record_id: consentRecordId,
				entitlement: {
					decision: entitlementDecision,
					snapshot: entitlementSnapshot,
				},
				issuance_state: {
					ready: true,
					blocked_reason: null,
				},
			});
		} catch (error) {
			if (deps.isHttpError(error)) {
				return jsonResponse({ error: error.code, message: error.message }, error.status);
			}

			return jsonResponse(
				{
					error: 'internal_error',
					message: error instanceof Error ? error.message : 'Unexpected error',
				},
				500,
			);
		}
	};
}

function updateProspectClient(
	db: D1Database,
	input: {
		client: ProspectClientRowLike;
		displayName: string;
		ownerEmail: string | null;
		identityAccountId: string;
		identityUserId: string;
		identityTenantId: string;
		status: ProspectClientRowLike['status'];
		metadata: Record<string, unknown>;
	},
) {
	return db
		.prepare(
			`UPDATE partner_auth_clients
       SET display_name = ?, identity_account_id = ?, identity_user_id = ?, identity_tenant_id = ?,
           owner_email = ?, status = ?, metadata_json = ?, updated_at = datetime('now')
       WHERE id = ?`,
		)
		.bind(
			input.displayName,
			input.identityAccountId,
			input.identityUserId,
			input.identityTenantId,
			input.ownerEmail,
			input.status,
			JSON.stringify(input.metadata),
			input.client.id,
		)
		.run();
}

function buildProspectPendingMetadata(input: {
	existingMetadata: Record<string, unknown>;
	incomingMetadata: Record<string, unknown>;
	actor: string;
	now: string;
	entitlementReason: string | null;
}): Record<string, unknown> {
	const prospect = asMetadataObject(input.existingMetadata.prospect_onboarding);
	return {
		...input.existingMetadata,
		...input.incomingMetadata,
		onboarding_mode: 'prospect',
		lifecycle_stage: 'prospect',
		last_updated_by: input.actor,
		prospect_onboarding: {
			...prospect,
			mode: 'prospect',
			stage: 'prospect',
			last_graduation_check_at: input.now,
			last_graduation_check_by: input.actor,
			last_graduation_check_reason: input.entitlementReason,
			customer_credential_issuance_blocked: true,
		},
	};
}

function buildProspectGraduatedMetadata(input: {
	existingMetadata: Record<string, unknown>;
	incomingMetadata: Record<string, unknown>;
	actor: string;
	now: string;
	entitlementReason: string;
}): Record<string, unknown> {
	const prospect = asMetadataObject(input.existingMetadata.prospect_onboarding);
	return {
		...input.existingMetadata,
		...input.incomingMetadata,
		onboarding_mode: 'client',
		lifecycle_stage: 'active',
		last_updated_by: input.actor,
		prospect_onboarding: {
			...prospect,
			stage: 'graduated',
			graduated_at: input.now,
			graduated_by: input.actor,
			graduation_reason: input.entitlementReason,
			customer_credential_issuance_blocked: false,
		},
	};
}

function serializeClient(client: ProspectClientRowLike, deps: PartnerProspectGraduateDeps) {
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

function serializeLane(lane: ProspectLaneRowLike, deps: PartnerProspectGraduateDeps) {
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

function normalizeIdentifier(raw: string | undefined): string | null {
	if (!raw) return null;
	const value = raw.trim();
	return value.length > 0 ? value.slice(0, 255) : null;
}

function titleizeSlug(raw: string): string {
	return raw
		.split('-')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function asMetadataObject(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	return value as Record<string, unknown>;
}
