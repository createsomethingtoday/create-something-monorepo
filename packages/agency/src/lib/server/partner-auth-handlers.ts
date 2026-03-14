import { json } from '@sveltejs/kit';
import {
	type PartnerAuthAccessLaneRow,
	type PartnerAuthToolkitAccountRow,
	type PartnerAuthToolkitPinRow,
	HALF_DOZEN_PARTNER_KEY,
	PartnerAuthHttpError,
	authorizePartnerToolkitAdminAction,
	buildPartnerLaneHubUrl,
	buildPartnerLaneNotionBridgeUrl,
	buildPartnerLaneWorkerName,
	defaultToolkitComposioUserId,
	defaultWorkspaceAccountId,
	getComposioClient,
	getLatestActiveConsent,
	getPartnerAccessLaneBySlug,
	getPartnerClientBootstrapDefaults,
	getPartnerClientBySlug,
	getRequestTraceContext,
	insertPartnerAccessDelivery,
	normalizeAllowedToolPrefixes,
	normalizeEmail,
	normalizePartnerAccessLaneSlug,
	normalizePartnerSlug,
	normalizeToolkitSlug,
	parseJsonArray,
	parseJsonObject,
	parseJsonStringArray,
	parseOptionalIsoTimestamp,
	parseToolkitList,
	postIdentityAdmin,
	randomId,
	requirePartnerAdmin,
	resolveAllowedToolPrefixes,
	resolvePartnerLaneBaselineToolkits,
	resolvePartnerObservabilityBaseline,
	resolvePartnerToolkitAuthConfigId,
	tokenPreview,
	type PartnerConnectorTargetConfig,
	upsertPartnerAccessLane,
} from '$lib/server/partner-auth';
import { reconcileAgencyMcpEntitlement } from '$lib/server/mcp-entitlements';

type RouteEventLike = {
	request: Request;
	url: URL;
	params: Record<string, string | undefined>;
	platform?: App.Platform;
};

interface InitClientRequestBody {
	display_name?: string;
	workspace_account_id?: string;
	identity_account_id?: string;
	identity_user_id?: string;
	identity_tenant_id?: string;
	owner_email?: string;
	required_toolkits?: string[];
	status?: 'initialized' | 'active' | 'paused' | 'sunset' | 'disabled';
	metadata?: Record<string, unknown>;
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

interface InitLaneRequestBody {
	display_name?: string;
	identity_user_id?: string;
	owner_email?: string;
	hub_url?: string;
	host_key?: string;
	status?: PartnerAuthAccessLaneRow['status'];
	toolkit_profile?: string[];
	allowed_tool_prefixes?: string[];
	metadata?: Record<string, unknown>;
}

interface MintAccessRequestBody {
	host?: string;
	toolkit_profile?: string[];
	tool_mode?: 'read_only' | 'read_write';
	ttl_seconds?: number;
	delivery_channel?: 'portal' | 'secure_note' | 'email' | 'manual';
	recipient?: string;
	metadata?: Record<string, unknown>;
}

interface MintLaneAccessRequestBody {
	tool_mode?: 'read_only' | 'read_write';
	ttl_seconds?: number;
	delivery_channel?: 'portal' | 'secure_note' | 'email' | 'manual';
	recipient?: string;
	metadata?: Record<string, unknown>;
}

interface IssueBearerTokenRequestBody {
	toolkit_profile?: string[];
	tool_mode?: 'read_only' | 'read_write';
	delivery_channel?: 'portal' | 'secure_note' | 'email' | 'manual';
	recipient?: string;
	metadata?: Record<string, unknown>;
}

interface IssueLaneBearerTokenRequestBody {
	tool_mode?: 'read_only' | 'read_write';
	delivery_channel?: 'portal' | 'secure_note' | 'email' | 'manual';
	recipient?: string;
	metadata?: Record<string, unknown>;
}

interface ConnectLinkRequestBody {
	callback_url?: string;
	auth_config_id?: string;
	metadata?: Record<string, unknown>;
}

interface CreateToolkitAccountBody {
	account_slug?: string;
	display_label?: string;
	sync_enabled?: boolean;
	auth_config_id?: string;
	metadata?: Record<string, unknown>;
}

interface PinAccountBody {
	tool_name?: string;
	metadata?: Record<string, unknown>;
}

interface AdminMintResponse {
	session_id: string;
	token: string;
	mcp_url: string;
	expires_at: string;
	account_id: string;
	tenant_id: string;
	user_id: string;
	host: string;
	bound_host?: string | null;
	tool_mode: 'read_only' | 'read_write';
	toolkit_profile: string[];
	allowed_tool_prefixes: string[];
	policy: {
		policy_id: string;
		decision: 'allow' | 'require_human_review' | 'block';
		evaluation_path: 'legacy' | 'primary' | 'fallback';
		matched_rule_ids?: string[];
		policy_hash: string | null;
		fallback_used: boolean;
		rollout_mode: 'legacy_enforce' | 'shadow' | 'polar_enforce';
		canary_percent: number;
		reason: string;
	};
}

interface IssueManagedTokenResponse {
	token_id: string;
	token: string;
	token_prefix: string;
	account_id: string;
	tenant_id: string;
	auth_subject: string;
	auth_email: string | null;
	tool_mode: 'read_only' | 'read_write';
	toolkit_profile: string[];
	allowed_tool_prefixes: string[];
	bound_host?: string | null;
}

type ConnectedAccountShape = {
	id?: string;
	nanoid?: string;
	status?: string;
	userId?: string;
	entityId?: string;
	authConfigId?: string;
	toolkit?: {
		slug?: string;
		name?: string;
	};
	appName?: string;
	app?: string;
	createdAt?: string;
	updatedAt?: string;
};

const ALLOWED_CLIENT_STATUSES = new Set(['initialized', 'active', 'paused', 'sunset', 'disabled']);
const ALLOWED_LANE_STATUSES = new Set(['initialized', 'active', 'paused', 'sunset', 'disabled']);

export async function handlePartnerClientInit(event: RouteEventLike): Promise<Response> {
	try {
		const env = requireRouteEnv(event.platform);
		const actor = requirePartnerAdmin(event.request, env);
		const partnerKey = resolvePartnerKey(event.params.partnerKey);
		const slug = normalizePartnerSlug(event.params.slug ?? '');
		if (!partnerKey || !slug) {
			return json({ error: 'invalid_request', message: 'Partner key and client slug are required' }, { status: 400 });
		}

		const body = (await event.request.json().catch(() => null)) as InitClientRequestBody | null;
		if (!body || typeof body !== 'object') {
			return json({ error: 'invalid_request', message: 'Invalid JSON body' }, { status: 400 });
		}

		const defaults = getPartnerClientBootstrapDefaults(partnerKey, slug);
		const existing = await getPartnerClientBySlug(env.DB, partnerKey, slug);
		const existingMetadata = parseJsonObject(existing?.metadata_json);
		const incomingMetadata = objectBody(body.metadata);
		const toolkitAuthConfigMap = mergeStringMaps(
			defaults?.toolkitAuthConfigMap,
			asStringMap(existingMetadata.toolkit_auth_config_map),
			asStringMap(incomingMetadata.toolkit_auth_config_map),
		);
		const connectorTargets = mergeConnectorTargets(
			defaults?.connectorTargets,
			asConnectorTargetMap(existingMetadata.connector_targets),
			asConnectorTargetMap(incomingMetadata.connector_targets),
		);
		const observabilityBaseline = resolvePartnerObservabilityBaseline(existingMetadata);
		const metadata = withTraceContext(event.request, {
			...(defaults?.metadata ?? {}),
			...existingMetadata,
			...incomingMetadata,
			partner_key: partnerKey,
			client_slug: slug,
			pilot_connector_targets: Object.keys(connectorTargets),
			shared_connector_accounts:
				incomingMetadata.shared_connector_accounts ??
				existingMetadata.shared_connector_accounts ??
				defaults?.metadata?.shared_connector_accounts ??
				false,
			toolkit_auth_config_map: toolkitAuthConfigMap,
			connector_targets: connectorTargets,
			required_observability: observabilityBaseline,
			last_updated_by: actor,
		});

		const requiredToolkits =
			body.required_toolkits !== undefined
				? parseToolkitList(body.required_toolkits)
				: existing
					? parseJsonArray(existing.required_toolkits_json)
					: defaults?.requiredToolkits ?? [];
		const displayName = body.display_name?.trim() || existing?.display_name || defaults?.displayName || slug;
		const workspaceAccountId =
			normalizeIdentifier(body.workspace_account_id) ??
			existing?.workspace_account_id ??
			defaultWorkspaceAccountId(slug);
		const identityAccountId = normalizeIdentifier(body.identity_account_id) ?? existing?.identity_account_id ?? null;
		const identityUserId = normalizeIdentifier(body.identity_user_id) ?? existing?.identity_user_id ?? null;
		const identityTenantId =
			normalizeIdentifier(body.identity_tenant_id) ?? existing?.identity_tenant_id ?? normalizeIdentifier(slug);
		const ownerEmail = normalizeEmail(body.owner_email) ?? existing?.owner_email ?? null;
		const status =
			body.status && ALLOWED_CLIENT_STATUSES.has(body.status) ? body.status : existing?.status ?? 'initialized';
		const rowId = existing?.id ?? randomId('pacli');

		if (existing) {
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
					identityAccountId,
					identityUserId,
					identityTenantId,
					ownerEmail,
					status,
					JSON.stringify(requiredToolkits),
					JSON.stringify(metadata),
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
					partnerKey,
					slug,
					displayName,
					workspaceAccountId,
					identityAccountId,
					identityUserId,
					identityTenantId,
					ownerEmail,
					status,
					JSON.stringify(requiredToolkits),
					JSON.stringify(metadata),
				)
				.run();
		}

		let consentRecordId: string | null = null;
		if (body.consent?.granted_by?.trim()) {
			consentRecordId = await insertConsent(env.DB, rowId, body.consent);
		}

		const updated = await getPartnerClientBySlug(env.DB, partnerKey, slug);
		if (!updated) {
			return json({ error: 'internal_error', message: 'Failed to load updated partner client' }, { status: 500 });
		}

		if (updated.identity_user_id) {
			await reconcileAgencyMcpEntitlement(env.DB, {
				authSubject: updated.identity_user_id,
				authEmail: updated.owner_email,
				accountId: updated.identity_account_id ?? updated.workspace_account_id,
				tenantId: updated.identity_tenant_id ?? slug,
				workspaceAccountId: updated.workspace_account_id,
				serviceTier: 'mcp_only',
				metadata: {
					partner_key: updated.partner_key,
					client_slug: updated.slug,
					observability_baseline: observabilityBaseline,
				},
			});
		}

		return json({
			client: serializeClient(updated),
			consent_record_id: consentRecordId,
		});
	} catch (error) {
		return toPartnerError(error);
	}
}

