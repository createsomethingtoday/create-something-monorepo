import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	buildAgencyEntitlementSnapshot,
	constantTimeEqual,
	evaluateAgencyMcpEntitlement,
	findAgencyMcpEntitlementByAuthSubject,
	reconcileAgencyMcpEntitlement,
} from '$lib/server/mcp-entitlements';

interface EntitlementCheckBody {
	auth_subject?: string;
	account_id?: string;
	tenant_id?: string;
}

export const POST: RequestHandler = async ({ request, platform }) => {
	const env = platform?.env;
	if (!env?.DB) {
		return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
	}

	const expectedKey = env.AGENCY_INTERNAL_API_KEY?.trim();
	if (!expectedKey) {
		return json({ error: 'not_configured', message: 'AGENCY_INTERNAL_API_KEY is not configured' }, { status: 503 });
	}

	const providedKey =
		request.headers.get('X-API-Key')?.trim() ??
		request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ??
		null;
	if (!providedKey || !constantTimeEqual(expectedKey, providedKey)) {
		return json({ error: 'unauthorized', message: 'Missing or invalid internal credential' }, { status: 401 });
	}

	const body = (await request.json().catch(() => null)) as EntitlementCheckBody | null;
	const authSubject = body?.auth_subject?.trim();
	if (!authSubject) {
		return json({ error: 'invalid_request', message: 'auth_subject is required' }, { status: 400 });
	}

	const row =
		(await reconcileAgencyMcpEntitlement(env.DB, {
			authSubject,
			accountId: body?.account_id?.trim() || null,
			tenantId: body?.tenant_id?.trim() || null,
		})) ?? (await findAgencyMcpEntitlementByAuthSubject(env.DB, authSubject));
	const decision = evaluateAgencyMcpEntitlement(row, {
		accountId: body?.account_id?.trim() || null,
		tenantId: body?.tenant_id?.trim() || null,
	});
	const snapshot = buildAgencyEntitlementSnapshot(row, decision);

	return json({
		...decision,
		service_tier: snapshot.service_tier,
		entitlement_snapshot: snapshot,
	});
};
