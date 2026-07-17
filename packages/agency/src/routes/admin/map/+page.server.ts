import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireAgencyOperator } from '$lib/server/operator-auth';
import { resolveMapCommercialConfig } from '$lib/server/map-commercial';

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
	const [summary, entitlementResult] = await Promise.all([
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
		).all<EntitlementCount>()
	]);
	const commercial = resolveMapCommercialConfig(platform?.env);
	return {
		operatorEmail: operator.email,
		summary: summary ?? {
			active_maps: 0, archived_maps: 0, workspace_count: 0, version_count: 0, active_shares: 0, prepared_handoffs: 0
		},
		entitlements: entitlementResult.results,
		commercial: {
			checkoutEnabled: commercial.checkoutEnabled,
			approvalRecorded: commercial.approved,
			monthlyConfigured: Boolean(commercial.monthlyPriceId),
			yearlyConfigured: Boolean(commercial.yearlyPriceId)
		}
	};
};