export async function handlePartnerLaneInit(event: RouteEventLike): Promise<Response> {
	try {
		const env = requireRouteEnv(event.platform);
		const actor = requirePartnerAdmin(event.request, env);
		const partnerKey = resolvePartnerKey(event.params.partnerKey);
		const clientSlug = normalizePartnerSlug(event.params.slug ?? '');
		const laneSlug = normalizePartnerAccessLaneSlug(event.params.laneSlug ?? '');
		if (!partnerKey || !clientSlug || !laneSlug) {
			return json({ error: 'invalid_request', message: 'Partner key, client slug, and lane slug are required' }, { status: 400 });
		}

		const client = await getPartnerClientBySlug(env.DB, partnerKey, clientSlug);
		if (!client) {
			return json({ error: 'not_found', message: 'Partner client not found' }, { status: 404 });
		}

		const body = (await event.request.json().catch(() => null)) as InitLaneRequestBody | null;
		if (!body || typeof body !== 'object') {
			return json({ error: 'invalid_request', message: 'Invalid JSON body' }, { status: 400 });
		}

		const existing = await getPartnerAccessLaneBySlug(env.DB, client.id, laneSlug);
		const existingMetadata = parseJsonObject(existing?.metadata_json);
		const incomingMetadata = objectBody(body.metadata);
		const clientMetadata = parseJsonObject(client.metadata_json);
		const clientRequiredToolkits = parseJsonArray(client.required_toolkits_json);
		const laneBaselineToolkits = resolvePartnerLaneBaselineToolkits(partnerKey, client.slug);
		const baselineToolkitProfile = parseToolkitList([...clientRequiredToolkits, ...laneBaselineToolkits]);
		const toolkitProfile =
			body.toolkit_profile !== undefined
				? parseToolkitList([...body.toolkit_profile, ...baselineToolkitProfile])
				: existing
					? parseToolkitList([...parseJsonArray(existing.toolkit_profile_json), ...baselineToolkitProfile])
					: baselineToolkitProfile;
		const explicitAllowedToolPrefixes =
			body.allowed_tool_prefixes !== undefined
				? normalizeAllowedToolPrefixes(body.allowed_tool_prefixes)
				: existing
					? parseJsonStringArray(existing.allowed_tool_prefixes_json)
					: [];
		const partnerBridgePrefixes = resolvePartnerBridgePrefixes(partnerKey, client.slug);
		const allowedToolPrefixes = resolveAllowedToolPrefixes(toolkitProfile, [
			...partnerBridgePrefixes,
			...explicitAllowedToolPrefixes,
		]);
		const displayName =
			body.display_name?.trim() || existing?.display_name || defaultLaneDisplayName(laneSlug, client.slug, client.display_name);
		const canonicalHubUrl = buildPartnerLaneHubUrl(laneSlug);
		if (body.hub_url?.trim() && body.hub_url.trim() !== canonicalHubUrl) {
			return json(
				{
					error: 'invalid_request',
					message: `hub_url must match the canonical named-lane URL: ${canonicalHubUrl}`,
				},
				{ status: 400 },
			);
		}

		const canonicalHostKey = laneSlug;
		if (body.host_key && normalizePartnerAccessLaneSlug(body.host_key) !== canonicalHostKey) {
			return json(
				{
					error: 'invalid_request',
					message: `host_key must match the lane slug: ${canonicalHostKey}`,
				},
				{ status: 400 },
			);
		}

		const observabilityBaseline = resolvePartnerObservabilityBaseline(existingMetadata);
		const approvedException = mergeApprovedException(
			existingMetadata,
			incomingMetadata,
			laneSlug,
			displayName,
			canonicalHubUrl,
		);
		const metadata = withTraceContext(event.request, {
			...clientMetadata,
			...existingMetadata,
			...incomingMetadata,
			partner_key: client.partner_key,
			client_slug: client.slug,
			client_display_name: client.display_name,
			lane_slug: laneSlug,
			display_name: displayName,
			hub_worker_name: buildPartnerLaneWorkerName(laneSlug),
			hub_url: canonicalHubUrl,
			host_key: canonicalHostKey,
			credential_source: 'Partner-managed named lane',
			required_observability: observabilityBaseline,
			tool_mode_default: 'read_write',
			approved_exception: approvedException,
			last_updated_by: actor,
			...(partnerKey === HALF_DOZEN_PARTNER_KEY
				? {
						notion_bridge_url:
							typeof incomingMetadata.notion_bridge_url === 'string' && incomingMetadata.notion_bridge_url.trim().length > 0
								? incomingMetadata.notion_bridge_url.trim()
								: buildPartnerLaneNotionBridgeUrl(client.slug),
					}
				: {}),
		});
		const status =
			body.status && ALLOWED_LANE_STATUSES.has(body.status) ? body.status : existing?.status ?? client.status ?? 'active';
		const ownerEmail = normalizeEmail(body.owner_email) ?? existing?.owner_email ?? client.owner_email ?? null;
		const identityUserId =
			normalizeIdentifier(body.identity_user_id) ?? existing?.identity_user_id ?? client.identity_user_id ?? null;
		const lane = await upsertPartnerAccessLane(env.DB, {
			id: existing?.id ?? randomId('palane'),
			partnerClientId: client.id,
			slug: laneSlug,
			displayName,
			identityUserId,
			ownerEmail,
			hubUrl: canonicalHubUrl,
			hostKey: canonicalHostKey,
			status,
			toolkitProfile,
			allowedToolPrefixes,
			metadata,
		});

		if (identityUserId) {
			await reconcileAgencyMcpEntitlement(env.DB, {
				authSubject: identityUserId,
				authEmail: ownerEmail,
				accountId: client.identity_account_id ?? client.workspace_account_id,
				tenantId: client.identity_tenant_id ?? client.slug,
				workspaceAccountId: client.workspace_account_id,
				serviceTier: 'mcp_only',
				metadata: {
					partner_key: client.partner_key,
					client_slug: client.slug,
					approved_exception: approvedException,
					partner_access_lane_slug: lane.slug,
					partner_access_lane_display_name: lane.display_name,
					partner_access_lane_url: lane.hub_url,
					partner_access_lane_host_key: lane.host_key,
					observability_baseline: observabilityBaseline,
				},
			});
		}

		return json({
			client_slug: client.slug,
			lane: serializeLane(lane),
		});
	} catch (error) {
		return toPartnerError(error);
	}
}

