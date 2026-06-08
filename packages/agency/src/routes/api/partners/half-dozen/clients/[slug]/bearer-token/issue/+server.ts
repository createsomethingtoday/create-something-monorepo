import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	HALF_DOZEN_PARTNER_KEY,
	assertPartnerCredentialIssuanceAllowed,
	PartnerAuthHttpError,
	getLatestActiveConsent,
	getPartnerClientBySlug,
	insertPartnerAccessDelivery,
	normalizePartnerSlug,
	parseJsonArray,
	parseJsonObject,
	postIdentityAdmin,
	randomId,
	requirePartnerAdmin,
	tokenPreview,
} from '$lib/server/partner-auth';
import { requireExplicitManagedBearerRotation, type ManagedBearerTokenMetadata } from '$lib/server/managed-bearer-issuance';
import { reconcileAgencyMcpEntitlement } from '$lib/server/mcp-entitlements';

interface IssueBearerTokenRequestBody {
	toolkit_profile?: string[];
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
		assertPartnerCredentialIssuanceAllowed({
			clientMetadata: parseJsonObject(client.metadata_json),
			surface: 'managed_bearer',
		});
		if (!client.identity_user_id) {
			return json(
					{
						error: 'missing_identity_user',
						message: 'Client is missing identity_user_id. Managed bearer tokens require a mapped identity subject.',
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

		const body = (await request.json().catch(() => null)) as IssueBearerTokenRequestBody | null;
		const toolkitProfile =
			Array.isArray(body?.toolkit_profile) && body?.toolkit_profile.length > 0
				? body.toolkit_profile
				: parseJsonArray(client.required_toolkits_json);
		const metadata =
			body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {};

		await reconcileAgencyMcpEntitlement(env.DB, {
			authSubject: client.identity_user_id,
			authEmail: client.owner_email,
			accountId: client.identity_account_id,
			tenantId: client.identity_tenant_id,
			workspaceAccountId: client.workspace_account_id,
			serviceTier: 'mcp_only',
		});

		const existing = await postIdentityAdmin<TokenMetadataResponse>(env, '/v1/mcp/long-lived-tokens/admin-get', {
			auth_subject: client.identity_user_id,
		});
		const issuanceDecision = requireExplicitManagedBearerRotation({
			existingToken: existing.token,
			rotateExisting: body?.rotate_existing === true,
		});
		if (!issuanceDecision.ok) {
			return json(issuanceDecision.body, { status: issuanceDecision.status });
		}

		const issued = await postIdentityAdmin<IssueManagedTokenResponse>(env, '/v1/mcp/long-lived-tokens/admin-issue', {
			auth_subject: client.identity_user_id,
			auth_email: client.owner_email,
			account_id: client.identity_account_id,
			tenant_id: client.identity_tenant_id,
			toolkit_profile: toolkitProfile,
			tool_mode: body?.tool_mode ?? 'read_write',
			actor,
			metadata: {
				issued_via: 'partner_managed_bearer',
				partner_key: HALF_DOZEN_PARTNER_KEY,
				client_slug: client.slug,
				workspace_account_id: client.workspace_account_id,
				consent_record_id: consent.id,
				consent_granted_at: consent.granted_at,
				rotation_requested: body?.rotate_existing === true,
				...metadata,
			},
		});

		const deliveryChannel = body?.delivery_channel ?? 'portal';
		const recipient = body?.recipient?.trim() || client.owner_email || null;
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
				consent_record_id: consent.id,
			},
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
