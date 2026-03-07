import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listAgencyIdentitySeeds, upsertAgencyIdentitySeed } from '$lib/server/mcp-entitlements';
import { requireAgencyOperator } from '$lib/server/operator-auth';

interface UpsertBody {
	auth_email?: string;
	auth_subject?: string | null;
	account_id?: string;
	tenant_id?: string;
	workspace_account_id?: string | null;
	service_tier?: string | null;
	managed_bearer_allowed?: boolean;
	org_membership_active?: boolean;
	service_entitled?: boolean;
	policy_accepted?: boolean;
	contract_active?: boolean;
	billing_active?: boolean;
	status?: string;
	invited_at?: string | null;
	bound_at?: string | null;
	metadata?: Record<string, unknown>;
}

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
	try {
		await requireAgencyOperator({ cookies, platform });
		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const seeds = await listAgencyIdentitySeeds(db, {
			limit: Number.parseInt(url.searchParams.get('limit') ?? '100', 10),
			search: url.searchParams.get('search') ?? undefined,
		});

		return json({ seeds });
	} catch (error) {
		return handleError(error);
	}
};

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
	try {
		const operator = await requireAgencyOperator({ cookies, platform });
		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const body = (await request.json().catch(() => null)) as UpsertBody | null;
		if (!body?.auth_email?.trim() || !body.account_id?.trim() || !body.tenant_id?.trim()) {
			return json(
				{ error: 'invalid_request', message: 'auth_email, account_id, and tenant_id are required' },
				{ status: 400 }
			);
		}

		const seed = await upsertAgencyIdentitySeed(db, {
			authEmail: body.auth_email,
			authSubject: body.auth_subject,
			accountId: body.account_id,
			tenantId: body.tenant_id,
			workspaceAccountId: body.workspace_account_id ?? body.account_id,
			serviceTier: body.service_tier ?? 'agency',
			managedBearerAllowed: body.managed_bearer_allowed,
			orgMembershipActive: body.org_membership_active,
			serviceEntitled: body.service_entitled,
			policyAccepted: body.policy_accepted,
			contractActive: body.contract_active,
			billingActive: body.billing_active,
			status: body.status ?? 'seeded',
			invitedAt: body.invited_at ?? null,
			boundAt: body.bound_at ?? null,
			metadata: {
				operator_email: operator.email,
				updated_via: 'agency_identity_seed_admin_api',
				...(body.metadata ?? {}),
			},
		});

		if (!seed) {
			return json({ error: 'unavailable', message: 'Identity seed store is unavailable' }, { status: 503 });
		}

		return json({ seed });
	} catch (error) {
		return handleError(error);
	}
};

function handleError(error: unknown) {
	if (error && typeof error === 'object' && 'status' in error && 'body' in error) {
		const kitError = error as { status: number; body?: { message?: string } };
		return json({ error: 'request_failed', message: kitError.body?.message ?? 'Request failed' }, { status: kitError.status });
	}
	return json(
		{ error: 'internal_error', message: error instanceof Error ? error.message : 'Unexpected error' },
		{ status: 500 }
	);
}
