import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PartnerAuthHttpError, postIdentityAdmin } from '$lib/server/partner-auth';
import { ensureAgencyMcpEntitlement, requireAgencySessionUser } from '$lib/server/mcp-token';
import { resolveAgencyManagedBearerTokenScope } from '$lib/server/mcp-token-issuance';

interface TokenMetadataResponse {
	token: {
		id: string;
		auth_subject: string;
		auth_email: string | null;
		account_id: string;
		tenant_id: string;
		token_prefix: string;
		tool_mode: 'read_only' | 'read_write';
		toolkit_profile: string[];
		allowed_tool_prefixes: string[];
		last_used_at: string | null;
		revoked_at: string | null;
		created_at: string;
		updated_at: string;
		active: boolean;
	} | null;
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

interface CreateTokenBody {
	tenant_id?: string;
	account_id?: string;
	toolkit_profile?: string[];
	allowed_tool_prefixes?: string[];
	tool_mode?: 'read_only' | 'read_write';
	metadata?: Record<string, unknown>;
}

export const GET: RequestHandler = async ({ request, locals, platform }) => {
	try {
		const env = platform?.env;
		if (!env) {
			return json({ error: 'unavailable', message: 'Platform env is unavailable' }, { status: 503 });
		}

		const user = await requireAgencySessionUser({ locals, request, platform });
		const result = await postIdentityAdmin<TokenMetadataResponse>(env, '/v1/mcp/long-lived-tokens/admin-get', {
			auth_subject: user.id,
		});

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

export const POST: RequestHandler = async ({ request, locals, platform }) => {
	try {
		const env = platform?.env;
		if (!env) {
			return json({ error: 'unavailable', message: 'Platform env is unavailable' }, { status: 503 });
		}

		const user = await requireAgencySessionUser({ locals, request, platform });
		const body = (await request.json().catch(() => null)) as CreateTokenBody | null;
		const entitlement = await ensureAgencyMcpEntitlement({
			platform,
			user,
			accountId: body?.account_id,
			tenantId: body?.tenant_id,
			metadata: {
				managed_bearer_request: 'issue',
			},
		});
		if (!entitlement.decision.allowed) {
			return json(
				{
					error: 'entitlement_denied',
					message: entitlement.decision.reason,
					entitlement: entitlement.decision,
				},
				{ status: 403 },
			);
		}

		const existing = await postIdentityAdmin<TokenMetadataResponse>(env, '/v1/mcp/long-lived-tokens/admin-get', {
			auth_subject: user.id,
		});
		if (existing.token?.active) {
			return json(
				{
					error: 'token_exists',
					message: 'An active MCP token already exists. Use regenerate to replace it.',
					token: existing.token,
				},
				{ status: 409 },
			);
		}

		const scope = await resolveAgencyManagedBearerTokenScope({
			platform,
			user,
			entitlement: entitlement.row,
			body,
		});

		const issued = await postIdentityAdmin<IssueManagedTokenResponse>(env, '/v1/mcp/long-lived-tokens/admin-issue', {
			auth_subject: user.id,
			auth_email: user.email,
			tenant_id: entitlement.row.tenant_id ?? body?.tenant_id,
			account_id: entitlement.row.account_id ?? body?.account_id,
			toolkit_profile: scope.toolkitProfile,
			allowed_tool_prefixes: scope.allowedToolPrefixes,
			tool_mode: body?.tool_mode,
			actor: `agency:${user.id}`,
			metadata: {
				issued_via: 'agency_api',
				entitlement_reason: entitlement.decision.reason,
				...(scope.assignment
					? {
							access_assignment_source: scope.assignment.source,
							access_assignment_lane_key: scope.assignment.laneKey,
						}
					: {}),
				...(body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata) ? body.metadata : {}),
			},
		});

		return json({
			token: issued.token,
			token_id: issued.token_id,
			token_prefix: issued.token_prefix,
			account_id: issued.account_id,
			tenant_id: issued.tenant_id,
			tool_mode: issued.tool_mode,
			toolkit_profile: issued.toolkit_profile,
			allowed_tool_prefixes: issued.allowed_tool_prefixes,
		});
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
