/**
 * AI-Native Filtering Experiment - Server Load
 *
 * Loads all products from D1 for initial SSR render.
 */

import type { ServerLoadEvent } from '@sveltejs/kit';
import { parseProductFromDB, type Product } from '$lib/agents/filter-agent';
import { getFileBasedExperiment } from '$lib/config/fileBasedExperiments';

export const load = async ({ platform }: ServerLoadEvent) => {
	let products: Product[] = [];
	let error: string | null = null;
	const experiment = getFileBasedExperiment('ai-native-filtering');

	if (!platform?.env?.DB) {
		error = 'Database not available. Ensure D1 is configured.';
	} else {
		try {
			const result = await platform.env.DB.prepare('SELECT * FROM fnji_products ORDER BY name').all();
			products = (result.results || []).map((row: Record<string, unknown>) =>
				parseProductFromDB(row)
			);
		} catch (dbError) {
			console.error('Database error:', dbError);
			error = 'Failed to load products. Run migration and seed first.';
		}
	}

	// Compute summary stats for the UI
	const stats = {
		total: products.length,
		categories: {
			seating: products.filter((p) => p.category === 'seating').length,
			tables: products.filter((p) => p.category === 'tables').length,
			storage: products.filter((p) => p.category === 'storage').length,
			lighting: products.filter((p) => p.category === 'lighting').length
		},
		priceRange: products.length
			? {
					min: Math.min(...products.map((p) => p.price)) / 100,
					max: Math.max(...products.map((p) => p.price)) / 100
				}
			: { min: 0, max: 0 },
		inStock: products.filter((p) => p.status === 'in_stock').length,
		preOrder: products.filter((p) => p.status === 'pre_order').length
	};

	return {
		experiment,
		products,
		stats,
		error
	};
};
