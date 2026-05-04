import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listAgencyContractState, upsertAgencyContractState } from '$lib/server/mcp-entitlements';
import { requireAgencyOperator } from '$lib/server/operator-auth';

interface ContractBody {
	auth_subject?: string | null;
	auth_email?: string | null;
	account_id?: string | null;
	tenant_id?: string | null;
	contract_reference?: string;
	contract_status?: 'draft' | 'pending' | 'active' | 'paused' | 'expired' | 'terminated';
	service_tier?: string | null;
	monthly_recurring_revenue_cents?: number | null;
	gross_margin_floor_percent?: number | null;
	owner_compensation_fit?: string | null;
	contract_active?: boolean;
	service_entitled?: boolean;
	policy_accepted?: boolean;
	effective_at?: string | null;
	expires_at?: string | null;
	operator_load_budget?: Record<string, unknown> | null;
	expansion_triggers?: string[] | null;
	metadata?: Record<string, unknown>;
}

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
	try {
		await requireAgencyOperator({ cookies, platform });
		const db = platform?.env?.DB;
		if (!db) {
			return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
		}

		const contracts = await listAgencyContractState(db, {
			limit: Number.parseInt(url.searchParams.get('limit') ?? '100', 10),
			search: url.searchParams.get('search') ?? undefined,
		});
		return json({ contracts });
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

		const body = (await request.json().catch(() => null)) as ContractBody | null;
		if (!body?.contract_reference?.trim() || !body.contract_status) {
			return json({ error: 'invalid_request', message: 'contract_reference and contract_status are required' }, { status: 400 });
		}

		await upsertAgencyContractState(db, {
			authSubject: body.auth_subject?.trim() || null,
			authEmail: body.auth_email?.trim() || null,
			accountId: body.account_id?.trim() || null,
			tenantId: body.tenant_id?.trim() || null,
			contractReference: body.contract_reference.trim(),
			contractStatus: body.contract_status,
			serviceTier: body.service_tier?.trim() || null,
			monthlyRecurringRevenueCents: sanitizeNumber(body.monthly_recurring_revenue_cents),
			grossMarginFloorPercent: sanitizeNumber(body.gross_margin_floor_percent),
			ownerCompensationFit: body.owner_compensation_fit?.trim() || null,
			contractActive: Boolean(body.contract_active),
			serviceEntitled: Boolean(body.service_entitled),
			policyAccepted: Boolean(body.policy_accepted),
			effectiveAt: body.effective_at?.trim() || null,
			expiresAt: body.expires_at?.trim() || null,
			operatorLoadBudget: body.operator_load_budget ?? null,
			expansionTriggers: Array.isArray(body.expansion_triggers) ? body.expansion_triggers : null,
			metadata: {
				operator_email: operator.email,
				updated_via: 'agency_contract_api',
				...(body.metadata ?? {}),
			},
		});

		return json({ success: true });
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

function sanitizeNumber(value: number | null | undefined): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null;
}
