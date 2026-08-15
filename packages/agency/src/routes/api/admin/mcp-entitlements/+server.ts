import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	evaluateAgencyMcpEntitlement,
	listAgencyMcpEntitlements,
	updateAgencyMcpEntitlement,
} from '$lib/server/mcp-entitlements';
import { requireAgencyOperator } from '$lib/server/operator-auth';

interface UpdateBody {
	auth_subject?: string;
	auth_email?: string | null;
	account_id?: string | null;
	tenant_id?: string | null;
	workspace_account_id?: string | null;
	service_tier?: string | null;
	managed_bearer_allowed?: boolean;
	org_membership_active?: boolean;
	service_entitled?: boolean;
	policy_accepted?: boolean;
	contract_active?: boolean;
	billing_active?: boolean;
	denial_reason?: string | null;
	metadata?: Record<string, unknown>;
}

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
	try {
		await requireAgencyOperator({ cookies, platform });
		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const rows = await listAgencyMcpEntitlements(db, {
			limit: Number.parseInt(url.searchParams.get('limit') ?? '100', 10),
			search: url.searchParams.get('search') ?? undefined,
		});

		return json({
			entitlements: rows.map((row) => ({
				...row,
				decision: evaluateAgencyMcpEntitlement(row),
			})),
		});
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

		const body = (await request.json().catch(() => null)) as UpdateBody | null;
		const authSubject = body?.auth_subject?.trim();
		if (!authSubject) {
			return json({ error: 'invalid_request', message: 'auth_subject is required' }, { status: 400 });
		}

		const updated = await updateAgencyMcpEntitlement(db, {
			authSubject,
			authEmail: body?.auth_email ?? undefined,
			accountId: body?.account_id ?? undefined,
			tenantId: body?.tenant_id ?? undefined,
			workspaceAccountId: body?.workspace_account_id ?? undefined,
			serviceTier: body?.service_tier ?? undefined,
			managedBearerAllowed: body?.managed_bearer_allowed,
			orgMembershipActive: body?.org_membership_active,
			serviceEntitled: body?.service_entitled,
			policyAccepted: body?.policy_accepted,
			contractActive: body?.contract_active,
			billingActive: body?.billing_active,
			denialReason: body?.denial_reason,
			manualOverride: true,
			metadata: {
				operator_email: operator.email,
				updated_via: 'agency_admin_api',
				...(body?.metadata ?? {}),
			},
		});
		if (!updated) {
			return json({ error: 'not_found', message: 'Entitlement record not found' }, { status: 404 });
		}

		return json({
			entitlement: {
				...updated,
				decision: evaluateAgencyMcpEntitlement(updated),
			},
		});
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
