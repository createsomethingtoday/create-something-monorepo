<script lang="ts">
	import type { PageData } from './$types';
	import PapersGrid from '$lib/components/PapersGrid.svelte';

	let { data }: { data: PageData } = $props();
	const { papers } = data;

	// Search state
	let searchQuery = $state('');

	// Master filter state (hermeneutic filtering by philosophical lineage)
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

<svelte:head>
	<title>All Experiments ({papers.length}) | CREATE SOMETHING SPACE</title>
	<meta
		name="description"
		content="Browse community experiments from the playground. Fork them, try them, break them, learn from them."
	/>
</svelte:head>

<!-- Hero Section -->
<section class="relative pt-32 pb-12 px-6">
	<div class="max-w-7xl mx-auto">
		<div class="text-center space-y-4">
			<h1 class="hero-title">All Experiments</h1>
			<p class="hero-subtitle">
				{#if isFiltered}
					{resultCount} of {papers.length} experiments
				{:else}
					<strong>Pick one and try it.</strong> {papers.length} experiments ready to fork, modify, or learn from.
				{/if}
			</p>
			<p class="hero-hint">
				Each experiment documents what worked, what didn't, and why. Start with whatever matches your current project.
			</p>
		</div>

		<!-- Search & Filter Controls -->
		<div class="mt-8 space-y-4">
			<!-- Search Input -->
			<div class="flex justify-center">
				<div class="relative w-full max-w-md">
					<input
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
							aria-label="Clear search"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					{/if}
				</div>
			</div>

			<!-- Master Filter Chips (Hermeneutic filtering) -->
			<div class="flex flex-col items-center gap-2">
				<p class="filter-hint">Filter by design principle:</p>
				<div class="flex flex-wrap justify-center gap-2">
					<button
						onclick={() => masterFilter = 'all'}
						class="filter-chip {masterFilter === 'all' ? 'filter-chip-active' : ''}"
					>
						All
					</button>
					<button
						onclick={() => masterFilter = 'rams'}
						class="filter-chip {masterFilter === 'rams' ? 'filter-chip-active' : ''}"
						title="Dieter Rams' 10 principles of good design"
					>
						Rams
					</button>
					<button
						onclick={() => masterFilter = 'heidegger'}
						class="filter-chip {masterFilter === 'heidegger' ? 'filter-chip-active' : ''}"
						title="Heidegger's tool philosophy—when tools recede into use"
					>
						Heidegger
					</button>
					<button
						onclick={() => masterFilter = 'tufte'}
						class="filter-chip {masterFilter === 'tufte' ? 'filter-chip-active' : ''}"
						title="Tufte's data visualization principles"
					>
						Tufte
					</button>
					<button
						onclick={() => masterFilter = 'canon'}
						class="filter-chip {masterFilter === 'canon' ? 'filter-chip-active' : ''}"
						title="CREATE SOMETHING Canon patterns"
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
						class="sort-button {sortBy === 'newest' ? 'sort-button-active' : ''}"
					>
						Newest
					</button>
					<button
						onclick={() => sortBy = 'oldest'}
						class="sort-button {sortBy === 'oldest' ? 'sort-button-active' : ''}"
					>
						Oldest
					</button>
					<button
						onclick={() => sortBy = 'featured'}
						class="sort-button {sortBy === 'featured' ? 'sort-button-active' : ''}"
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
	<div class="text-center py-16 px-6">
		<p class="empty-message">No experiments match your search. Try a different filter or search term.</p>
		<button
			onclick={() => { searchQuery = ''; masterFilter = 'all'; }}
			class="clear-button"
		>
			Show all experiments
		</button>
	</div>
{/if}

<style>
	.hero-title {
		font-size: clamp(2.5rem, 5vw, 3.5rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		text-align: center;
	}

	.hero-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		text-align: center;
	}

	.hero-hint {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
		text-align: center;
		max-width: 40rem;
		margin: 0 auto;
	}

	.filter-hint {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 2.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		color: var(--color-fg-primary);
		font-size: var(--text-body);
		transition: border-color var(--duration-micro) var(--ease-standard);
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
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1rem;
		height: 1rem;
		color: var(--color-fg-muted);
	}

	.search-clear {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-fg-muted);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.search-clear:hover {
		color: var(--color-fg-tertiary);
	}

	.filter-chip {
		padding: 0.375rem 0.75rem;
		font-size: var(--text-body-sm);
		border-radius: var(--radius-full);
		background: var(--color-bg-surface);
		color: var(--color-fg-muted);
		border: 1px solid var(--color-border-default);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.filter-chip:hover {
		color: var(--color-fg-primary);
		background: var(--color-hover);
	}

	.filter-chip-active {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-color: var(--color-fg-primary);
	}

	.sort-control {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.sort-button {
		padding: 0.5rem 1rem;
		font-size: var(--text-body-sm);
		font-weight: 500;
		border-radius: var(--radius-md);
		color: var(--color-fg-tertiary);
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.sort-button:hover {
		color: var(--color-fg-primary);
		background: var(--color-hover);
	}

	.sort-button-active {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.empty-message {
		font-size: var(--text-body-lg);
		color: var(--color-fg-muted);
	}

	.clear-button {
		margin-top: var(--space-sm);
		padding: 0.5rem 1rem;
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-lg);
		background: transparent;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.clear-button:hover {
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
	}
</style>

