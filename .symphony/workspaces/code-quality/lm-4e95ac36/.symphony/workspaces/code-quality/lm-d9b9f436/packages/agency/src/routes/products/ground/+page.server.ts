import { products } from '$lib/data/services';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const product = products.find((p) => p.id === 'ground');

	if (!product) {
		throw error(404, 'Product not found');
	}

	return { product };
};
