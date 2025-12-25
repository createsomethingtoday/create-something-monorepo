import type { PageServerLoad } from './$types';
import { getOfferingBySlug } from '$lib/data/services';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	// Search both products (accessible tier) and services (commercial tier)
	const service = getOfferingBySlug(params.slug);

	if (!service) {
		throw error(404, 'Offering not found');
	}

	return { service };
};
