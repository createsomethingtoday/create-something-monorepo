import type { McpAccessAssignment } from './mcp-access-assignments.js';
import {
	hasLegacySelfServeToolkitScope,
	isToolkitAuthorizedForAssignment,
} from './mcp-legacy-toolkit-bindings.ts';
import type { PlatformEnv } from './partner-auth.js';

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

export interface LegacyMcpToolkitConnectLinkHttpErrorLike {
	status: number;
	code: string;
	message: string;
}

export interface LegacyMcpToolkitConnectLinkDeps {
	buildBindingId: (assignment: McpAccessAssignment) => string;
	buildBindingSlug: (assignment: McpAccessAssignment) => string;
	defaultToolkitComposioUserId: (clientSlug: string, toolkit: string, accountSlug: string) => string;
	findToolkitAccount: (
		db: D1Database,
		input: { bindingId: string; toolkit: string; accountSlug: string },
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
			bindingId: string;
			toolkit: string;
			accountSlug: string;
			eventType: string;
			actor: string;
			metadata: Record<string, unknown>;
		},
	) => Promise<void>;
	normalizeAccountSlug: (value: string) => string;
	normalizeLegacyLaneKey: (value: string) => string;
	normalizeToolkitSlug: (value: string) => string;
	parseJsonObject: (raw: string | null | undefined) => Record<string, unknown>;
	randomId: (prefix: string) => string;
	requireAgencySessionUser: (input: {
		cookies: unknown;
		platform: App.Platform | undefined;
	}) => Promise<AgencySessionUserLike>;
	resolveAccessAssignment: (input: {
		db: D1Database;
		laneKey: string;
		platform: App.Platform | undefined;
		user: AgencySessionUserLike;
	}) => Promise<McpAccessAssignment | null>;
	resolveAuthConfigId: (env: PlatformEnv, toolkit: string) => string | null;
	upsertToolkitAccount: (
		db: D1Database,
		input: {
			id?: string;
			bindingId: string;
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
	isHttpError: (error: unknown) => error is LegacyMcpToolkitConnectLinkHttpErrorLike;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
	return Response.json(body, { status });
}

export function createLegacyMcpToolkitConnectLinkPostHandler(
	deps: LegacyMcpToolkitConnectLinkDeps,
) {
	return async ({ cookies, params, platform, request, url }: ConnectLinkRequestEventLike): Promise<Response> => {
		try {
			const env = platform?.env;
			if (!env?.DB) {
				return jsonResponse({ error: 'unavailable', message: 'Database is unavailable' }, 503);
			}

			const user = await deps.requireAgencySessionUser({ cookies, platform });
			const laneKey = deps.normalizeLegacyLaneKey(params.laneKey ?? '');
			const toolkit = deps.normalizeToolkitSlug(params.toolkit ?? '');
			if (!laneKey || !toolkit) {
				return jsonResponse(
					{ error: 'invalid_request', message: 'Valid legacy lane and toolkit are required' },
					400,
				);
			}

			const assignment = await deps.resolveAccessAssignment({
				db: env.DB,
				laneKey,
				platform,
				user,
			});
			if (!assignment) {
				return jsonResponse({ error: 'not_found', message: 'Hub assignment not found' }, 404);
			}
			if (!hasLegacySelfServeToolkitScope(assignment)) {
				return jsonResponse(
					{
						error: 'self_serve_unavailable',
						message: 'This lane does not support self-serve toolkit connections.',
					},
					409,
				);
			}
			if (!isToolkitAuthorizedForAssignment(assignment, toolkit)) {
				return jsonResponse(
					{
						error: 'toolkit_not_authorized',
						message: `Toolkit ${toolkit} is not authorized for this legacy lane.`,
					},
					403,
				);
			}

			const body = (await request.json().catch(() => null)) as ConnectLinkRequestBody | null;
			const accountSlug = deps.normalizeAccountSlug(body?.account_slug?.trim() || 'primary');
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

			const bindingId = deps.buildBindingId(assignment);
			const existing = await deps.findToolkitAccount(env.DB, {
				bindingId,
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
				existing?.composio_user_id ??
				deps.defaultToolkitComposioUserId(deps.buildBindingSlug(assignment), toolkit, accountSlug);
			const displayLabel =
				body?.display_label?.trim() || existing?.display_label || `${assignment.displayName} ${toolkit} ${accountSlug}`;
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
				bindingId,
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
					...(body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {}),
					issued_via: 'mcp_access_legacy_self_service',
					lane_key: assignment.laneKey,
					lane_source: assignment.source,
					hub_url: assignment.hubUrl,
					bridge_url: assignment.bridgeUrl,
					bridge_username: assignment.bridgeUsername,
					auth_subject: user.id,
					claimant_email: user.email,
					last_connect_link_issued_at: now,
				},
			});

			await deps.insertToolkitEvent(env.DB, {
				bindingId,
				toolkit,
				accountSlug,
				eventType: 'connect_link_created',
				actor: `agency:${user.id}`,
				metadata: {
					auth_config_id: authConfigId,
					connection_request_id: connectionRequest.id ?? null,
					callback_url: callbackUrl ?? null,
					issued_via: 'mcp_access_legacy_self_service',
					lane_key: assignment.laneKey,
				},
			});

			return jsonResponse({
				lane_key: assignment.laneKey,
				toolkit,
				account_slug: accountSlug,
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
