import type { PageServerLoad } from './$types';
import { getServiceBySlug } from '$lib/data/services';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const service = getServiceBySlug(params.slug);

	if (!service) {
		throw error(404, 'Service not found');
	}

	return { service };
};
