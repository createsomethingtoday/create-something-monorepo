import type { PageServerLoad } from './$types';
import { getSourcesForTenant } from '$lib/db/queries';

export const load: PageServerLoad = async ({ platform, locals }) => {
	if (!platform?.env?.DB || !locals.tenant) {
		// Dental demo sources for dev mode
		return {
			sources: [
				{ id: 'pms', tenantId: 'demo', type: 'pms', name: 'Open Dental', status: 'active', config: { vendor: 'open_dental' } },
				{ id: 'phone', tenantId: 'demo', type: 'phone', name: 'Weave', status: 'active', config: { vendor: 'weave' } },
				{ id: 'insurance', tenantId: 'demo', type: 'insurance', name: 'Zuub', status: 'active', config: { vendor: 'zuub' } },
				{ id: 'claims', tenantId: 'demo', type: 'claims', name: 'DentalXChange', status: 'active', config: { vendor: 'dental_xchange' } },
				{ id: 'reviews', tenantId: 'demo', type: 'reviews', name: 'Google Business', status: 'active', config: { vendor: 'google' } },
				{ id: 'accounting', tenantId: 'demo', type: 'accounting', name: 'QuickBooks', status: 'active', config: { vendor: 'quickbooks' } },
			],
		};
	}

	const sources = await getSourcesForTenant(platform.env.DB, locals.tenant.id);

	return {
		sources,
	};
};