export async function handlePartnerClientAccessMint(event: RouteEventLike): Promise<Response> {
	try {
		const env = requireRouteEnv(event.platform);
		const actor = requirePartnerAdmin(event.request, env);
		const partnerKey = resolvePartnerKey(event.params.partnerKey);
		const slug = normalizePartnerSlug(event.params.slug ?? '');
		if (!partnerKey || !slug) {
			return json({ error: 'invalid_request', message: 'Partner key and client slug are required' }, { status: 400 });
		}

		const client = await getPartnerClientBySlug(env.DB, partnerKey, slug);
		if (!client) {
			return json({ error: 'not_found', message: 'Partner client not found' }, { status: 404 });
		}
		if (!client.identity_account_id) {
			return json(
				{
					error: 'missing_identity_account',
					message: 'Client is missing identity_account_id. Initialize the client with identity mapping first.',
				},
				{ status: 409 },
			);
		}

		const consent = await getLatestActiveConsent(env.DB, client.id);
		if (!consent) {
			return json({ error: 'consent_required', message: 'No active consent record found for this client.' }, { status: 409 });
		}

		const body = (await event.request.json().catch(() => null)) as MintAccessRequestBody | null;
		const requiredToolkits = parseJsonArray(client.required_toolkits_json);
		const toolkitProfile = body?.toolkit_profile !== undefined ? parseToolkitList(body.toolkit_profile) : requiredToolkits;
		const observabilityBaseline = resolvePartnerObservabilityBaseline(parseJsonObject(client.metadata_json));
		const metadata = buildClientMetadata(event.request, actor, client, {
			consent_record_id: consent.id,
			consent_granted_at: consent.granted_at,
			observability_baseline: observabilityBaseline,
			...(objectBody(body?.metadata)),
		});

		const mintResponse = await postIdentityAdmin<AdminMintResponse>(env, '/v1/mcp/sessions/admin-mint', {
			account_id: client.identity_account_id,
			host: body?.host ?? `partner_${slug}`,
			tool_mode: body?.tool_mode ?? 'read_write',
			ttl_seconds: body?.ttl_seconds,
			toolkit_profile: toolkitProfile,
			consent_record_id: consent.id,
			consent_granted_at: consent.granted_at,
			actor,
			metadata,
		});
		const endpoint = resolveMcpEndpoint(mintResponse.mcp_url, env.MCP_HUB_GATEWAY_BEARER);
		const accessHeaders: Record<string, string> = {
			'X-MCP-Session-Token': mintResponse.token,
		};
		if (endpoint.gatewayBearerToken) {
			accessHeaders.Authorization = `Bearer ${endpoint.gatewayBearerToken}`;
		}

		await insertPartnerAccessDelivery(env.DB, {
			id: randomId('padelivery'),
			partnerClientId: client.id,
			deliveryType: 'strict_session_bundle',
			deliveryChannel: body?.delivery_channel ?? 'portal',
			deliveredBy: actor,
			recipient: body?.recipient?.trim() || client.owner_email || null,
			artifactRef: mintResponse.session_id,
			expiresAt: mintResponse.expires_at,
			metadata: buildClientMetadata(event.request, actor, client, {
				account_id: mintResponse.account_id,
				tenant_id: mintResponse.tenant_id,
				host: mintResponse.host,
				tool_mode: mintResponse.tool_mode,
				toolkit_profile: mintResponse.toolkit_profile,
				allowed_tool_prefixes: mintResponse.allowed_tool_prefixes,
				session_token_preview: tokenPreview(mintResponse.token),
				gateway_auth_mode: endpoint.gatewayBearerToken ? 'bearer_header' : 'none',
				policy: mintResponse.policy,
				observability_baseline: observabilityBaseline,
			}),
		});

		return json({
			client_slug: client.slug,
			workspace_account_id: client.workspace_account_id,
			identity_account_id: mintResponse.account_id,
			access_bundle: {
				mode: 'strict',
				mcp_url: endpoint.url,
				headers: accessHeaders,
				session: {
					session_id: mintResponse.session_id,
					expires_at: mintResponse.expires_at,
					host: mintResponse.host,
					tool_mode: mintResponse.tool_mode,
					toolkit_profile: mintResponse.toolkit_profile,
					allowed_tool_prefixes: mintResponse.allowed_tool_prefixes,
				},
				policy: mintResponse.policy,
			},
		});
	} catch (error) {
		return toPartnerError(error);
	}
}

export async function handlePartnerLaneAccessMint(event: RouteEventLike): Promise<Response> {
	try {
		const env = requireRouteEnv(event.platform);
		const actor = requirePartnerAdmin(event.request, env);
		const partnerKey = resolvePartnerKey(event.params.partnerKey);
		const clientSlug = normalizePartnerSlug(event.params.slug ?? '');
		const laneSlug = normalizePartnerAccessLaneSlug(event.params.laneSlug ?? '');
		if (!partnerKey || !clientSlug || !laneSlug) {
			return json({ error: 'invalid_request', message: 'Partner key, client slug, and lane slug are required' }, { status: 400 });
		}

		const client = await getPartnerClientBySlug(env.DB, partnerKey, clientSlug);
		if (!client) {
			return json({ error: 'not_found', message: 'Partner client not found' }, { status: 404 });
		}
		const lane = await getPartnerAccessLaneBySlug(env.DB, client.id, laneSlug);
		if (!lane) {
			return json({ error: 'not_found', message: 'Named access lane not found' }, { status: 404 });
		}
		if (!isIssuableStatus(client.status) || !isIssuableStatus(lane.status)) {
			return json({ error: 'lane_not_active', message: 'Client or lane is not active for strict-session minting.' }, { status: 409 });
		}
		if (!client.identity_account_id) {
			return json(
				{
					error: 'missing_identity_account',
					message: 'Client is missing identity_account_id. Initialize the client with identity mapping first.',
				},
				{ status: 409 },
			);
		}
		const consent = await getLatestActiveConsent(env.DB, client.id);
		if (!consent) {
			return json({ error: 'consent_required', message: 'No active consent record found for this client.' }, { status: 409 });
		}

		const body = (await event.request.json().catch(() => null)) as MintLaneAccessRequestBody | null;
		const laneMetadata = parseJsonObject(lane.metadata_json);
		const observabilityBaseline = resolvePartnerObservabilityBaseline(laneMetadata);
		const mintResponse = await postIdentityAdmin<AdminMintResponse>(env, '/v1/mcp/sessions/admin-mint', {
			account_id: client.identity_account_id,
			host: lane.host_key,
			bound_host: lane.host_key,
			tool_mode: body?.tool_mode ?? 'read_write',
			ttl_seconds: body?.ttl_seconds,
			toolkit_profile: parseJsonArray(lane.toolkit_profile_json),
			allowed_tool_prefixes: parseJsonStringArray(lane.allowed_tool_prefixes_json),
			consent_record_id: consent.id,
			consent_granted_at: consent.granted_at,
			actor,
			metadata: buildLaneMetadata(event.request, actor, client, lane, {
				credential_source: 'Partner-managed named lane',
				consent_record_id: consent.id,
				consent_granted_at: consent.granted_at,
				observability_baseline: observabilityBaseline,
				...(objectBody(body?.metadata)),
			}),
		});
		const endpoint = resolveMcpEndpoint(lane.hub_url, env.MCP_HUB_GATEWAY_BEARER);
		const accessHeaders: Record<string, string> = {
			'X-MCP-Session-Token': mintResponse.token,
		};
		if (endpoint.gatewayBearerToken) {
			accessHeaders.Authorization = `Bearer ${endpoint.gatewayBearerToken}`;
		}

		await insertPartnerAccessDelivery(env.DB, {
			id: randomId('padelivery'),
			partnerClientId: client.id,
			deliveryType: 'strict_session_bundle',
			deliveryChannel: body?.delivery_channel ?? 'portal',
			deliveredBy: actor,
			recipient: body?.recipient?.trim() || lane.owner_email || client.owner_email || null,
			artifactRef: mintResponse.session_id,
			expiresAt: mintResponse.expires_at,
			metadata: buildLaneMetadata(event.request, actor, client, lane, {
				account_id: mintResponse.account_id,
				tenant_id: mintResponse.tenant_id,
				host: mintResponse.host,
				bound_host: mintResponse.bound_host ?? lane.host_key,
				tool_mode: mintResponse.tool_mode,
				toolkit_profile: mintResponse.toolkit_profile,
				allowed_tool_prefixes: mintResponse.allowed_tool_prefixes,
				session_token_preview: tokenPreview(mintResponse.token),
				gateway_auth_mode: endpoint.gatewayBearerToken ? 'bearer_header' : 'none',
				policy: mintResponse.policy,
				observability_baseline: observabilityBaseline,
			}),
		});

		return json({
			client_slug: client.slug,
			lane_slug: lane.slug,
			lane_display_name: lane.display_name,
			hub_url: lane.hub_url,
			workspace_account_id: client.workspace_account_id,
			identity_account_id: mintResponse.account_id,
			access_bundle: {
				mode: 'strict',
				mcp_url: endpoint.url,
				headers: accessHeaders,
				session: {
					session_id: mintResponse.session_id,
					expires_at: mintResponse.expires_at,
					host: mintResponse.host,
					bound_host: mintResponse.bound_host ?? lane.host_key,
					tool_mode: mintResponse.tool_mode,
					toolkit_profile: mintResponse.toolkit_profile,
					allowed_tool_prefixes: mintResponse.allowed_tool_prefixes,
				},
				policy: mintResponse.policy,
			},
		});
	} catch (error) {
		return toPartnerError(error);
	}
}

