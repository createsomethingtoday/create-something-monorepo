/**
 * Category Filter Store
 *
 * Syncs category selection between HeroSection pills and ContentCategories
 */

type CategoryFilter =
	| 'all'
	| 'series'
	| 'films'
	| 'bts'
	| 'trailers'
	| 'free';

interface CategoryFilterState {
	active: CategoryFilter;
}

// Map filter IDs to actual database categories
export const FILTER_TO_CATEGORIES: Record<CategoryFilter, string[] | null> = {
	all: null, // Show all
	series: ['crew-call', 'reconnecting-relationships', 'kodiak', 'lincoln-manufacturing', 'guns-out-tv'],
	films: ['films'],
	bts: ['crew-call'], // Behind the scenes content is in Crew Call
	trailers: ['coming-soon'],
	free: null // Filter by tier, not category
};

// Human-readable labels
export const FILTER_LABELS: Record<CategoryFilter, string> = {
	all: 'All Content',
	series: 'Series',
	films: 'Films',
	bts: 'Behind the Scenes',
	trailers: 'Trailers',
	free: 'Free to Watch'
};

function createCategoryFilterStore() {
	let state = $state<CategoryFilterState>({ active: 'all' });

	return {
		get active() {
			return state.active;
		},
		set(filter: CategoryFilter) {
			state.active = filter;
		},
		reset() {
			state.active = 'all';
		}
	};
}

export const categoryFilter = createCategoryFilterStore();
export type { CategoryFilter };
