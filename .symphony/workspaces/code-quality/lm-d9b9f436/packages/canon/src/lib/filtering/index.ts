/**
 * Filtering Component Library
 *
 * Reusable components for AI-native product filtering.
 * Components are headless - they handle UI state but not filtering logic.
 *
 * @example
 * import {
 *   FilterTogglePanel,
 *   ProductGrid,
 *   AgentPanel,
 *   type FilterableProduct,
 *   type FilterState
 * } from '@create-something/canon/filtering';
 */

// Components
export { default as FilterTogglePanel } from './FilterTogglePanel.svelte';
export { default as ProductGrid } from './ProductGrid.svelte';
export { default as AgentPanel } from './AgentPanel.svelte';

// Types
export type {
	FilterableProduct,
	FilterState,
	FilterConfig,
	AgentStep,
	FilterResult
} from './types.js';

// Constants
export { DEFAULT_FILTER_CONFIG, MATERIAL_GROUPS } from './types.js';

// Utility: Apply filters to products (client-side)
import type { FilterableProduct, FilterState } from './types.js';
import { MATERIAL_GROUPS } from './types.js';

export function applyFilters(
	products: FilterableProduct[],
	state: FilterState
): FilterableProduct[] {
	let filtered = [...products];

	// Filter by materials
	if (state.materials && state.materials.length > 0) {
		const normalizedMaterials = state.materials.map((m) => m.toLowerCase());
		filtered = filtered.filter((p) =>
			p.materials.some((m) => normalizedMaterials.some((nm) => m.toLowerCase().includes(nm)))
		);
	}

	// Filter by categories
	if (state.categories && state.categories.length > 0) {
		filtered = filtered.filter((p) => state.categories!.includes(p.category));
	}

	// Filter by price
	if (state.priceMin !== undefined) {
		filtered = filtered.filter((p) => p.price >= state.priceMin!);
	}
	if (state.priceMax !== undefined) {
		filtered = filtered.filter((p) => p.price <= state.priceMax!);
	}

	// Filter by status
	if (state.statuses && state.statuses.length > 0) {
		filtered = filtered.filter((p) => state.statuses!.includes(p.status));
	}

	// Search by name
	if (state.searchQuery) {
		const query = state.searchQuery.toLowerCase();
		filtered = filtered.filter((p) => p.name.toLowerCase().includes(query));
	}

	// Sort
	if (state.sortBy) {
		filtered.sort((a, b) => {
			let comparison = 0;
			if (state.sortBy === 'price') {
				comparison = a.price - b.price;
			} else if (state.sortBy === 'name') {
				comparison = a.name.localeCompare(b.name);
			}
			return state.sortOrder === 'desc' ? -comparison : comparison;
		});
	}

	return filtered;
}
