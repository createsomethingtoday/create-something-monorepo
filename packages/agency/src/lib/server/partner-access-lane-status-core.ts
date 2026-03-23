import type {
	PartnerAuthAccessLaneRow,
	PartnerAuthClientRow,
	PartnerAuthConsentRow,
	PlatformEnv,
} from './partner-auth.js';

export interface PartnerAccessLaneStatusHttpErrorLike {
	status: number;
	code: string;
	message: string;
}

interface GetLaneStatusEventLike {
	request: Request;
	params: Record<string, string | undefined>;
	platform?: App.Platform;
}

export interface PartnerAccessLaneStatusDeps {
	partnerKey: string;
	getLatestActiveConsent: (
		db: D1Database,
		partnerClientId: string,
	) => Promise<PartnerAuthConsentRow | null>;
	getPartnerAccessLaneBySlug: (
		db: D1Database,
		partnerClientId: string,
		laneSlug: string,
	) => Promise<PartnerAuthAccessLaneRow | null>;
	getPartnerClientBySlug: (
		db: D1Database,
		partnerKey: string,
		slug: string,
	) => Promise<PartnerAuthClientRow | null>;
	normalizePartnerAccessLaneSlug: (value: string) => string;
	normalizePartnerSlug: (value: string) => string;
	parseJsonArray: (raw: string | null | undefined) => string[];
	parseJsonObject: (raw: string | null | undefined) => Record<string, unknown>;
	parseJsonStringArray: (raw: string | null | undefined) => string[];
	requirePartnerAdmin: (request: Request, env: PlatformEnv) => string;
	isHttpError: (error: unknown) => error is PartnerAccessLaneStatusHttpErrorLike;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
	return Response.json(body, { status });
}

export function createPartnerAccessLaneStatusGetHandler(deps: PartnerAccessLaneStatusDeps) {
	return async ({ request, params, platform }: GetLaneStatusEventLike): Promise<Response> => {
		try {
			const env = platform?.env;
			if (!env?.DB) {
				return jsonResponse({ error: 'unavailable', message: 'Database is unavailable' }, 503);
			}

			deps.requirePartnerAdmin(request, env);

			const clientSlug = deps.normalizePartnerSlug(params.slug ?? '');
			const laneSlug = deps.normalizePartnerAccessLaneSlug(params.laneSlug ?? '');
			if (!clientSlug || !laneSlug) {
				return jsonResponse(
					{ error: 'invalid_request', message: 'Valid client slug and lane slug are required' },
					400,
				);
			}

			const client = await deps.getPartnerClientBySlug(env.DB, deps.partnerKey, clientSlug);
			if (!client) {
				return jsonResponse({ error: 'not_found', message: 'Partner client not found' }, 404);
			}

			const lane = await deps.getPartnerAccessLaneBySlug(env.DB, client.id, laneSlug);
			if (!lane) {
				return jsonResponse({ error: 'not_found', message: 'Named access lane not found' }, 404);
			}

			const consent = await deps.getLatestActiveConsent(env.DB, client.id);
			const clientMetadata = deps.parseJsonObject(client.metadata_json);
			const laneMetadata = deps.parseJsonObject(lane.metadata_json);
			const clientStatusIssuable = isIssuableStatus(client.status);
			const laneStatusIssuable = isIssuableStatus(lane.status);
			const identityAccountReady = Boolean(client.identity_account_id);
			const identityTenantReady = Boolean(client.identity_tenant_id);
			const laneIdentitySubjectReady = Boolean(lane.identity_user_id);
			const consentReady = Boolean(consent);

			return jsonResponse({
				client: {
					id: client.id,
					slug: client.slug,
					display_name: client.display_name,
					workspace_account_id: client.workspace_account_id,
					identity_account_id: client.identity_account_id,
					identity_user_id: client.identity_user_id,
					identity_tenant_id: client.identity_tenant_id,
					owner_email: client.owner_email,
					status: client.status,
					required_toolkits: deps.parseJsonArray(client.required_toolkits_json),
					metadata: clientMetadata,
				},
				lane: {
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
					metadata: laneMetadata,
				},
				active_consent: consent
					? {
							present: true,
							id: consent.id,
							granted_at: consent.granted_at,
							expires_at: consent.expires_at,
						}
					: {
							present: false,
							id: null,
							granted_at: null,
							expires_at: null,
						},
				readiness: {
					client_status_issuable: clientStatusIssuable,
					lane_status_issuable: laneStatusIssuable,
					identity_account_ready: identityAccountReady,
					identity_tenant_ready: identityTenantReady,
					lane_identity_subject_ready: laneIdentitySubjectReady,
					consent_ready: consentReady,
					strict_session_ready: clientStatusIssuable && laneStatusIssuable && identityAccountReady && consentReady,
					managed_bearer_ready:
						clientStatusIssuable &&
						laneStatusIssuable &&
						identityAccountReady &&
						identityTenantReady &&
						laneIdentitySubjectReady &&
						consentReady,
				},
				checked_at: new Date().toISOString(),
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

function isIssuableStatus(status: string): boolean {
	return status === 'active' || status === 'initialized';
}
