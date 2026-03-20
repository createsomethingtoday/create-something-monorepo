import type { McpAccessAssignment } from './mcp-access-assignments.js';
import type { PlatformEnv, PartnerAuthClientRow } from './partner-auth.js';

interface ConnectLinkRequestBody {
	account_slug?: string;
	display_label?: string;
	callback_url?: string;
	metadata?: Record<string, unknown>;
}

interface ConnectLinkRequestEventLike {
	cookies: unknown;
	params: Record<string, string | undefined>;
	platform?: App.Platform;
	request: Request;
	url: URL;
}

interface ToolkitAccountRowLike {
	id: string;
	account_slug: string;
	display_label: string | null;
	composio_user_id: string;
	auth_config_id: string | null;
	connected_account_id: string | null;
	connection_status: string;
	status: 'active' | 'disabled' | 'revoked';
	sync_enabled: number;
	metadata_json: string;
}

interface AgencySessionUserLike {
	id: string;
	email: string;
}

type AgencyEntitlementRowLike = {
	account_id: string | null;
	tenant_id: string | null;
	workspace_account_id: string | null;
};

export interface LegacyLaneToolkitConnectLinkHttpErrorLike {
	status: number;
	code: string;
	message: string;
}

export interface LegacyLaneToolkitConnectLinkDeps {
	defaultToolkitComposioUserId: (clientSlug: string, toolkit: string, accountSlug: string) => string;
	ensureAgencyMcpEntitlement: (input: {
		platform: App.Platform | undefined;
		user: AgencySessionUserLike;
	}) => Promise<{ row: AgencyEntitlementRowLike }>;
	ensureLegacyClientBinding: (
		db: D1Database,
		input: {
			assignment: McpAccessAssignment;
			user: AgencySessionUserLike;
		},
	) => Promise<PartnerAuthClientRow>;
	findToolkitAccount: (
		db: D1Database,
		input: { partnerClientId: string; toolkit: string; accountSlug: string },
	) => Promise<ToolkitAccountRowLike | null>;
	getComposioClient: (
		env: PlatformEnv,
	) => {
		connectedAccounts: {
			link: (
				userId: string,
				authConfigId: string,
				options?: { callbackUrl?: string },
			) => Promise<{ id?: string | null; redirectUrl?: string | null }>;
		};
	};
	insertToolkitEvent: (
		db: D1Database,
		input: {
			partnerClientId: string;
			toolkit: string;
			accountSlug: string;
			eventType: string;
			actor: string;
			metadata: Record<string, unknown>;
		},
	) => Promise<void>;
	isToolkitAuthorized: (assignment: McpAccessAssignment, toolkit: string) => boolean;
	listMcpAccessAssignments: (
		db: D1Database,
		input: {
			email: string;
			accountId: string | null;
			tenantId: string | null;
			workspaceAccountId?: string | null;
			authSubject?: string | null;
		},
	) => Promise<McpAccessAssignment[]>;
	normalizePartnerSlug: (value: string) => string;
	normalizeToolkitSlug: (value: string) => string;
	parseJsonObject: (raw: string | null | undefined) => Record<string, unknown>;
	randomId: (prefix: string) => string;
	requireAgencySessionUser: (input: {
		cookies: unknown;
		platform: App.Platform | undefined;
	}) => Promise<AgencySessionUserLike>;
	resolveAuthConfigId: (
		env: PlatformEnv,
		toolkit: string,
	) => string | null;
	upsertToolkitAccount: (
		db: D1Database,
		input: {
			id?: string;
			partnerClientId: string;
			toolkit: string;
			accountSlug: string;
			displayLabel: string;
			composioUserId: string;
			authConfigId: string;
			connectedAccountId: string | null;
			connectionStatus: string;
			syncEnabled: boolean;
			metadata: Record<string, unknown>;
		},
	) => Promise<void>;
	isHttpError: (error: unknown) => error is LegacyLaneToolkitConnectLinkHttpErrorLike;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
	return Response.json(body, { status });
}