export async function handlePartnerClientBearerIssue(event: RouteEventLike): Promise<Response> {
	try {
		const env = requireRouteEnv(event.platform);
		const actor = requirePartnerAdmin(event.request, env);
		const partnerKey = resolvePartnerKey(event.params.partnerKey);
		const slug = normalizePartnerSlug(event.params.slug ?? '');
		if (!partnerKey || !slug) {
			return json({ error: 'invalid_request', message: 'Partner key and client slug are required' }, { status: 400 });
		}

		const client = await getPartnerClientBySlug(env.DB, partnerKey, slug);
		if (!client) {
			return json({ error: 'not_found', message: 'Partner client not found' }, { status: 404 });
		}
		if (!client.identity_user_id) {
			return json(
				{
					error: 'missing_identity_user',
					message: 'Client is missing identity_user_id. Managed bearer tokens require a mapped Auth0 subject.',
				},
				{ status: 409 },
			);
		}
		if (!client.identity_account_id || !client.identity_tenant_id) {
			return json(
				{
					error: 'missing_identity_mapping',
					message: 'Client is missing identity account or tenant mapping.',
				},
				{ status: 409 },
			);
		}
		const consent = await getLatestActiveConsent(env.DB, client.id);
		if (!consent) {
			return json({ error: 'consent_required', message: 'No active consent record found for this client.' }, { status: 409 });
		}

		const body = (await event.request.json().catch(() => null)) as IssueBearerTokenRequestBody | null;
		const toolkitProfile =
			Array.isArray(body?.toolkit_profile) && body?.toolkit_profile.length > 0
				? parseToolkitList(body.toolkit_profile)
				: parseJsonArray(client.required_toolkits_json);
		const observabilityBaseline = resolvePartnerObservabilityBaseline(parseJsonObject(client.metadata_json));
		await reconcileAgencyMcpEntitlement(env.DB, {
			authSubject: client.identity_user_id,
			authEmail: client.owner_email,
			accountId: client.identity_account_id,
			tenantId: client.identity_tenant_id,
			workspaceAccountId: client.workspace_account_id,
			serviceTier: 'mcp_only',
			metadata: {
				partner_key: client.partner_key,
				client_slug: client.slug,
				observability_baseline: observabilityBaseline,
			},
		});

		const issued = await postIdentityAdmin<IssueManagedTokenResponse>(env, '/v1/mcp/long-lived-tokens/admin-issue', {
			auth_subject: client.identity_user_id,
			auth_email: client.owner_email,
			account_id: client.identity_account_id,
			tenant_id: client.identity_tenant_id,
			toolkit_profile: toolkitProfile,
			tool_mode: body?.tool_mode ?? 'read_write',
			actor,
			metadata: buildClientMetadata(event.request, actor, client, {
				issued_via: 'partner_managed_bearer',
				consent_record_id: consent.id,
				consent_granted_at: consent.granted_at,
				observability_baseline: observabilityBaseline,
				...(objectBody(body?.metadata)),
			}),
		});

		await insertPartnerAccessDelivery(env.DB, {
			id: randomId('padelivery'),
			partnerClientId: client.id,
			deliveryType: 'managed_bearer_bundle',
			deliveryChannel: body?.delivery_channel ?? 'portal',
			deliveredBy: actor,
			recipient: body?.recipient?.trim() || client.owner_email || null,
			artifactRef: issued.token_id,
			expiresAt: null,
			metadata: buildClientMetadata(event.request, actor, client, {
				account_id: issued.account_id,
				tenant_id: issued.tenant_id,
				auth_subject: issued.auth_subject,
				auth_email: issued.auth_email,
				token_prefix: issued.token_prefix,
				token_preview: tokenPreview(issued.token),
				tool_mode: issued.tool_mode,
				toolkit_profile: issued.toolkit_profile,
				allowed_tool_prefixes: issued.allowed_tool_prefixes,
				consent_record_id: consent.id,
				observability_baseline: observabilityBaseline,
			}),
		});

		return json({
			client_slug: client.slug,
			workspace_account_id: client.workspace_account_id,
			identity_account_id: issued.account_id,
			identity_user_id: issued.auth_subject,
			bearer_bundle: {
				mode: 'managed_bearer',
				authorization: `Bearer ${issued.token}`,
				token_id: issued.token_id,
				token_prefix: issued.token_prefix,
				account_id: issued.account_id,
				tenant_id: issued.tenant_id,
				tool_mode: issued.tool_mode,
				toolkit_profile: issued.toolkit_profile,
				allowed_tool_prefixes: issued.allowed_tool_prefixes,
			},
		});
	} catch (error) {
		return toPartnerError(error);
	}
}

export async function handlePartnerLaneBearerIssue(event: RouteEventLike): Promise<Response> {
	try {
		const env = requireRouteEnv(event.platform);
		const actor = requirePartnerAdmin(event.request, env);
		const partnerKey = resolvePartnerKey(event.params.partnerKey);
		const clientSlug = normalizePartnerSlug(event.params.slug ?? '');
		const laneSlug = normalizePartnerAccessLaneSlug(event.params.laneSlug ?? '');
		if (!partnerKey || !clientSlug || !laneSlug) {
			return json({ error: 'invalid_request', message: 'Partner key, client slug, and lane slug are required' }, { status: 400 });
		}

		const client = await getPartnerClientBySlug(env.DB, partnerKey, clientSlug);
		if (!client) {
			return json({ error: 'not_found', message: 'Partner client not found' }, { status: 404 });
		}
		const lane = await getPartnerAccessLaneBySlug(env.DB, client.id, laneSlug);
		if (!lane) {
			return json({ error: 'not_found', message: 'Named access lane not found' }, { status: 404 });
		}
		if (!isIssuableStatus(client.status) || !isIssuableStatus(lane.status)) {
			return json({ error: 'lane_not_active', message: 'Client or lane is not active for managed bearer issuance.' }, { status: 409 });
		}
		if (!lane.identity_user_id) {
			return json(
				{
					error: 'missing_identity_user',
					message: 'Lane is missing identity_user_id. Managed bearer tokens require a mapped Auth0 subject.',
				},
				{ status: 409 },
			);
		}
		if (!client.identity_account_id || !client.identity_tenant_id) {
			return json(
				{
					error: 'missing_identity_mapping',
					message: 'Client is missing identity account or tenant mapping.',
				},
				{ status: 409 },
			);
		}
		const consent = await getLatestActiveConsent(env.DB, client.id);
		if (!consent) {
			return json({ error: 'consent_required', message: 'No active consent record found for this client.' }, { status: 409 });
		}

		const body = (await event.request.json().catch(() => null)) as IssueLaneBearerTokenRequestBody | null;
		const laneMetadata = parseJsonObject(lane.metadata_json);
		const observabilityBaseline = resolvePartnerObservabilityBaseline(laneMetadata);
		const authEmail = lane.owner_email ?? client.owner_email ?? null;

		await reconcileAgencyMcpEntitlement(env.DB, {
			authSubject: lane.identity_user_id,
			authEmail,
			accountId: client.identity_account_id,
			tenantId: client.identity_tenant_id,
			workspaceAccountId: client.workspace_account_id,
			serviceTier: 'mcp_only',
			metadata: {
				partner_key: client.partner_key,
				client_slug: client.slug,
				partner_access_lane_slug: lane.slug,
				partner_access_lane_display_name: lane.display_name,
				partner_access_lane_url: lane.hub_url,
				partner_access_lane_host_key: lane.host_key,
				approved_exception: laneMetadata.approved_exception ?? null,
				observability_baseline: observabilityBaseline,
			},
		});

		const issued = await postIdentityAdmin<IssueManagedTokenResponse>(env, '/v1/mcp/long-lived-tokens/admin-issue', {
			auth_subject: lane.identity_user_id,
			auth_email: authEmail,
			account_id: client.identity_account_id,
			tenant_id: client.identity_tenant_id,
			toolkit_profile: parseJsonArray(lane.toolkit_profile_json),
			allowed_tool_prefixes: parseJsonStringArray(lane.allowed_tool_prefixes_json),
			bound_host: lane.host_key,
			tool_mode: body?.tool_mode ?? 'read_write',
			actor,
			metadata: buildLaneMetadata(event.request, actor, client, lane, {
				issued_via: 'partner_managed_named_lane_bearer',
				credential_source: 'Partner-managed named lane',
				consent_record_id: consent.id,
				consent_granted_at: consent.granted_at,
				observability_baseline: observabilityBaseline,
				...(objectBody(body?.metadata)),
			}),
		});

		await insertPartnerAccessDelivery(env.DB, {
			id: randomId('padelivery'),
			partnerClientId: client.id,
			deliveryType: 'managed_bearer_bundle',
			deliveryChannel: body?.delivery_channel ?? 'portal',
			deliveredBy: actor,
			recipient: body?.recipient?.trim() || authEmail || null,
			artifactRef: issued.token_id,
			expiresAt: null,
			metadata: buildLaneMetadata(event.request, actor, client, lane, {
				account_id: issued.account_id,
				tenant_id: issued.tenant_id,
				auth_subject: issued.auth_subject,
				auth_email: issued.auth_email,
				token_prefix: issued.token_prefix,
				token_preview: tokenPreview(issued.token),
				tool_mode: issued.tool_mode,
				toolkit_profile: issued.toolkit_profile,
				allowed_tool_prefixes: issued.allowed_tool_prefixes,
				bound_host: issued.bound_host ?? lane.host_key,
				observability_baseline: observabilityBaseline,
			}),
		});

		return json({
			client_slug: client.slug,
			lane_slug: lane.slug,
			lane_display_name: lane.display_name,
			hub_url: lane.hub_url,
			workspace_account_id: client.workspace_account_id,
			identity_account_id: issued.account_id,
			identity_user_id: issued.auth_subject,
			bearer_bundle: {
				mode: 'managed_bearer',
				mcp_url: lane.hub_url,
				authorization: `Bearer ${issued.token}`,
				token_id: issued.token_id,
				token_prefix: issued.token_prefix,
				account_id: issued.account_id,
				tenant_id: issued.tenant_id,
				tool_mode: issued.tool_mode,
				toolkit_profile: issued.toolkit_profile,
				allowed_tool_prefixes: issued.allowed_tool_prefixes,
				bound_host: issued.bound_host ?? lane.host_key,
			},
		});
	} catch (error) {
		return toPartnerError(error);
	}
}

