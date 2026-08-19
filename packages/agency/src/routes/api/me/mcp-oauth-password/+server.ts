import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PartnerAuthHttpError, postIdentityAdmin } from '$lib/server/partner-auth';
import { requireAgencySessionUser } from '$lib/server/mcp-token';
import {
	evaluateAgencyMcpEntitlement,
	reconcileAgencyMcpEntitlement,
	updateAgencyMcpEntitlement,
	type AgencyMcpEntitlementRow,
} from '$lib/server/mcp-entitlements';
import { resolveCanonicalAgencyIdentity } from '$lib/server/agency-identity';

interface PasswordUserResponse {
	user: {
		id: string;
		email: string;
		email_verified: boolean;
		name: string | null;
		tier: 'free' | 'pro' | 'agency';
		source: 'workway' | 'templates' | 'io' | 'space' | 'lms';
		deleted_at?: string | null;
	} | null;
	has_password: boolean;
}

interface PasswordUpsertResponse extends PasswordUserResponse {}

interface PasswordBody {
	password?: string;
}

function buildContextPayload(row: AgencyMcpEntitlementRow | null, payload: PasswordUserResponse) {
	return {
		email: payload.user?.email ?? row?.auth_email ?? null,
		auth_subject: row?.auth_subject ?? payload.user?.id ?? null,
		account_id: row?.account_id ?? null,
		tenant_id: row?.tenant_id ?? null,
		has_password: payload.has_password,
		email_verified: payload.user?.email_verified ?? false,
		identity_user_exists: Boolean(payload.user),
		entitlement: evaluateAgencyMcpEntitlement(row),
	};
}

async function resolveEntitledContext(platform: App.Platform | undefined, authSubject: string, authEmail: string) {
	const db = platform?.env?.DB;
	if (!db) return null;

	const row = await reconcileAgencyMcpEntitlement(db, {
		authSubject,
		authEmail,
		accountId: resolveCanonicalAgencyIdentity({ id: authSubject, email: authEmail }).accountId,
		tenantId: resolveCanonicalAgencyIdentity({ id: authSubject, email: authEmail }).tenantId,
		serviceTier: 'mcp_only',
	});

	if (!row) return null;

	const canonicalIdentity = resolveCanonicalAgencyIdentity({ id: authSubject, email: authEmail }, row);
	if (
		row.account_id === canonicalIdentity.accountId &&
		row.tenant_id === canonicalIdentity.tenantId &&
		(row.workspace_account_id ?? canonicalIdentity.workspaceAccountId) === canonicalIdentity.workspaceAccountId
	) {
		return row;
	}

	return (
		(await updateAgencyMcpEntitlement(db, {
			authSubject,
			authEmail,
			accountId: canonicalIdentity.accountId,
			tenantId: canonicalIdentity.tenantId,
			workspaceAccountId: canonicalIdentity.workspaceAccountId,
			serviceTier: row.service_tier,
			metadata: {
				canonical_identity_applied: true,
				canonical_identity_source: 'agency_identity_overrides',
			},
		})) ?? row
	);
}

export const GET: RequestHandler = async ({ cookies, platform }) => {
	try {
		const env = platform?.env;
		if (!env) {
			return json({ error: 'unavailable', message: 'Platform env is unavailable' }, { status: 503 });
		}

		const user = await requireAgencySessionUser({ cookies, platform });
		const row = await resolveEntitledContext(platform, user.id, user.email);
		const payload = await postIdentityAdmin<PasswordUserResponse>(env, '/v1/auth/password/admin-get', {
			email: user.email,
		});

		return json(buildContextPayload(row, payload));
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

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		const env = platform?.env;
		if (!env) {
			return json({ error: 'unavailable', message: 'Platform env is unavailable' }, { status: 503 });
		}

		const user = await requireAgencySessionUser({ cookies, platform });
		const row = await resolveEntitledContext(platform, user.id, user.email);
		const decision = evaluateAgencyMcpEntitlement(row);
		if (!decision.allowed) {
			return json(
				{
					error: 'entitlement_denied',
					message: decision.reason,
					entitlement: decision,
				},
				{ status: 403 },
			);
		}

		const body = (await request.json().catch(() => null)) as PasswordBody | null;
		const password = body?.password?.trim() ?? '';
		if (password.length < 12) {
			return json(
				{ error: 'weak_password', message: 'Password must be at least 12 characters' },
				{ status: 400 },
			);
		}

		const payload = await postIdentityAdmin<PasswordUpsertResponse>(env, '/v1/auth/password/admin-upsert', {
			email: user.email,
			password,
			user_id: row?.auth_subject ?? undefined,
			tier: 'agency',
			email_verified: true,
		});

		return json({
			...buildContextPayload(row, payload),
			message: 'MCP OAuth password updated.',
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