export function createLegacyLaneToolkitConnectLinkPostHandler(
	deps: LegacyLaneToolkitConnectLinkDeps,
) {
	return async ({ cookies, params, platform, request, url }: ConnectLinkRequestEventLike): Promise<Response> => {
		try {
			const env = platform?.env;
			if (!env?.DB) {
				return jsonResponse({ error: 'unavailable', message: 'Database is unavailable' }, 503);
			}

			const user = await deps.requireAgencySessionUser({ cookies, platform });
			const { row } = await deps.ensureAgencyMcpEntitlement({
				platform,
				user,
			});
			const laneKey = (params.laneKey ?? '').trim().toLowerCase();
			const toolkit = deps.normalizeToolkitSlug(params.toolkit ?? '');
			if (!laneKey || !toolkit) {
				return jsonResponse(
					{ error: 'invalid_request', message: 'Valid lane key and toolkit are required' },
					400,
				);
			}

			const assignments = await deps.listMcpAccessAssignments(env.DB, {
				email: user.email,
				accountId: row.account_id,
				tenantId: row.tenant_id,
				workspaceAccountId: row.workspace_account_id,
				authSubject: user.id,
			});
			const assignment = assignments.find((candidate) => candidate.laneKey === laneKey) ?? null;
			if (!assignment) {
				return jsonResponse({ error: 'not_found', message: 'Hub assignment not found' }, 404);
			}
			if (assignment.source !== 'legacy') {
				return jsonResponse(
					{
						error: 'partner_admin_required',
						message: 'Self-serve toolkit connect is currently limited to legacy shared-auth lanes.',
					},
					403,
				);
			}
			if (!deps.isToolkitAuthorized(assignment, toolkit)) {
				return jsonResponse(
					{
						error: 'toolkit_not_enabled',
						message: `Toolkit ${toolkit} is not enabled for this legacy access lane.`,
					},
					403,
				);
			}

			const body = (await request.json().catch(() => null)) as ConnectLinkRequestBody | null;
			const accountSlug = deps.normalizePartnerSlug(body?.account_slug?.trim() || 'primary');
			if (!accountSlug) {
				return jsonResponse({ error: 'invalid_request', message: 'Valid account slug is required' }, 400);
			}

			const authConfigId = deps.resolveAuthConfigId(env, toolkit);
			if (!authConfigId) {
				return jsonResponse(
					{
						error: 'auth_config_missing',
						message: `No house-managed auth config is configured for ${toolkit}.`,
					},
					409,
				);
			}

			const client = await deps.ensureLegacyClientBinding(env.DB, {
				assignment,
				user,
			});
			const existing = await deps.findToolkitAccount(env.DB, {
				partnerClientId: client.id,
				toolkit,
				accountSlug,
			});
			if (existing && existing.status !== 'active') {
				return jsonResponse(
					{
						error: 'toolkit_account_inactive',
						message: 'This toolkit account binding is not active. Operator review is required before reconnecting it.',
					},
					409,
				);
			}

			const callbackUrl = body?.callback_url?.trim() || url.searchParams.get('callback_url') || undefined;
			const composioUserId =
				existing?.composio_user_id ?? deps.defaultToolkitComposioUserId(client.slug, toolkit, accountSlug);
			const displayLabel = body?.display_label?.trim() || existing?.display_label || `${toolkit}:${accountSlug}`;
			const composio = deps.getComposioClient(env);
			const connectionRequest = await composio.connectedAccounts.link(composioUserId, authConfigId, {
				...(callbackUrl ? { callbackUrl } : {}),
			});
			if (!connectionRequest.redirectUrl) {
				return jsonResponse(
					{
						error: 'connect_link_unavailable',
						message: 'Composio did not return a redirect URL for this toolkit account.',
					},
					502,
				);
			}

			const now = new Date().toISOString();
			await deps.upsertToolkitAccount(env.DB, {
				id: existing?.id ?? deps.randomId('patoolacct'),
				partnerClientId: client.id,
				toolkit,
				accountSlug,
				displayLabel,
				composioUserId,
				authConfigId,
				connectedAccountId: connectionRequest.id ?? existing?.connected_account_id ?? null,
				connectionStatus: 'INITIATED',
				syncEnabled: existing ? Boolean(existing.sync_enabled) : true,
				metadata: {
					...deps.parseJsonObject(existing?.metadata_json),
					...(body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
						? body.metadata
						: {}),
					issued_via: 'legacy_shared_auth_self_service',
					lane_key: assignment.laneKey,
					host_key: assignment.hostKey,
					bridge_username: assignment.bridgeUsername,
					bridge_url: assignment.bridgeUrl,
					claimed_by_auth_subject: user.id,
					claimant_email: user.email,
					last_connect_link_issued_at: now,
				},
			});

			await deps.insertToolkitEvent(env.DB, {
				partnerClientId: client.id,
				toolkit,
				accountSlug,
				eventType: 'connect_link_created',
				actor: `agency:${user.id}`,
				metadata: {
					auth_config_id: authConfigId,
					connection_request_id: connectionRequest.id ?? null,
					callback_url: callbackUrl ?? null,
					issued_via: 'legacy_shared_auth_self_service',
					lane_key: assignment.laneKey,
				},
			});

			return jsonResponse({
				lane_key: assignment.laneKey,
				toolkit,
				account_slug: accountSlug,
				partner_client_id: client.id,
				client_slug: client.slug,
				composio_user_id: composioUserId,
				auth_config_id: authConfigId,
				connection_request_id: connectionRequest.id ?? null,
				connect_link: connectionRequest.redirectUrl,
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