export async function handlePartnerToolkitStatus(event: RouteEventLike): Promise<Response> {
	try {
		const env = requireRouteEnv(event.platform);
		const actor = requirePartnerAdmin(event.request, env);
		const partnerKey = resolvePartnerKey(event.params.partnerKey);
		const slug = normalizePartnerSlug(event.params.slug ?? '');
		if (!partnerKey || !slug) {
			return json({ error: 'invalid_request', message: 'Partner key and client slug are required' }, { status: 400 });
		}

		const client = await getPartnerClientBySlug(env.DB, partnerKey, slug);
		if (!client) {
			return json({ error: 'not_found', message: 'Partner client not found' }, { status: 404 });
		}
		const authz = await authorizePartnerToolkitAdminAction({
			request: event.request,
			env,
			client,
			actor,
			actionName: 'view_toolkit_auth',
			accessType: 'read',
			toolkit: 'all',
		});

		const toolkitAccounts = await env.DB.prepare(
			`SELECT * FROM partner_auth_toolkit_accounts
       WHERE partner_client_id = ?
       ORDER BY toolkit ASC, account_slug ASC`,
		)
			.bind(client.id)
			.all<PartnerAuthToolkitAccountRow>();
		const knownAccounts = toolkitAccounts.results ?? [];
		const composioUserIds = [
			client.workspace_account_id,
			...knownAccounts.map((account) => account.composio_user_id).filter(Boolean),
		];
		const uniqueUserIds = [...new Set(composioUserIds)];
		const composio = getComposioClient(env);
		const response =
			uniqueUserIds.length > 0
				? await composio.connectedAccounts.list({
						userIds: uniqueUserIds,
					})
				: { items: [] };
		const items = Array.isArray((response as { items?: unknown[] }).items)
			? (response as { items: unknown[] }).items
			: Array.isArray(response)
				? response
				: [];
		const connections = items
			.filter((item): item is ConnectedAccountShape => Boolean(item && typeof item === 'object'))
			.map((account) => ({
				toolkit: normalizeToolkitSlug(account.toolkit?.slug ?? account.appName ?? account.app ?? account.toolkit?.name ?? 'unknown'),
				user_id: account.userId ?? null,
				connected_account_id: account.id ?? account.nanoid ?? null,
				status: String(account.status ?? 'UNKNOWN').toUpperCase(),
				auth_config_id: account.authConfigId ?? null,
				created_at: account.createdAt ?? null,
				updated_at: account.updatedAt ?? null,
			}))
			.filter((account) => account.toolkit !== 'unknown');

		const accountLookup = new Map(
			knownAccounts.map((account) => [`${account.toolkit}::${account.composio_user_id}`, account] as const),
		);
		const observabilityBaseline = resolvePartnerObservabilityBaseline(parseJsonObject(client.metadata_json));
		for (const connection of connections) {
			if (!connection.connected_account_id) continue;

			await env.DB.prepare(
				`INSERT INTO partner_auth_connections (
           id, partner_client_id, toolkit, auth_config_id, connected_account_id, connection_status,
           last_checked_at, metadata_json
         ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
         ON CONFLICT(partner_client_id, toolkit, connected_account_id) DO UPDATE SET
           auth_config_id = excluded.auth_config_id,
           connection_status = excluded.connection_status,
           last_checked_at = datetime('now'),
           metadata_json = excluded.metadata_json,
           updated_at = datetime('now')`,
			)
				.bind(
					randomId('paconn'),
					client.id,
					connection.toolkit,
					connection.auth_config_id ?? resolvePartnerToolkitAuthConfigId(env, connection.toolkit, client),
					connection.connected_account_id,
					connection.status,
					JSON.stringify(
						buildClientMetadata(event.request, actor, client, {
							source: 'composio.connectedAccounts.list',
							toolkit: connection.toolkit,
							created_at: connection.created_at,
							updated_at: connection.updated_at,
							observability_baseline: observabilityBaseline,
						}),
					),
				)
				.run();

			const linkedAccount = connection.user_id ? accountLookup.get(`${connection.toolkit}::${connection.user_id}`) : null;
			if (linkedAccount) {
				await env.DB.prepare(
					`UPDATE partner_auth_toolkit_accounts
             SET connected_account_id = ?, connection_status = ?, auth_config_id = COALESCE(?, auth_config_id),
                 last_checked_at = datetime('now'),
                 connected_at = CASE WHEN ? = 'ACTIVE' AND connected_at IS NULL THEN datetime('now') ELSE connected_at END,
                 updated_at = datetime('now')
             WHERE id = ?`,
				)
					.bind(
						connection.connected_account_id,
						connection.status,
						connection.auth_config_id ?? null,
						connection.status,
						linkedAccount.id,
					)
					.run();
			}
		}

		const requiredToolkits = parseJsonArray(client.required_toolkits_json);
		const statusByToolkit = new Map<string, { connected: boolean; status: string; connected_account_ids: string[] }>();
		for (const account of knownAccounts) {
			const current = statusByToolkit.get(account.toolkit) ?? {
				connected: false,
				status: 'NOT_CONNECTED',
				connected_account_ids: [],
			};
			current.connected =
				current.connected || account.status === 'active' || account.connection_status.toUpperCase() === 'ACTIVE';
			current.status = account.connection_status.toUpperCase();
			if (account.connected_account_id) {
				current.connected_account_ids.push(account.connected_account_id);
			}
			statusByToolkit.set(account.toolkit, current);
		}
		for (const connection of connections) {
			const current = statusByToolkit.get(connection.toolkit) ?? {
				connected: false,
				status: 'NOT_CONNECTED',
				connected_account_ids: [],
			};
			current.connected = current.connected || connection.status === 'ACTIVE';
			current.status = connection.status;
			if (connection.connected_account_id) {
				current.connected_account_ids.push(connection.connected_account_id);
			}
			statusByToolkit.set(connection.toolkit, current);
		}

		const metadata = parseJsonObject(client.metadata_json);
		const connectorTargets = asConnectorTargetMap(metadata.connector_targets);
		const deferredConnectors = Object.entries(connectorTargets)
			.filter(([, value]) => value.status !== 'ready')
			.map(([toolkit, value]) => ({
				toolkit,
				...value,
			}));
		const toolkits = [...new Set([...requiredToolkits, ...statusByToolkit.keys()])].map((toolkit) => {
			const accountStatus = statusByToolkit.get(toolkit);
			return {
				toolkit,
				required: requiredToolkits.includes(toolkit),
				auth_config_id: resolvePartnerToolkitAuthConfigId(env, toolkit, client),
				connected: accountStatus?.connected ?? false,
				connection_status: accountStatus?.status ?? 'NOT_CONNECTED',
				connected_account_ids: accountStatus?.connected_account_ids ?? [],
			};
		});

		return json({
			client: serializeClient(client),
			toolkits,
			deferred_connectors: deferredConnectors,
			checked_at: new Date().toISOString(),
			policy: authz.policy,
		});
	} catch (error) {
		return toPartnerError(error);
	}
}

