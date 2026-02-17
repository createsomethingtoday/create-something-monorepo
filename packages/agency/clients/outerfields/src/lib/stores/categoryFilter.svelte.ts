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
