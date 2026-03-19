import {
	getProspectAvailabilityConflict,
	type ProspectSelfServiceStatus,
} from './partner-prospect-claim-shared.js';
import type { PlatformEnv } from './partner-auth.js';

interface ConnectLinkRequestBody {
	lane_slug?: string;
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

interface ProspectClientRowLike {
	id: string;
	slug: string;
	display_name: string | null;
	workspace_account_id: string;
	identity_user_id: string | null;
	status: ProspectSelfServiceStatus | 'paused' | 'sunset' | 'disabled';
	required_toolkits_json: string;
	metadata_json: string;
}

interface ProspectLaneRowLike {
	id: string;
	slug: string;
	identity_user_id: string | null;
	status: ProspectSelfServiceStatus | 'paused' | 'sunset' | 'disabled';
	toolkit_profile_json: string;
	metadata_json: string;
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

export interface PartnerProspectToolkitConnectLinkHttpErrorLike {
	status: number;
	code: string;
	message: string;
}

export interface PartnerProspectToolkitConnectLinkDeps {
	partnerKey: string;
	defaultToolkitComposioUserId: (clientSlug: string, toolkit: string, accountSlug: string) => string;
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
	isProspectGraduated: (metadata: Record<string, unknown>) => boolean;
	isProspectRecord: (metadata: Record<string, unknown>) => boolean;
	normalizePartnerAccessLaneSlug: (value: string) => string;
	normalizePartnerSlug: (value: string) => string;
	normalizeToolkitSlug: (value: string) => string;
	parseJsonArray: (raw: string | null | undefined) => string[];
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
	isHttpError: (error: unknown) => error is PartnerProspectToolkitConnectLinkHttpErrorLike;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
	return Response.json(body, { status });
}

export function createPartnerProspectToolkitConnectLinkPostHandler(
	deps: PartnerProspectToolkitConnectLinkDeps,
) {
	return async ({ cookies, params, platform, request, url }: ConnectLinkRequestEventLike): Promise<Response> => {
		try {
			const env = platform?.env;
			if (!env?.DB) {
				return jsonResponse({ error: 'unavailable', message: 'Database is unavailable' }, 503);
			}

			const user = await deps.requireAgencySessionUser({ cookies, platform });
			const slug = deps.normalizePartnerSlug(params.slug ?? '');
			const toolkit = deps.normalizeToolkitSlug(params.toolkit ?? '');
			if (!slug || !toolkit) {
				return jsonResponse(
					{ error: 'invalid_request', message: 'Valid prospect slug and toolkit are required' },
					400,
				);
			}

			const body = (await request.json().catch(() => null)) as ConnectLinkRequestBody | null;
			const laneSlug = deps.normalizePartnerAccessLaneSlug(body?.lane_slug?.trim() || `prospect-${slug}`);
			const accountSlug = deps.normalizePartnerSlug(body?.account_slug?.trim() || 'primary');
			if (!accountSlug) {
				return jsonResponse({ error: 'invalid_request', message: 'Valid account slug is required' }, 400);
			}

			const client = await deps.getPartnerClientBySlug(env.DB, deps.partnerKey, slug);
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
						message: 'This prospect has already graduated. Use the standard client-managed toolkit auth path instead.',
					},
					409,
				);
			}

			const lane = await deps.getPartnerAccessLaneBySlug(env.DB, client.id, laneSlug);
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

			if (client.identity_user_id !== user.id && lane.identity_user_id !== user.id) {
				return jsonResponse(
					{
						error: 'prospect_not_claimed',
						message: 'Claim this prospect workspace before creating self-service toolkit connect links.',
					},
					403,
				);
			}

			const enabledToolkits = new Set([
				...deps.parseJsonArray(client.required_toolkits_json),
				...deps.parseJsonArray(lane.toolkit_profile_json),
			]);
			if (!enabledToolkits.has(toolkit)) {
				return jsonResponse(
					{
						error: 'toolkit_not_enabled',
						message: `Toolkit ${toolkit} is not enabled for this prospect workspace.`,
					},
					403,
				);
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
					...(body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {}),
					issued_via: 'prospect_self_service',
					claimed_by_auth_subject: user.id,
					claimant_email: user.email,
					lane_slug: lane.slug,
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
					issued_via: 'prospect_self_service',
					lane_slug: lane.slug,
				},
			});

			return jsonResponse({
				client_slug: client.slug,
				lane_slug: lane.slug,
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