export async function handlePartnerToolkitConnectLink(event: RouteEventLike): Promise<Response> {
	try {
		const env = requireRouteEnv(event.platform);
		const actor = requirePartnerAdmin(event.request, env);
		const partnerKey = resolvePartnerKey(event.params.partnerKey);
		const slug = normalizePartnerSlug(event.params.slug ?? '');
		const toolkit = normalizeToolkitSlug(event.params.toolkit ?? '');
		if (!partnerKey || !slug || !toolkit) {
			return json({ error: 'invalid_request', message: 'Valid partner key, client slug, and toolkit are required' }, { status: 400 });
		}

		const client = await getPartnerClientBySlug(env.DB, partnerKey, slug);
		if (!client) {
			return json({ error: 'not_found', message: 'Partner client not found' }, { status: 404 });
		}
		const authz = await authorizePartnerToolkitAdminAction({
			request: event.request,
			env,
			client,
			actor,
			actionName: 'create_toolkit_connect_link',
			accessType: 'auth_admin',
			toolkit,
		});

		const body = (await event.request.json().catch(() => null)) as ConnectLinkRequestBody | null;
		const callbackUrl = body?.callback_url?.trim() || event.url.searchParams.get('callback_url') || undefined;
		const authConfigId =
			body?.auth_config_id?.trim() || resolvePartnerToolkitAuthConfigId(env, toolkit, client) || undefined;
		const composio = getComposioClient(env);
		const connectionRequest = authConfigId
			? await composio.connectedAccounts.link(client.workspace_account_id, authConfigId, {
					...(callbackUrl ? { callbackUrl } : {}),
				})
			: await composio.toolkits.authorize(client.workspace_account_id, toolkit, authConfigId);
		const connectLink = connectionRequest.redirectUrl;
		if (!connectLink) {
			return json({ error: 'connect_link_unavailable', message: 'Composio did not return a redirect URL for this toolkit' }, { status: 502 });
		}

		await env.DB.prepare(
			`INSERT INTO partner_auth_connections (
         id, partner_client_id, toolkit, auth_config_id, connected_account_id, connection_status,
         last_checked_at, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
		)
			.bind(
				randomId('paconn'),
				client.id,
				toolkit,
				authConfigId ?? null,
				connectionRequest.id,
				'INITIATED',
				JSON.stringify(
					buildClientMetadata(event.request, actor, client, {
						callback_url: callbackUrl ?? null,
						connect_link_issued_at: new Date().toISOString(),
						auth_config_id: authConfigId ?? null,
						connection_request_id: connectionRequest.id ?? null,
						policy: authz.policy,
					}),
				),
			)
			.run();

		return json({
			client_slug: client.slug,
			workspace_account_id: client.workspace_account_id,
			toolkit,
			auth_config_id: authConfigId ?? null,
			connection_request_id: connectionRequest.id,
			connect_link: connectLink,
			policy: authz.policy,
		});
	} catch (error) {
		return toPartnerError(error);
	}
}

export async function handlePartnerToolkitAccountsGet(event: RouteEventLike): Promise<Response> {
	try {
		const env = requireRouteEnv(event.platform);
		const actor = requirePartnerAdmin(event.request, env);
		const partnerKey = resolvePartnerKey(event.params.partnerKey);
		const slug = normalizePartnerSlug(event.params.slug ?? '');
		const toolkit = normalizeToolkitSlug(event.params.toolkit ?? '');
		if (!partnerKey || !slug || !toolkit) {
			return json({ error: 'invalid_request', message: 'Valid partner key, client slug, and toolkit are required' }, { status: 400 });
		}

		const client = await getPartnerClientBySlug(env.DB, partnerKey, slug);
		if (!client) {
			return json({ error: 'not_found', message: 'Partner client not found' }, { status: 404 });
		}
		const authz = await authorizePartnerToolkitAdminAction({
			request: event.request,
			env,
			client,
			actor,
			actionName: 'view_toolkit_auth',
			accessType: 'read',
			toolkit,
		});

		const accounts = await env.DB.prepare(
			`SELECT * FROM partner_auth_toolkit_accounts
       WHERE partner_client_id = ? AND toolkit = ?
       ORDER BY account_slug ASC`,
		)
			.bind(client.id, toolkit)
			.all<PartnerAuthToolkitAccountRow>();
		const pins = await env.DB.prepare(
			`SELECT * FROM partner_auth_toolkit_pins
       WHERE partner_client_id = ? AND toolkit = ?
       ORDER BY tool_name ASC`,
		)
			.bind(client.id, toolkit)
			.all<PartnerAuthToolkitPinRow>();

		return json({
			client: {
				id: client.id,
				slug: client.slug,
				display_name: client.display_name,
			},
			toolkit,
			auth_config_id: resolvePartnerToolkitAuthConfigId(env, toolkit, client),
			accounts: (accounts.results ?? []).map(serializeToolkitAccount),
			pins: (pins.results ?? []).map((row) => ({
				tool_name: row.tool_name,
				account_slug: row.account_slug,
				metadata: parseJsonObject(row.metadata_json),
				created_at: row.created_at,
				updated_at: row.updated_at,
			})),
			policy: authz.policy,
		});
	} catch (error) {
		return toPartnerError(error);
	}
}

export async function handlePartnerToolkitAccountsPost(event: RouteEventLike): Promise<Response> {
	try {
		const env = requireRouteEnv(event.platform);
		const actor = requirePartnerAdmin(event.request, env);
		const partnerKey = resolvePartnerKey(event.params.partnerKey);
		const slug = normalizePartnerSlug(event.params.slug ?? '');
		const toolkit = normalizeToolkitSlug(event.params.toolkit ?? '');
		if (!partnerKey || !slug || !toolkit) {
			return json({ error: 'invalid_request', message: 'Valid partner key, client slug, and toolkit are required' }, { status: 400 });
		}

		const client = await getPartnerClientBySlug(env.DB, partnerKey, slug);
		if (!client) {
			return json({ error: 'not_found', message: 'Partner client not found' }, { status: 404 });
		}
		const authz = await authorizePartnerToolkitAdminAction({
			request: event.request,
			env,
			client,
			actor,
			actionName: 'upsert_toolkit_account',
			accessType: 'write',
			toolkit,
		});

		const body = (await event.request.json().catch(() => null)) as CreateToolkitAccountBody | null;
		const accountSlug = normalizePartnerSlug(body?.account_slug ?? '');
		if (!accountSlug) {
			return json({ error: 'invalid_request', message: 'account_slug is required' }, { status: 400 });
		}

		const existing = await env.DB.prepare(
			`SELECT * FROM partner_auth_toolkit_accounts
       WHERE partner_client_id = ? AND toolkit = ? AND account_slug = ?
       LIMIT 1`,
		)
			.bind(client.id, toolkit, accountSlug)
			.first<PartnerAuthToolkitAccountRow>();
		const authConfigId =
			body?.auth_config_id?.trim() ||
			existing?.auth_config_id ||
			resolvePartnerToolkitAuthConfigId(env, toolkit, client);
		if (!authConfigId) {
			return json(
				{
					error: 'auth_config_missing',
					message: `No auth config is configured for ${toolkit}. Set COMPOSIO_AUTH_CONFIG_MAP_JSON.${toolkit} first.`,
				},
				{ status: 409 },
			);
		}

		const displayLabel = body?.display_label?.trim() || existing?.display_label || accountSlug;
		const syncEnabled =
			typeof body?.sync_enabled === 'boolean' ? body.sync_enabled : Boolean(existing?.sync_enabled ?? 1);
		const composioUserId =
			existing?.composio_user_id || defaultToolkitComposioUserId(client.slug, toolkit, accountSlug);
		const metadata = buildClientMetadata(event.request, actor, client, {
			...parseJsonObject(existing?.metadata_json),
			...objectBody(body?.metadata),
			shared_connector_accounts: true,
		});

		if (existing) {
			await env.DB.prepare(
				`UPDATE partner_auth_toolkit_accounts
         SET display_label = ?, auth_config_id = ?, sync_enabled = ?, metadata_json = ?, updated_at = datetime('now')
         WHERE id = ?`,
			)
				.bind(displayLabel, authConfigId, syncEnabled ? 1 : 0, JSON.stringify(metadata), existing.id)
				.run();
		} else {
			await env.DB.prepare(
				`INSERT INTO partner_auth_toolkit_accounts (
         id, partner_client_id, toolkit, account_slug, display_label, composio_user_id, auth_config_id,
         connection_status, status, sync_enabled, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'INITIATED', 'active', ?, ?)`,
			)
				.bind(
					randomId('patoolacct'),
					client.id,
					toolkit,
					accountSlug,
					displayLabel,
					composioUserId,
					authConfigId,
					syncEnabled ? 1 : 0,
					JSON.stringify(metadata),
				)
				.run();
		}

		await insertToolkitEvent(env.DB, {
			clientId: client.id,
			toolkit,
			accountSlug,
			eventType: existing ? 'account_updated' : 'account_created',
			actor,
			metadata: buildClientMetadata(event.request, actor, client, {
				auth_config_id: authConfigId,
				sync_enabled: syncEnabled,
				policy: authz.policy,
			}),
		});

		return json({
			client_slug: client.slug,
			toolkit,
			account_slug: accountSlug,
			composio_user_id: composioUserId,
			auth_config_id: authConfigId,
			sync_enabled: syncEnabled,
			policy: authz.policy,
		});
	} catch (error) {
		return toPartnerError(error);
	}
}

export async function handlePartnerToolkitAccountConnectLink(event: RouteEventLike): Promise<Response> {
	try {
		const env = requireRouteEnv(event.platform);
		const actor = requirePartnerAdmin(event.request, env);
		const partnerKey = resolvePartnerKey(event.params.partnerKey);
		const slug = normalizePartnerSlug(event.params.slug ?? '');
		const toolkit = normalizeToolkitSlug(event.params.toolkit ?? '');
		const accountSlug = normalizePartnerSlug(event.params.accountSlug ?? '');
		if (!partnerKey || !slug || !toolkit || !accountSlug) {
			return json({ error: 'invalid_request', message: 'Valid partner key, client, toolkit, and account slugs are required' }, { status: 400 });
		}

		const client = await getPartnerClientBySlug(env.DB, partnerKey, slug);
		if (!client) {
			return json({ error: 'not_found', message: 'Partner client not found' }, { status: 404 });
		}
		const authz = await authorizePartnerToolkitAdminAction({
			request: event.request,
			env,
			client,
			actor,
			actionName: 'create_toolkit_connect_link',
			accessType: 'auth_admin',
			toolkit,
			accountSlug,
		});

		const account = await env.DB.prepare(
			`SELECT * FROM partner_auth_toolkit_accounts
       WHERE partner_client_id = ? AND toolkit = ? AND account_slug = ?
       LIMIT 1`,
		)
			.bind(client.id, toolkit, accountSlug)
			.first<PartnerAuthToolkitAccountRow>();
		if (!account) {
			return json({ error: 'not_found', message: 'Toolkit account binding not found' }, { status: 404 });
		}

		const body = (await event.request.json().catch(() => null)) as ConnectLinkRequestBody | null;
		const callbackUrl = body?.callback_url?.trim() || event.url.searchParams.get('callback_url') || undefined;
		const authConfigId =
			body?.auth_config_id?.trim() || account.auth_config_id || resolvePartnerToolkitAuthConfigId(env, toolkit, client);
		if (!authConfigId) {
			return json(
				{
					error: 'auth_config_missing',
					message: `No auth config is configured for ${toolkit}. Set COMPOSIO_AUTH_CONFIG_MAP_JSON.${toolkit} first.`,
				},
				{ status: 409 },
			);
		}

		const composio = getComposioClient(env);
		const connectionRequest = await composio.connectedAccounts.link(account.composio_user_id, authConfigId, {
			...(callbackUrl ? { callbackUrl } : {}),
		});
		if (!connectionRequest.redirectUrl) {
			return json({ error: 'connect_link_unavailable', message: 'Composio did not return a redirect URL for this account.' }, { status: 502 });
		}

		const metadata = buildClientMetadata(event.request, actor, client, {
			...parseJsonObject(account.metadata_json),
			...objectBody(body?.metadata),
			last_connect_link_issued_by: actor,
			last_connect_link_issued_at: new Date().toISOString(),
		});

		await env.DB.prepare(
			`UPDATE partner_auth_toolkit_accounts
       SET auth_config_id = ?, connected_account_id = COALESCE(?, connected_account_id),
           connection_status = 'INITIATED', metadata_json = ?, updated_at = datetime('now')
       WHERE id = ?`,
		)
			.bind(authConfigId, connectionRequest.id ?? null, JSON.stringify(metadata), account.id)
			.run();
		await insertToolkitEvent(env.DB, {
			clientId: client.id,
			toolkit,
			accountSlug,
			eventType: 'connect_link_created',
			actor,
			metadata: buildClientMetadata(event.request, actor, client, {
				auth_config_id: authConfigId,
				connection_request_id: connectionRequest.id ?? null,
				callback_url: callbackUrl ?? null,
				policy: authz.policy,
			}),
		});

		return json({
			client_slug: client.slug,
			toolkit,
			account_slug: account.account_slug,
			composio_user_id: account.composio_user_id,
			auth_config_id: authConfigId,
			connection_request_id: connectionRequest.id ?? null,
			connect_link: connectionRequest.redirectUrl,
			policy: authz.policy,
		});
	} catch (error) {
		return toPartnerError(error);
	}
}

export async function handlePartnerToolkitAccountPin(event: RouteEventLike): Promise<Response> {
	try {
		const env = requireRouteEnv(event.platform);
		const actor = requirePartnerAdmin(event.request, env);
		const partnerKey = resolvePartnerKey(event.params.partnerKey);
		const slug = normalizePartnerSlug(event.params.slug ?? '');
		const toolkit = normalizeToolkitSlug(event.params.toolkit ?? '');
		const accountSlug = normalizePartnerSlug(event.params.accountSlug ?? '');
		if (!partnerKey || !slug || !toolkit || !accountSlug) {
			return json({ error: 'invalid_request', message: 'Valid partner key, client, toolkit, and account slugs are required' }, { status: 400 });
		}

		const client = await getPartnerClientBySlug(env.DB, partnerKey, slug);
		if (!client) {
			return json({ error: 'not_found', message: 'Partner client not found' }, { status: 404 });
		}
		const authz = await authorizePartnerToolkitAdminAction({
			request: event.request,
			env,
			client,
			actor,
			actionName: 'pin_toolkit_account',
			accessType: 'write',
			toolkit,
			accountSlug,
		});

		const body = (await event.request.json().catch(() => null)) as PinAccountBody | null;
		const toolName = String(body?.tool_name ?? '').trim();
		if (!toolName) {
			return json({ error: 'invalid_request', message: 'tool_name is required' }, { status: 400 });
		}

		const account = await env.DB.prepare(
			`SELECT * FROM partner_auth_toolkit_accounts
       WHERE partner_client_id = ? AND toolkit = ? AND account_slug = ?
       LIMIT 1`,
		)
			.bind(client.id, toolkit, accountSlug)
			.first<PartnerAuthToolkitAccountRow>();
		if (!account) {
			return json({ error: 'not_found', message: 'Toolkit account binding not found' }, { status: 404 });
		}
		if (account.status !== 'active') {
			return json({ error: 'invalid_state', message: 'Only active accounts can be pinned.' }, { status: 409 });
		}

		const existing = await env.DB.prepare(
			`SELECT * FROM partner_auth_toolkit_pins
       WHERE partner_client_id = ? AND toolkit = ? AND tool_name = ?
       LIMIT 1`,
		)
			.bind(client.id, toolkit, toolName)
			.first<PartnerAuthToolkitPinRow>();
		const metadata = buildClientMetadata(event.request, actor, client, {
			...parseJsonObject(existing?.metadata_json),
			...objectBody(body?.metadata),
			pinned_by: actor,
			policy: authz.policy,
		});

		if (existing) {
			await env.DB.prepare(
				`UPDATE partner_auth_toolkit_pins
         SET account_slug = ?, metadata_json = ?, updated_at = datetime('now')
         WHERE id = ?`,
			)
				.bind(accountSlug, JSON.stringify(metadata), existing.id)
				.run();
		} else {
			await env.DB.prepare(
				`INSERT INTO partner_auth_toolkit_pins (
         id, partner_client_id, toolkit, tool_name, account_slug, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?)`,
			)
				.bind(randomId('patoolpin'), client.id, toolkit, toolName, accountSlug, JSON.stringify(metadata))
				.run();
		}

		await insertToolkitEvent(env.DB, {
			clientId: client.id,
			toolkit,
			accountSlug,
			eventType: 'tool_pinned',
			actor,
			metadata: buildClientMetadata(event.request, actor, client, {
				tool_name: toolName,
				policy: authz.policy,
			}),
		});

		return json({
			client_slug: client.slug,
			toolkit,
			tool_name: toolName,
			account_slug: accountSlug,
			policy: authz.policy,
		});
	} catch (error) {
		return toPartnerError(error);
	}
}

export async function handlePartnerToolkitAccountDisable(event: RouteEventLike): Promise<Response> {
	try {
		const env = requireRouteEnv(event.platform);
		const actor = requirePartnerAdmin(event.request, env);
		const partnerKey = resolvePartnerKey(event.params.partnerKey);
		const slug = normalizePartnerSlug(event.params.slug ?? '');
		const toolkit = normalizeToolkitSlug(event.params.toolkit ?? '');
		const accountSlug = normalizePartnerSlug(event.params.accountSlug ?? '');
		if (!partnerKey || !slug || !toolkit || !accountSlug) {
			return json({ error: 'invalid_request', message: 'Valid partner key, client, toolkit, and account slugs are required' }, { status: 400 });
		}

		const client = await getPartnerClientBySlug(env.DB, partnerKey, slug);
		if (!client) {
			return json({ error: 'not_found', message: 'Partner client not found' }, { status: 404 });
		}
		const authz = await authorizePartnerToolkitAdminAction({
			request: event.request,
			env,
			client,
			actor,
			actionName: 'disable_toolkit_account',
			accessType: 'destructive',
			toolkit,
			accountSlug,
		});

		const account = await env.DB.prepare(
			`SELECT * FROM partner_auth_toolkit_accounts
       WHERE partner_client_id = ? AND toolkit = ? AND account_slug = ?
       LIMIT 1`,
		)
			.bind(client.id, toolkit, accountSlug)
			.first<PartnerAuthToolkitAccountRow>();
		if (!account) {
			return json({ error: 'not_found', message: 'Toolkit account binding not found' }, { status: 404 });
		}

		await env.DB.prepare(
			`UPDATE partner_auth_toolkit_accounts
       SET status = 'disabled', disabled_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
		)
			.bind(account.id)
			.run();
		await insertToolkitEvent(env.DB, {
			clientId: client.id,
			toolkit,
			accountSlug,
			eventType: 'account_disabled',
			actor,
			metadata: buildClientMetadata(event.request, actor, client, {
				previous_status: account.status,
				policy: authz.policy,
			}),
		});

		return json({
			client_slug: client.slug,
			toolkit,
			account_slug: accountSlug,
			status: 'disabled',
			policy: authz.policy,
		});
	} catch (error) {
		return toPartnerError(error);
	}
}

