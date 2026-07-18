import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireAgencyOperator } from '$lib/server/operator-auth';
import { resolveMapCommercialConfig } from '$lib/server/map-commercial';
import {
	createCustomerMapHandoffOperator,
	createD1CustomerMapRepository,
	CustomerMapAccessError,
	CustomerMapConflictError,
	CustomerMapValidationError
} from '$lib/server/customer-map-workspace';

interface MapOperatorSummary {
	active_maps: number;
	archived_maps: number;
	workspace_count: number;
	version_count: number;
	active_shares: number;
	prepared_handoffs: number;
}

interface EntitlementCount { entitlement_status: string; count: number }

export const load: PageServerLoad = async ({ cookies, platform }) => {
	const operator = await requireAgencyOperator({ cookies, platform });
	const db = platform?.env?.DB;
	if (!db) throw error(503, 'Map operator database is unavailable');
	const handoffOperator = createCustomerMapHandoffOperator({ repository: createD1CustomerMapRepository(db) });
	const [summary, entitlementResult, preparedHandoffs] = await Promise.all([
		db.prepare(
			`SELECT
			   COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) AS active_maps,
			   COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) AS archived_maps,
			   COUNT(DISTINCT account_id || ':' || workspace_account_id) AS workspace_count,
			   (SELECT COUNT(*) FROM customer_map_versions) AS version_count,
			   (SELECT COUNT(*) FROM customer_map_shares WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > datetime('now'))) AS active_shares,
			   (SELECT COUNT(*) FROM customer_map_handoffs WHERE status = 'prepared') AS prepared_handoffs
			 FROM customer_maps`
		).first<MapOperatorSummary>(),
		db.prepare(
			`SELECT entitlement_status, COUNT(*) AS count
			 FROM agency_map_entitlements GROUP BY entitlement_status ORDER BY entitlement_status`
		).all<EntitlementCount>(),
		handoffOperator.listPrepared()
	]);
	const commercial = resolveMapCommercialConfig(platform?.env);
	return {
		operatorEmail: operator.email,
		summary: summary ?? {
			active_maps: 0, archived_maps: 0, workspace_count: 0, version_count: 0, active_shares: 0, prepared_handoffs: 0
		},
		entitlements: entitlementResult.results,
		preparedHandoffs,
		commercial: {
			checkoutEnabled: commercial.checkoutEnabled,
			approvalRecorded: commercial.approved,
			monthlyConfigured: Boolean(commercial.monthlyPriceId),
			yearlyConfigured: Boolean(commercial.yearlyPriceId)
		}
	};
};

export const actions: Actions = {
	acceptHandoff: async ({ cookies, platform, request }) => {
		const operator = await requireAgencyOperator({ cookies, platform });
		const db = platform?.env?.DB;
		if (!db) return fail(503, { message: 'Map operator database is unavailable' });
		const data = await request.formData();
		const handoffId = String(data.get('handoff_id') ?? '').trim();
		if (!handoffId) return fail(400, { message: 'Handoff ID is required' });
		try {
			const handoff = await createCustomerMapHandoffOperator({
				repository: createD1CustomerMapRepository(db)
			}).acceptBuildHandoff(operator.id, handoffId, { note: String(data.get('note') ?? '') });
			return { success: true, message: `Accepted Build handoff for Map version ${handoff.mapVersion}.` };
		} catch (cause) {
			if (cause instanceof CustomerMapAccessError) return fail(404, { message: cause.message });
			if (cause instanceof CustomerMapConflictError) return fail(409, { message: cause.message });
			if (cause instanceof CustomerMapValidationError) return fail(400, { message: cause.message });
			throw cause;
		}
	}
};
