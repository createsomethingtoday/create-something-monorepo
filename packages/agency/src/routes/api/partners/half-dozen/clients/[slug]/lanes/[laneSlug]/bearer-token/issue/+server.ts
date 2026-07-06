import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	HALF_DOZEN_PARTNER_KEY,
	assertPartnerCredentialIssuanceAllowed,
	PartnerAuthHttpError,
	getLatestActiveConsent,
	getPartnerAccessLaneBySlug,
	getPartnerClientBySlug,
	insertPartnerAccessDelivery,
	normalizePartnerAccessLaneSlug,
	normalizePartnerSlug,
	parseJsonArray,
	parseJsonObject,
	parseJsonStringArray,
	postIdentityAdmin,
	randomId,
	requirePartnerAdmin,
	tokenPreview,
} from '$lib/server/partner-auth';
import { requireExplicitManagedBearerRotation, type ManagedBearerTokenMetadata } from '$lib/server/managed-bearer-issuance';
import { reconcileAgencyMcpEntitlement } from '$lib/server/mcp-entitlements';

interface IssueLaneBearerTokenRequestBody {
	tool_mode?: 'read_only' | 'read_write';
	rotate_existing?: boolean;
	delivery_channel?: 'portal' | 'secure_note' | 'email' | 'manual';
	recipient?: string;
	metadata?: Record<string, unknown>;
}

interface TokenMetadataResponse {
	token: ManagedBearerTokenMetadata | null;
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

export const POST: RequestHandler = async ({ request, params, platform }) => {
	try {
		const env = platform?.env;
		if (!env?.DB) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const actor = requirePartnerAdmin(request, env);
		const clientSlug = normalizePartnerSlug(params.slug);
		const laneSlug = normalizePartnerAccessLaneSlug(params.laneSlug);
		if (!clientSlug || !laneSlug) {
			return json({ error: 'invalid_request', message: 'Client slug and lane slug are required' }, { status: 400 });
		}

		const client = await getPartnerClientBySlug(env.DB, HALF_DOZEN_PARTNER_KEY, clientSlug);
		if (!client) {
			return json({ error: 'not_found', message: 'Partner client not found' }, { status: 404 });
		}

		const lane = await getPartnerAccessLaneBySlug(env.DB, client.id, laneSlug);
		if (!lane) {
			return json({ error: 'not_found', message: 'Named access lane not found' }, { status: 404 });
		}
		assertPartnerCredentialIssuanceAllowed({
			clientMetadata: parseJsonObject(client.metadata_json),
			laneMetadata: parseJsonObject(lane.metadata_json),
			surface: 'managed_bearer',
		});
		if (!isIssuableStatus(client.status) || !isIssuableStatus(lane.status)) {
			return json(
				{
					error: 'lane_not_active',
					message: 'Client or lane is not active for managed bearer issuance.',
				},
				{ status: 409 },
			);
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
			return json(
				{
					error: 'consent_required',
					message: 'No active consent record found for this client.',
				},
				{ status: 409 },
			);
		}

		const body = (await request.json().catch(() => null)) as IssueLaneBearerTokenRequestBody | null;
		const metadata =
			body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {};
		const laneMetadata = parseJsonObject(lane.metadata_json);
		const toolkitProfile = parseJsonArray(lane.toolkit_profile_json);
		const allowedToolPrefixes = parseJsonStringArray(lane.allowed_tool_prefixes_json);
		const authEmail = lane.owner_email ?? client.owner_email ?? null;
		const observabilityBaseline = resolveObservabilityBaseline(laneMetadata);

		await reconcileAgencyMcpEntitlement(env.DB, {
			authSubject: lane.identity_user_id,
			authEmail,
			accountId: client.identity_account_id,
			tenantId: client.identity_tenant_id,
			workspaceAccountId: client.workspace_account_id,
			serviceTier: 'mcp_only',
			metadata: {
				partner_access_lane_slug: lane.slug,
				partner_access_lane_display_name: lane.display_name,
				partner_access_lane_url: lane.hub_url,
				partner_access_lane_host_key: lane.host_key,
				approved_exception: laneMetadata.approved_exception ?? null,
				observability_baseline: observabilityBaseline,
			},
		});

		const existing = await postIdentityAdmin<TokenMetadataResponse>(env, '/v1/mcp/long-lived-tokens/admin-get', {
			auth_subject: lane.identity_user_id,
		});
		const issuanceDecision = requireExplicitManagedBearerRotation({
			existingToken: existing.token,
			rotateExisting: body?.rotate_existing === true,
		});
		if (!issuanceDecision.ok) {
			return json(issuanceDecision.body, { status: issuanceDecision.status });
		}

		const issued = await postIdentityAdmin<IssueManagedTokenResponse>(env, '/v1/mcp/long-lived-tokens/admin-issue', {
			auth_subject: lane.identity_user_id,
			auth_email: authEmail,
			account_id: client.identity_account_id,
			tenant_id: client.identity_tenant_id,
			toolkit_profile: toolkitProfile,
			allowed_tool_prefixes: allowedToolPrefixes,
			bound_host: lane.host_key,
			tool_mode: body?.tool_mode ?? 'read_write',
			actor,
			metadata: {
				issued_via: 'partner_managed_named_lane_bearer',
				partner_key: HALF_DOZEN_PARTNER_KEY,
				client_slug: client.slug,
				client_display_name: client.display_name,
				lane_slug: lane.slug,
				lane_display_name: lane.display_name,
				lane_hub_url: lane.hub_url,
				lane_host_key: lane.host_key,
				workspace_account_id: client.workspace_account_id,
				credential_source: 'Partner-managed named lane',
				consent_record_id: consent.id,
				consent_granted_at: consent.granted_at,
				observability_baseline: observabilityBaseline,
				rotation_requested: body?.rotate_existing === true,
				...metadata,
			},
		});

		const deliveryChannel = body?.delivery_channel ?? 'portal';
		const recipient = body?.recipient?.trim() || authEmail || null;
		await insertPartnerAccessDelivery(env.DB, {
			id: randomId('padelivery'),
			partnerClientId: client.id,
			deliveryType: 'managed_bearer_bundle',
			deliveryChannel,
			deliveredBy: actor,
			recipient,
			artifactRef: issued.token_id,
			expiresAt: null,
			metadata: {
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
				client_slug: client.slug,
				lane_slug: lane.slug,
				lane_display_name: lane.display_name,
				lane_hub_url: lane.hub_url,
				lane_host_key: lane.host_key,
				credential_source: 'Partner-managed named lane',
				consent_record_id: consent.id,
				observability_baseline: observabilityBaseline,
			},
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
};

function isIssuableStatus(status: string): boolean {
	return status === 'active' || status === 'initialized';
}

function resolveObservabilityBaseline(metadata: Record<string, unknown>): { telemetry: true; langfuse: true } {
	const baseline = metadata.observability_baseline;
	if (baseline && typeof baseline === 'object' && !Array.isArray(baseline)) {
		return {
			telemetry: true,
			langfuse: true,
		};
	}
	return {
		telemetry: true,
		langfuse: true,
	};
}