function requireRouteEnv(platform: App.Platform | undefined): App.Platform['env'] {
	const env = platform?.env;
	if (!env?.DB) {
		throw new PartnerAuthHttpError(503, 'unavailable', 'Database is unavailable');
	}
	return env;
}

function resolvePartnerKey(raw: string | undefined): string | null {
	const normalized = normalizePartnerSlug(raw ?? '');
	return normalized || null;
}

function toPartnerError(error: unknown): Response {
	if (error instanceof PartnerAuthHttpError) {
		return json({ error: error.code, message: error.message }, { status: error.status });
	}

	return json(
		{
			error: 'internal_error',
			message: error instanceof Error ? error.message : 'Unexpected error',
		},
		{ status: 500 },
	);
}

function objectBody(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	return value as Record<string, unknown>;
}

function normalizeIdentifier(raw: string | undefined): string | null {
	const value = raw?.trim() ?? '';
	return value ? value.slice(0, 255) : null;
}

function withTraceContext(request: Request, metadata: Record<string, unknown>): Record<string, unknown> {
	const trace = getRequestTraceContext(request);
	return {
		...metadata,
		...(trace.correlationId ? { correlation_id: trace.correlationId } : {}),
		...(trace.requestId ? { request_id: trace.requestId } : {}),
	};
}

function buildClientMetadata(
	request: Request,
	actor: string,
	client: {
		partner_key: string;
		slug: string;
		display_name: string | null;
		workspace_account_id: string;
		identity_account_id: string | null;
		identity_tenant_id: string | null;
	},
	metadata: Record<string, unknown>,
): Record<string, unknown> {
	return withTraceContext(request, {
		partner_key: client.partner_key,
		client_slug: client.slug,
		client_display_name: client.display_name,
		workspace_account_id: client.workspace_account_id,
		identity_account_id: client.identity_account_id,
		identity_tenant_id: client.identity_tenant_id,
		actor,
		...metadata,
	});
}

function buildLaneMetadata(
	request: Request,
	actor: string,
	client: {
		partner_key: string;
		slug: string;
		display_name: string | null;
		workspace_account_id: string;
		identity_account_id: string | null;
		identity_tenant_id: string | null;
	},
	lane: {
		slug: string;
		display_name: string;
		hub_url: string;
		host_key: string;
	},
	metadata: Record<string, unknown>,
): Record<string, unknown> {
	return buildClientMetadata(request, actor, client, {
		lane_slug: lane.slug,
		lane_display_name: lane.display_name,
		lane_hub_url: lane.hub_url,
		lane_host_key: lane.host_key,
		...metadata,
	});
}

