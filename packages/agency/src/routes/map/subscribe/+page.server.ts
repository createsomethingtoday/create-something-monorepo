import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolveCustomerMapScope } from '$lib/server/customer-map-context';
import { resolveMapCommercialConfig } from '$lib/server/map-commercial';

export const load: PageServerLoad = async ({ parent, platform }) => {
	const { user } = await parent();
	if (!user?.id || !user.email) throw redirect(303, '/login?redirect=/map/subscribe');
	await resolveCustomerMapScope({ platform, user, requireCommercialEntitlement: false });
	const config = resolveMapCommercialConfig(platform?.env);
	return {
		checkoutEnabled: config.checkoutEnabled,
		commercialApprovalRecorded: config.approved,
		monthlyConfigured: Boolean(config.monthlyPriceId),
		yearlyConfigured: Boolean(config.yearlyPriceId)
	};
};
