import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	HALF_DOZEN_PARTNER_KEY,
	PartnerAuthHttpError,
	getLatestActiveConsent,
	getPartnerClientBySlug,
	insertPartnerAccessDelivery,
	normalizePartnerSlug,
	parseJsonArray,
	parseToolkitList,
	postIdentityAdmin,
	randomId,
	requirePartnerAdmin,
	tokenPreview,
} from '$lib/server/partner-auth';

interface MintAccessRequestBody {
	host?: string;
	toolkit_profile?: string[];
	tool_mode?: 'read_only' | 'read_write';
	ttl_seconds?: number;
	delivery_channel?: 'portal' | 'secure_note' | 'email' | 'manual';
	recipient?: string;
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
	tool_mode: 'read_only' | 'read_write';
	toolkit_profile: string[];
	allowed_tool_prefixes: string[];
	policy: {
		policy_id: string;
		decision: 'allow' | 'require_human_review' | 'block';
		evaluation_path: 'legacy' | 'primary' | 'fallback';
		policy_hash: string | null;
		fallback_used: boolean;
		rollout_mode: 'legacy_enforce' | 'shadow' | 'polar_enforce';
		canary_percent: number;
		reason: string;
	};
}

export const POST: RequestHandler = async ({ request, params, platform }) => {
	try {
		const env = platform?.env;
		if (!env?.DB) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const actor = requirePartnerAdmin(request, env);
		const slug = normalizePartnerSlug(params.slug);
		if (!slug) {
			return json({ error: 'invalid_request', message: 'Client slug is required' }, { status: 400 });
		}

		const client = await getPartnerClientBySlug(env.DB, HALF_DOZEN_PARTNER_KEY, slug);
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
			return json(
				{
					error: 'consent_required',
					message: 'No active consent record found for this client.',
				},
				{ status: 409 },
			);
		}

		const body = await request.json().catch(() => null) as MintAccessRequestBody | null;
		const requiredToolkits = parseJsonArray(client.required_toolkits_json);
		const toolkitProfile =
			body?.toolkit_profile !== undefined ? parseToolkitList(body.toolkit_profile) : requiredToolkits;

		const mintResponse = await postIdentityAdmin<AdminMintResponse>(env, '/v1/mcp/sessions/admin-mint', {
			account_id: client.identity_account_id,
			host: body?.host ?? `partner_${slug}`,
			tool_mode: body?.tool_mode ?? 'read_write',
			ttl_seconds: body?.ttl_seconds,
			toolkit_profile: toolkitProfile,
			consent_record_id: consent.id,
			consent_granted_at: consent.granted_at,
			actor,
			metadata: {
				partner_key: HALF_DOZEN_PARTNER_KEY,
				client_slug: client.slug,
				workspace_account_id: client.workspace_account_id,
				...(body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {}),
			},
		});
		const endpoint = resolveMcpEndpoint(mintResponse.mcp_url, env.MCP_HUB_GATEWAY_BEARER);
		const accessHeaders: Record<string, string> = {
			'X-MCP-Session-Token': mintResponse.token,
		};
		if (endpoint.gatewayBearerToken) {
			accessHeaders.Authorization = `Bearer ${endpoint.gatewayBearerToken}`;
		}

		const deliveryChannel = body?.delivery_channel ?? 'portal';
		const recipient = body?.recipient?.trim() || client.owner_email || null;
		await insertPartnerAccessDelivery(env.DB, {
			id: randomId('padelivery'),
			partnerClientId: client.id,
			deliveryType: 'strict_session_bundle',
			deliveryChannel,
			deliveredBy: actor,
			recipient,
			artifactRef: mintResponse.session_id,
			expiresAt: mintResponse.expires_at,
			metadata: {
				account_id: mintResponse.account_id,
				tenant_id: mintResponse.tenant_id,
				host: mintResponse.host,
				tool_mode: mintResponse.tool_mode,
				toolkit_profile: mintResponse.toolkit_profile,
				allowed_tool_prefixes: mintResponse.allowed_tool_prefixes,
				session_token_preview: tokenPreview(mintResponse.token),
				gateway_auth_mode: endpoint.gatewayBearerToken ? 'bearer_header' : 'none',
				policy: mintResponse.policy,
			},
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
