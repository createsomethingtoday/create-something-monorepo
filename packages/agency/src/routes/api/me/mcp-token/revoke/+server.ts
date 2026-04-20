import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PartnerAuthHttpError, postIdentityAdmin } from '$lib/server/partner-auth';
import { requireAgencySessionUser } from '$lib/server/mcp-token';

interface TokenMetadataResponse {
	token: {
		id: string;
		active: boolean;
	} | null;
}

interface RevokeResponse {
	success: boolean;
	token_id: string;
	revoked: boolean;
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	try {
		const env = platform?.env;
		if (!env) {
			return json({ error: 'unavailable', message: 'Platform env is unavailable' }, { status: 503 });
		}

		const user = await requireAgencySessionUser({ locals, request, platform });
		const existing = await postIdentityAdmin<TokenMetadataResponse>(env, '/v1/mcp/long-lived-tokens/admin-get', {
			auth_subject: user.id,
		});

		if (!existing.token?.id || !existing.token.active) {
			return json({ success: true, revoked: false, token_id: null });
		}

		const result = await postIdentityAdmin<RevokeResponse>(
			env,
			`/v1/mcp/long-lived-tokens/${existing.token.id}/revoke`,
			{},
		);

		return json(result);
	} catch (error) {
		if (error instanceof PartnerAuthHttpError) {
			return json({ error: error.code, message: error.message }, { status: error.status });
		}
		return json(
			{ error: 'internal_error', message: error instanceof Error ? error.message : 'Unexpected error' },
			{ status: 500 },
		);
	}
};
