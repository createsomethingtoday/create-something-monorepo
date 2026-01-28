<script lang="ts">
	import type { PageData } from './$types';
	import { PapersGrid, SEO } from '@create-something/canon';

	let { data }: { data: PageData } = $props();
	const { papers } = data;

	// Search state
	let searchQuery = $state('');

	// Master filter state (filter by design methodology)
	type MasterFilter = 'all' | 'rams' | 'heidegger' | 'tufte' | 'canon';
	let masterFilter: MasterFilter = $state('all');

	// Sort state
	type SortOption = 'newest' | 'oldest' | 'featured';
	let sortBy: SortOption = $state('newest');

	// Master filter definitions - maps principle prefixes to masters
	const masterPrefixes: Record<Exclude<MasterFilter, 'all'>, string[]> = {
		rams: ['rams-principle'],
		heidegger: ['heidegger-'],
		tufte: ['tufte-'],
		canon: ['subtractive-triad', 'hermeneutic-workflow', 'being-modes']
	};

	// Check if an experiment matches the current master filter
	function matchesMasterFilter(experiment: typeof papers[0]): boolean {
		if (masterFilter === 'all') return true;

		const principles = experiment.tests_principles || [];
		const prefixes = masterPrefixes[masterFilter];

		return principles.some(p =>
			prefixes.some(prefix => p.startsWith(prefix))
		);
	}

	// Check if an experiment matches the search query
	function matchesSearch(experiment: typeof papers[0]): boolean {
		if (!searchQuery.trim()) return true;

		const query = searchQuery.toLowerCase();
		const title = (experiment.title || '').toLowerCase();
		const description = (experiment.description || '').toLowerCase();
		const tags = Array.isArray(experiment.tags)
			? experiment.tags.map((t: string | { name: string }) =>
				typeof t === 'string' ? t.toLowerCase() : t.name.toLowerCase()
			).join(' ')
			: '';

		return title.includes(query) ||
			   description.includes(query) ||
			   tags.includes(query);
	}

	// Combined filter, search, and sort
	const filteredAndSortedPapers = $derived.by(() => {
		// First filter
		const filtered = papers.filter(p => matchesMasterFilter(p) && matchesSearch(p));

		// Then sort
		switch (sortBy) {
			case 'newest':
				return filtered.sort((a, b) => {
					const aDate = new Date(a.published_at || a.created_at || 0).getTime();
					const bDate = new Date(b.published_at || b.created_at || 0).getTime();
					return bDate - aDate;
				});
			case 'oldest':
				return filtered.sort((a, b) => {
					const aDate = new Date(a.published_at || a.created_at || 0).getTime();
					const bDate = new Date(b.published_at || b.created_at || 0).getTime();
					return aDate - bDate;
				});
			case 'featured':
				return filtered.sort((a, b) => {
					const aFeatured = a.featured ?? 0;
					const bFeatured = b.featured ?? 0;
					if (bFeatured !== aFeatured) return bFeatured - aFeatured;
					const aDate = new Date(a.published_at || a.created_at || 0).getTime();
					const bDate = new Date(b.published_at || b.created_at || 0).getTime();
					return bDate - aDate;
				});
			default:
				return filtered;
		}
	});

	// Result count for display
	const resultCount = $derived(filteredAndSortedPapers.length);
	const isFiltered = $derived(searchQuery.trim() !== '' || masterFilter !== 'all');
</script>

<SEO
	title="All Experiments"
	description="Browse tracked experiments with real data — time, costs, errors, and learnings from building production systems with AI-native development."
	keywords="experiments, AI-native development, Claude Code, tracked experiments, production systems"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Experiments', url: 'https://createsomething.io/experiments' }
	]}
/>

