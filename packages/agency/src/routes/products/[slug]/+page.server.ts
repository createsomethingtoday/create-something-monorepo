import type { PageServerLoad } from './$types';
import { getOfferingBySlug } from '$lib/data/services';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const product = getOfferingBySlug(params.slug);

	// Only allow products (accessible tier), not consulting services
	if (!product || !product.isProductized) {
		throw error(404, 'Product not found');
	}

	return { product };
};