function mergeStringMaps(...maps: Array<Record<string, string> | undefined>): Record<string, string> {
	const merged: Record<string, string> = {};
	for (const map of maps) {
		for (const [key, value] of Object.entries(map ?? {})) {
			const normalizedKey = normalizeToolkitSlug(key);
			if (normalizedKey && value.trim()) {
				merged[normalizedKey] = value.trim();
			}
		}
	}
	return merged;
}

function asStringMap(value: unknown): Record<string, string> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	const entries: Array<[string, string]> = [];
	for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
		if (typeof entry !== 'string') continue;
		const trimmed = entry.trim();
		if (!trimmed) continue;
		entries.push([normalizeToolkitSlug(key), trimmed]);
	}
	return Object.fromEntries(entries);
}

function mergeConnectorTargets(
	...maps: Array<Record<string, PartnerConnectorTargetConfig> | undefined>
): Record<string, PartnerConnectorTargetConfig> {
	const merged: Record<string, PartnerConnectorTargetConfig> = {};
	for (const map of maps) {
		for (const [key, value] of Object.entries(map ?? {})) {
			const normalizedKey = normalizeToolkitSlug(key);
			if (!normalizedKey) continue;
			const existing = merged[normalizedKey];
			merged[normalizedKey] = {
				status: value.status,
				expose_after: [...new Set(value.expose_after ?? existing?.expose_after ?? [])],
				auth_config_id: value.auth_config_id ?? existing?.auth_config_id ?? null,
				registry_server: value.registry_server ?? existing?.registry_server ?? null,
				notes: value.notes ?? existing?.notes ?? null,
			};
		}
	}
	return merged;
}

function asConnectorTargetMap(value: unknown): Record<string, PartnerConnectorTargetConfig> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	const parsed: Record<string, PartnerConnectorTargetConfig> = {};
	for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
		const entry = objectBody(raw);
		const normalizedKey = normalizeToolkitSlug(key);
		const status = typeof entry.status === 'string' ? entry.status : null;
		if (!normalizedKey || !status) continue;
		parsed[normalizedKey] = {
			status:
				status === 'ready' || status === 'pending_auth' || status === 'pending_registry' || status === 'pending_entitlement'
					? status
					: 'pending_registry',
			expose_after: Array.isArray(entry.expose_after)
				? entry.expose_after.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
				: [],
			auth_config_id: typeof entry.auth_config_id === 'string' ? entry.auth_config_id : null,
			registry_server: typeof entry.registry_server === 'string' ? entry.registry_server : null,
			notes: typeof entry.notes === 'string' ? entry.notes : null,
		};
	}
	return parsed;
}

async function insertConsent(
	db: D1Database,
	partnerClientId: string,
	consent: NonNullable<InitClientRequestBody['consent']>,
): Promise<string> {
	const consentVersion = consent.consent_version?.trim() || 'v1';
	const grantedBy = consent.granted_by?.trim().slice(0, 255) || '';
	const consentChannel = consent.channel?.trim() || 'portal';
	const consentReference = consent.reference?.trim() || null;
	const grantedAt = parseOptionalIsoTimestamp(consent.granted_at) ?? new Date().toISOString();
	const expiresAt = parseOptionalIsoTimestamp(consent.expires_at);
	const consentMetadata = objectBody(consent.metadata);
	const consentRecordId = randomId('paconsent');
	await db
		.prepare(
			`INSERT INTO partner_auth_consents (
         id, partner_client_id, consent_version, consent_granted_by, consent_channel,
         consent_reference, granted_at, expires_at, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			consentRecordId,
			partnerClientId,
			consentVersion,
			grantedBy,
			consentChannel,
			consentReference,
			grantedAt,
			expiresAt,
			JSON.stringify(consentMetadata),
		)
		.run();
	return consentRecordId;
}

function serializeClient(client: {
	id: string;
	partner_key: string;
	slug: string;
	display_name: string | null;
	workspace_account_id: string;
	identity_account_id: string | null;
	identity_user_id: string | null;
	identity_tenant_id: string | null;
	owner_email: string | null;
	status: string;
	required_toolkits_json: string;
	metadata_json: string;
	created_at: string;
	updated_at: string;
}) {
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
		required_toolkits: parseJsonArray(client.required_toolkits_json),
		metadata: parseJsonObject(client.metadata_json),
		created_at: client.created_at,
		updated_at: client.updated_at,
	};
}

function serializeLane(lane: PartnerAuthAccessLaneRow) {
	return {
		id: lane.id,
		slug: lane.slug,
		display_name: lane.display_name,
		identity_user_id: lane.identity_user_id,
		owner_email: lane.owner_email,
		hub_url: lane.hub_url,
		host_key: lane.host_key,
		status: lane.status,
		toolkit_profile: parseJsonArray(lane.toolkit_profile_json),
		allowed_tool_prefixes: normalizeAllowedToolPrefixes(parseJsonStringArray(lane.allowed_tool_prefixes_json)),
		metadata: parseJsonObject(lane.metadata_json),
		created_at: lane.created_at,
		updated_at: lane.updated_at,
	};
}

function serializeToolkitAccount(row: PartnerAuthToolkitAccountRow) {
	return {
		id: row.id,
		account_slug: row.account_slug,
		display_label: row.display_label,
		composio_user_id: row.composio_user_id,
		auth_config_id: row.auth_config_id,
		connected_account_id: row.connected_account_id,
		connection_status: row.connection_status,
		status: row.status,
		sync_enabled: Boolean(row.sync_enabled),
		last_checked_at: row.last_checked_at,
		connected_at: row.connected_at,
		disabled_at: row.disabled_at,
		metadata: parseJsonObject(row.metadata_json),
		created_at: row.created_at,
		updated_at: row.updated_at,
	};
}

async function insertToolkitEvent(
	db: D1Database,
	input: {
		clientId: string;
		toolkit: string;
		accountSlug: string;
		eventType: string;
		actor: string;
		metadata: Record<string, unknown>;
	},
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO partner_auth_toolkit_events (
         id, partner_client_id, toolkit, account_slug, event_type, actor, metadata_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			randomId('patoolevent'),
			input.clientId,
			input.toolkit,
			input.accountSlug,
			input.eventType,
			input.actor,
			JSON.stringify(input.metadata),
		)
		.run();
}

function resolveMcpEndpoint(
	rawUrl: string,
	explicitGatewayBearer: string | undefined,
): { url: string; gatewayBearerToken: string | null } {
	const gatewayBearerFromEnv = explicitGatewayBearer?.trim() || null;
	if (gatewayBearerFromEnv) {
		return {
			url: rawUrl,
			gatewayBearerToken: gatewayBearerFromEnv,
		};
	}

	try {
		const parsed = new URL(rawUrl);
		const token = parsed.searchParams.get('token')?.trim() || null;
		if (!token) {
			return {
				url: rawUrl,
				gatewayBearerToken: null,
			};
		}
		parsed.searchParams.delete('token');
		return {
			url: parsed.toString(),
			gatewayBearerToken: token,
		};
	} catch {
		return {
			url: rawUrl,
			gatewayBearerToken: null,
		};
	}
}

function isIssuableStatus(status: string): boolean {
	return status === 'active' || status === 'initialized';
}

function titleizeSlug(raw: string): string {
	return raw
		.split('-')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function defaultLaneDisplayName(laneSlug: string, clientSlug: string, clientDisplayName: string | null): string {
	const suffix = `-${clientSlug}`;
	const personSlug = laneSlug.endsWith(suffix) ? laneSlug.slice(0, -suffix.length) : laneSlug;
	const personLabel = titleizeSlug(personSlug);
	const clientLabel = clientDisplayName?.trim() || titleizeSlug(clientSlug);
	return `${personLabel} — ${clientLabel}`;
}

function mergeApprovedException(
	existingMetadata: Record<string, unknown>,
	incomingMetadata: Record<string, unknown>,
	laneSlug: string,
	displayName: string,
	hubUrl: string,
): Record<string, unknown> {
	const existing = objectBody(existingMetadata.approved_exception);
	const incoming = objectBody(incomingMetadata.approved_exception);
	return {
		present: true,
		exception_type: 'named_lane_mcp_only_pilot',
		approved_by: typeof incoming.approved_by === 'string' ? incoming.approved_by : existing.approved_by ?? 'mj',
		approved_at:
			typeof incoming.approved_at === 'string'
				? incoming.approved_at
				: typeof existing.approved_at === 'string'
					? existing.approved_at
					: new Date().toISOString(),
		reason:
			typeof incoming.reason === 'string'
				? incoming.reason
				: typeof existing.reason === 'string'
					? existing.reason
					: `Transparent named-lane MCP-only pilot for ${displayName}`,
		allowed_scope:
			typeof incoming.allowed_scope === 'string'
				? incoming.allowed_scope
				: typeof existing.allowed_scope === 'string'
					? existing.allowed_scope
					: `interactive_named_lane:${laneSlug}:read_write`,
		expiration_or_review_date:
			typeof incoming.expiration_or_review_date === 'string'
				? incoming.expiration_or_review_date
				: typeof existing.expiration_or_review_date === 'string'
					? existing.expiration_or_review_date
					: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
		graduation_target:
			typeof incoming.graduation_target === 'string'
				? incoming.graduation_target
				: typeof existing.graduation_target === 'string'
					? existing.graduation_target
					: 'policy_os_trial',
		lane_slug: laneSlug,
		hub_url: hubUrl,
	};
}

function resolvePartnerBridgePrefixes(partnerKey: string, clientSlug: string): string[] {
	if (partnerKey !== HALF_DOZEN_PARTNER_KEY) {
		return [];
	}
	return [`notion-halfdozen-${clientSlug}__`];
}
