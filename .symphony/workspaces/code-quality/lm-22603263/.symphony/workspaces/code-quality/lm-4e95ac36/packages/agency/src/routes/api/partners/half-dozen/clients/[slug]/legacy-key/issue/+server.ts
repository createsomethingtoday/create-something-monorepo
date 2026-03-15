import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	HALF_DOZEN_PARTNER_KEY,
	PartnerAuthHttpError,
	getLatestActiveConsent,
	getPartnerClientBySlug,
	insertPartnerAccessDelivery,
	normalizePartnerSlug,
	postIdentityAdmin,
	randomId,
	requirePartnerAdmin,
} from '$lib/server/partner-auth';

interface IssueLegacyKeyRequestBody {
	reason?: string;
	exception_approved_by?: string;
	ttl_seconds?: number;
	sunset_at?: string;
	legacy_mcp_url?: string;
	delivery_channel?: 'portal' | 'secure_note' | 'email' | 'manual';
	recipient?: string;
	metadata?: Record<string, unknown>;
}

interface LegacyPolicyDecision {
	policy_id: string;
	decision: 'allow' | 'require_human_review' | 'block';
	evaluation_path: 'legacy' | 'primary' | 'fallback';
	policy_hash: string | null;
	fallback_used: boolean;
	rollout_mode: 'legacy_enforce' | 'shadow' | 'polar_enforce';
	canary_percent: number;
	reason: string;
}

interface IssueLegacyKeyResponse {
	legacy_key_id: string;
	legacy_key: string;
	key_prefix: string;
	account_id: string;
	tenant_id: string;
	expires_at: string;
	sunset_at: string;
	policies: LegacyPolicyDecision[];
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

		const body = await request.json().catch(() => null) as IssueLegacyKeyRequestBody | null;
		if (!body || typeof body !== 'object') {
			return json({ error: 'invalid_request', message: 'Invalid JSON body' }, { status: 400 });
		}

		const reason = body.reason?.trim();
		if (!reason) {
			return json({ error: 'invalid_request', message: 'reason is required' }, { status: 400 });
		}

		const exceptionApprovedBy = body.exception_approved_by?.trim();
		if (!exceptionApprovedBy) {
			return json(
				{
					error: 'invalid_request',
					message: 'exception_approved_by is required for legacy key issuance',
				},
				{ status: 400 },
			);
		}

		if (!body.sunset_at?.trim()) {
			return json({ error: 'invalid_request', message: 'sunset_at is required' }, { status: 400 });
		}

		const issueResponse = await postIdentityAdmin<IssueLegacyKeyResponse>(env, '/v1/mcp/legacy-keys/issue', {
			account_id: client.identity_account_id,
			reason,
			exception_approved_by: exceptionApprovedBy,
			ttl_seconds: body.ttl_seconds,
			sunset_at: body.sunset_at,
			actor,
			metadata: {
				partner_key: HALF_DOZEN_PARTNER_KEY,
				client_slug: client.slug,
				workspace_account_id: client.workspace_account_id,
				consent_record_id: consent.id,
				consent_granted_at: consent.granted_at,
				...(body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {}),
			},
		});

		const deliveryChannel = body.delivery_channel ?? 'portal';
		const recipient = body.recipient?.trim() || client.owner_email || null;
		await insertPartnerAccessDelivery(env.DB, {
			id: randomId('padelivery'),
			partnerClientId: client.id,
			deliveryType: 'legacy_key_bundle',
			deliveryChannel,
			deliveredBy: actor,
			recipient,
			artifactRef: issueResponse.legacy_key_id,
			expiresAt: issueResponse.expires_at,
			metadata: {
				tenant_id: issueResponse.tenant_id,
				account_id: issueResponse.account_id,
				key_prefix: issueResponse.key_prefix,
				sunset_at: issueResponse.sunset_at,
				legacy_mcp_url: body.legacy_mcp_url?.trim() || null,
				policies: issueResponse.policies,
			},
		});

		return json({
			client_slug: client.slug,
			workspace_account_id: client.workspace_account_id,
			identity_account_id: issueResponse.account_id,
			legacy_bundle: {
				mode: 'legacy',
				mcp_url: body.legacy_mcp_url?.trim() || null,
				authorization: `Bearer ${issueResponse.legacy_key}`,
				legacy_key_id: issueResponse.legacy_key_id,
				key_prefix: issueResponse.key_prefix,
				expires_at: issueResponse.expires_at,
				sunset_at: issueResponse.sunset_at,
				policies: issueResponse.policies,
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