<!-- Hero Section -->
<section class="hero-section">
	<div class="max-w-7xl mx-auto">
		<div class="text-center space-y-4">
			<h1 class="hero-title">All Experiments</h1>
			<p class="hero-subtitle">
				{#if isFiltered}
					{resultCount} of {papers.length} experiments
				{:else}
					{papers.length} tracked experiments with real data — time, costs, errors, and learnings
				{/if}
			</p>
		</div>

		<!-- Search & Filter Controls -->
		<div class="controls-container">
			<!-- Search Input -->
			<div class="flex justify-center">
				<div class="relative w-full max-w-md">
					<label for="experiments-search" class="sr-only">Search experiments</label>
					<input
						id="experiments-search"
						type="text"
						bind:value={searchQuery}
						placeholder="Search experiments..."
						class="search-input"
					/>
					<svg
						class="search-icon"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
					{#if searchQuery}
						<button
							onclick={() => searchQuery = ''}
							class="search-clear"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					{/if}
				</div>
			</div>

			<!-- Filter by Design Methodology -->
			<div class="flex justify-center">
				<div class="flex flex-wrap justify-center gap-2">
					<button
						onclick={() => masterFilter = 'all'}
						class="filter-chip {masterFilter === 'all' ? 'active' : ''}"
					>
						All
					</button>
					<button
						onclick={() => masterFilter = 'rams'}
						class="filter-chip {masterFilter === 'rams' ? 'active' : ''}"
						title="Dieter Rams - Less, but better"
					>
						Minimalism
					</button>
					<button
						onclick={() => masterFilter = 'heidegger'}
						class="filter-chip {masterFilter === 'heidegger' ? 'active' : ''}"
						title="Tool transparency - when tools recede into use"
					>
						Tool Design
					</button>
					<button
						onclick={() => masterFilter = 'tufte'}
						class="filter-chip {masterFilter === 'tufte' ? 'active' : ''}"
						title="Edward Tufte - Data visualization"
					>
						Data Viz
					</button>
					<button
						onclick={() => masterFilter = 'canon'}
						class="filter-chip {masterFilter === 'canon' ? 'active' : ''}"
						title="CREATE SOMETHING canonical patterns"
					>
						Canon
					</button>
				</div>
			</div>

			<!-- Sort Control -->
			<div class="flex justify-center">
				<div class="sort-control">
					<button
						onclick={() => sortBy = 'newest'}
						class="sort-button {sortBy === 'newest' ? 'active' : ''}"
					>
						Newest
					</button>
					<button
						onclick={() => sortBy = 'oldest'}
						class="sort-button {sortBy === 'oldest' ? 'active' : ''}"
					>
						Oldest
					</button>
					<button
						onclick={() => sortBy = 'featured'}
						class="sort-button {sortBy === 'featured' ? 'active' : ''}"
					>
						Featured
					</button>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Experiments Grid -->
{#if resultCount > 0}
	<PapersGrid papers={filteredAndSortedPapers} title="" subtitle="" />
{:else}
	<div class="empty-state">
		<p class="empty-message">No experiments match your search.</p>
		<button
			onclick={() => { searchQuery = ''; masterFilter = 'all'; }}
			class="clear-button"
		>
			Clear filters
		</button>
	</div>
{/if}

<style>
	/* Hero Section */
	.hero-section {
		position: relative;
		padding: var(--space-xl) var(--space-md) var(--space-lg);
	}

	.hero-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
	}

	.hero-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
	}

	/* Controls */
	.controls-container {
		margin-top: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.search-input {
		width: 100%;
		padding: var(--space-sm) var(--space-sm) var(--space-sm) 2.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-primary);
		transition: border-color var(--duration-standard) var(--ease-standard);
	}

	.search-input::placeholder {
		color: var(--color-fg-muted);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.search-icon {
		position: absolute;
		left: var(--space-sm);
		top: 50%;
		transform: translateY(-50%);
		width: 1rem;
		height: 1rem;
		color: var(--color-fg-muted);
	}

	.search-clear {
		position: absolute;
		right: var(--space-sm);
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-fg-muted);
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.search-clear:hover {
		color: var(--color-fg-secondary);
	}

	/* Filter Chips */
	.filter-chip {
		padding: 0.375rem var(--space-sm);
		font-size: var(--text-body-sm);
		border-radius: var(--radius-full);
		transition: all var(--duration-standard) var(--ease-standard);
		background: var(--color-bg-surface);
		color: var(--color-fg-tertiary);
		border: 1px solid var(--color-border-default);
	}

	.filter-chip:hover {
		color: var(--color-fg-primary);
		background: var(--color-hover);
	}

	.filter-chip.active {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-color: var(--color-fg-primary);
	}

	/* Sort Control */
	.sort-control {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.sort-button {
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		border-radius: var(--radius-sm);
		transition: all var(--duration-standard) var(--ease-standard);
		color: var(--color-fg-secondary);
	}

	.sort-button:hover {
		color: var(--color-fg-primary);
		background: var(--color-hover);
	}

	.sort-button.active {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	/* Empty State */
	.empty-state {
		text-align: center;
		padding: var(--space-2xl) var(--space-md);
	}

	.empty-message {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-lg);
		margin-bottom: var(--space-md);
	}

	.clear-button {
		margin-top: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-md);
		background: transparent;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.clear-button:hover {
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
	}

	/* Screen reader only - visually hidden but accessible */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>

<!-- Footer -->
