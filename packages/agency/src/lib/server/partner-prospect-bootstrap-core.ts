const PROSPECT_GRADUATION_REQUIREMENTS = [
	'service_entitled',
	'policy_accepted',
	'contract_active',
	'billing_active',
	'identity_account_id',
	'identity_user_id',
] as const;

export interface PartnerProspectBootstrapHttpErrorLike {
	status: number;
	code: string;
	message: string;
}

interface ProspectBootstrapRequestBody {
	display_name?: string;
	workspace_account_id?: string;
	owner_email?: string;
	required_toolkits?: string[];
	lane_slug?: string;
	lane_display_name?: string;
	toolkit_profile?: string[];
	allowed_tool_prefixes?: string[];
	metadata?: Record<string, unknown>;
	lane_metadata?: Record<string, unknown>;
}

interface ProspectBootstrapRequestEventLike {
	request: Request;
	params: Record<string, string | undefined>;
	platform?: {
		env?: {
			DB?: D1Database;
			[key: string]: unknown;
		};
	};
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

export interface PartnerProspectBootstrapDeps {
	partnerKey: string;
	buildPartnerLaneHubUrl: (laneSlug: string) => string;
	defaultWorkspaceAccountId: (slug: string) => string;
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
	normalizeAllowedToolPrefixes: (raw: unknown) => string[];
	normalizeEmail: (raw: string | undefined) => string | null;
	normalizePartnerAccessLaneSlug: (value: string) => string;
	normalizePartnerSlug: (value: string) => string;
	parseJsonArray: (raw: string | null | undefined) => string[];
	parseJsonObject: (raw: string | null | undefined) => Record<string, unknown>;
	parseJsonStringArray: (raw: string | null | undefined) => string[];
	parseToolkitList: (raw: unknown) => string[];
	randomId: (prefix: string) => string;
	requirePartnerAdmin: (request: Request, env: Record<string, unknown> & { DB: D1Database }) => string;
	resolveAllowedToolPrefixes: (toolkits: string[], explicitPrefixes?: string[]) => string[];
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
	isHttpError: (error: unknown) => error is PartnerProspectBootstrapHttpErrorLike;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
	return Response.json(body, { status });
}

export function createPartnerProspectBootstrapPostHandler(deps: PartnerProspectBootstrapDeps) {
	return async ({ request, params, platform }: ProspectBootstrapRequestEventLike): Promise<Response> => {
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

			const body = (await request.json().catch(() => null)) as ProspectBootstrapRequestBody | null;
			if (!body || typeof body !== 'object') {
				return jsonResponse({ error: 'invalid_request', message: 'Invalid JSON body' }, 400);
			}

			const existingClient = await deps.getPartnerClientBySlug(env.DB, deps.partnerKey, slug);
			const existingClientMetadata = deps.parseJsonObject(existingClient?.metadata_json);
			if (existingClient && !isEditableProspectRecord(existingClientMetadata, deps)) {
				return jsonResponse(
					{
						error: 'client_already_exists',
						message: 'Client slug is already assigned to a non-prospect record.',
					},
					409,
				);
			}

			const laneSlug = deps.normalizePartnerAccessLaneSlug(body.lane_slug?.trim() || `prospect-${slug}`);
			if (!laneSlug) {
				return jsonResponse({ error: 'invalid_request', message: 'Valid lane_slug is required' }, 400);
			}

			const existingLane = existingClient ? await deps.getPartnerAccessLaneBySlug(env.DB, existingClient.id, laneSlug) : null;
			const existingLaneMetadata = deps.parseJsonObject(existingLane?.metadata_json);
			if (existingLane && !isEditableProspectRecord(existingLaneMetadata, deps)) {
				return jsonResponse(
					{
						error: 'lane_already_exists',
						message: 'Lane slug is already assigned to a non-prospect record for this client.',
					},
					409,
				);
			}

			const requiredToolkits =
				body.required_toolkits !== undefined
					? deps.parseToolkitList(body.required_toolkits)
					: deps.parseJsonArray(existingClient?.required_toolkits_json);
			const existingToolkitProfile = existingLane ? deps.parseJsonArray(existingLane.toolkit_profile_json) : [];
			const toolkitProfileSource =
				body.toolkit_profile !== undefined
					? body.toolkit_profile
					: existingToolkitProfile.length > 0
						? existingToolkitProfile
						: requiredToolkits;
			const toolkitProfile = deps.parseToolkitList([...(toolkitProfileSource ?? []), ...requiredToolkits]);
			const existingAllowedToolPrefixes = existingLane
				? deps.parseJsonStringArray(existingLane.allowed_tool_prefixes_json)
				: [];
			const explicitAllowedToolPrefixes =
				body.allowed_tool_prefixes !== undefined
					? deps.normalizeAllowedToolPrefixes(body.allowed_tool_prefixes)
					: existingAllowedToolPrefixes;
			const allowedToolPrefixes = deps.resolveAllowedToolPrefixes(toolkitProfile, explicitAllowedToolPrefixes);

			const displayName = body.display_name?.trim() || existingClient?.display_name || titleizeSlug(slug);
			const laneDisplayName =
				body.lane_display_name?.trim() || existingLane?.display_name || `Prospect Workspace - ${displayName}`;
			const workspaceAccountId =
				normalizeIdentifier(body.workspace_account_id) ??
				existingClient?.workspace_account_id ??
				deps.defaultWorkspaceAccountId(slug);
			const ownerEmail = deps.normalizeEmail(body.owner_email) ?? existingClient?.owner_email ?? null;
			const now = new Date().toISOString();
			const incomingClientMetadata =
				body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {};
			const incomingLaneMetadata =
				body.lane_metadata && typeof body.lane_metadata === 'object' && !Array.isArray(body.lane_metadata)
					? body.lane_metadata
					: {};

			const clientMetadata = buildProspectClientMetadata({
				existingMetadata: existingClientMetadata,
				incomingMetadata: incomingClientMetadata,
				actor,
				now,
				laneSlug,
			});
			const laneMetadata = buildProspectLaneMetadata({
				existingMetadata: existingLaneMetadata,
				incomingMetadata: incomingLaneMetadata,
				actor,
				now,
				clientSlug: slug,
				displayName: laneDisplayName,
				hubUrl: deps.buildPartnerLaneHubUrl(laneSlug),
				workspaceAccountId,
			});

			const rowId = existingClient?.id ?? deps.randomId('pacli');
			if (existingClient) {
				await env.DB.prepare(
					`UPDATE partner_auth_clients
         SET display_name = ?, workspace_account_id = ?, identity_account_id = ?, identity_user_id = ?,
             identity_tenant_id = ?, owner_email = ?, status = ?, required_toolkits_json = ?, metadata_json = ?,
             updated_at = datetime('now')
         WHERE id = ?`,
				)
					.bind(
						displayName,
						workspaceAccountId,
						existingClient.identity_account_id,
						existingClient.identity_user_id,
						existingClient.identity_tenant_id,
						ownerEmail,
						'initialized',
						JSON.stringify(requiredToolkits),
						JSON.stringify(clientMetadata),
						rowId,
					)
					.run();
			} else {
				await env.DB.prepare(
					`INSERT INTO partner_auth_clients (
           id, partner_key, slug, display_name, workspace_account_id, identity_account_id,
           identity_user_id, identity_tenant_id, owner_email, status, required_toolkits_json, metadata_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				)
					.bind(
						rowId,
						deps.partnerKey,
						slug,
						displayName,
						workspaceAccountId,
						null,
						null,
						null,
						ownerEmail,
						'initialized',
						JSON.stringify(requiredToolkits),
						JSON.stringify(clientMetadata),
					)
					.run();
			}

			const client = await deps.getPartnerClientBySlug(env.DB, deps.partnerKey, slug);
			if (!client) {
				return jsonResponse({ error: 'internal_error', message: 'Failed to load updated prospect client' }, 500);
			}

			const lane = await deps.upsertPartnerAccessLane(env.DB, {
				id: existingLane?.id ?? deps.randomId('palane'),
				partnerClientId: client.id,
				slug: laneSlug,
				displayName: laneDisplayName,
				identityUserId: existingLane?.identity_user_id ?? client.identity_user_id ?? null,
				ownerEmail: deps.normalizeEmail(body.owner_email) ?? existingLane?.owner_email ?? client.owner_email ?? null,
				hubUrl: deps.buildPartnerLaneHubUrl(laneSlug),
				hostKey: laneSlug,
				status: 'initialized',
				toolkitProfile,
				allowedToolPrefixes,
				metadata: laneMetadata,
			});

			return jsonResponse({
				client: serializeClient(client, deps),
				lane: serializeLane(lane, deps),
				issuance_state: {
					ready: false,
					blocked_reason: 'prospect_not_ready',
					required_graduation_checks: [...PROSPECT_GRADUATION_REQUIREMENTS],
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

function buildProspectClientMetadata(input: {
	existingMetadata: Record<string, unknown>;
	incomingMetadata: Record<string, unknown>;
	actor: string;
	now: string;
	laneSlug: string;
}): Record<string, unknown> {
	const existingProspect = asMetadataObject(input.existingMetadata.prospect_onboarding);
	return {
		...input.existingMetadata,
		...input.incomingMetadata,
		onboarding_mode: 'prospect',
		lifecycle_stage: 'prospect',
		last_updated_by: input.actor,
		prospect_onboarding: {
			...existingProspect,
			mode: 'prospect',
			stage: 'prospect',
			bootstrapped_at:
				typeof existingProspect.bootstrapped_at === 'string' ? existingProspect.bootstrapped_at : input.now,
			last_bootstrapped_at: input.now,
			bootstrapped_by: input.actor,
			default_lane_slug: input.laneSlug,
			customer_credential_issuance_blocked: true,
			backend_service_management_allowed: true,
			graduation_requirements: [...PROSPECT_GRADUATION_REQUIREMENTS],
		},
	};
}

function buildProspectLaneMetadata(input: {
	existingMetadata: Record<string, unknown>;
	incomingMetadata: Record<string, unknown>;
	actor: string;
	now: string;
	clientSlug: string;
	displayName: string;
	hubUrl: string;
	workspaceAccountId: string;
}): Record<string, unknown> {
	const existingProspect = asMetadataObject(input.existingMetadata.prospect_onboarding);
	return {
		...input.existingMetadata,
		...input.incomingMetadata,
		onboarding_mode: 'prospect',
		lifecycle_stage: 'prospect',
		client_slug: input.clientSlug,
		display_name: input.displayName,
		hub_url: input.hubUrl,
		workspace_account_id: input.workspaceAccountId,
		last_updated_by: input.actor,
		prospect_onboarding: {
			...existingProspect,
			mode: 'prospect',
			stage: 'prospect',
			bootstrapped_at:
				typeof existingProspect.bootstrapped_at === 'string' ? existingProspect.bootstrapped_at : input.now,
			last_bootstrapped_at: input.now,
			bootstrapped_by: input.actor,
			customer_credential_issuance_blocked: true,
			restricted_delivery_surface: 'partner_prospect_lane',
			allow_backend_service_management: true,
		},
	};
}

function serializeClient(client: ProspectClientRowLike, deps: PartnerProspectBootstrapDeps) {
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

function serializeLane(lane: ProspectLaneRowLike, deps: PartnerProspectBootstrapDeps) {
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
		allowed_tool_prefixes: deps.normalizeAllowedToolPrefixes(deps.parseJsonStringArray(lane.allowed_tool_prefixes_json)),
		metadata: deps.parseJsonObject(lane.metadata_json),
		created_at: lane.created_at,
		updated_at: lane.updated_at,
	};
}

function isEditableProspectRecord(
	metadata: Record<string, unknown>,
	deps: Pick<PartnerProspectBootstrapDeps, 'isProspectRecord' | 'isProspectGraduated'>,
): boolean {
	return deps.isProspectRecord(metadata) && !deps.isProspectGraduated(metadata);
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
