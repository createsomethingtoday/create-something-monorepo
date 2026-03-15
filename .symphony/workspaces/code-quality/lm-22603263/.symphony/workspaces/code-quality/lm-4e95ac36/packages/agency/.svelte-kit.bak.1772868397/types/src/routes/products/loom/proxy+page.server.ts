// @ts-nocheck
import { products } from '$lib/data/services';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = async () => {
	const product = products.find((p) => p.id === 'loom');

	if (!product) {
		throw error(404, 'Product not found');
	}

	return { product };
};
;null as any as PageServerLoad;