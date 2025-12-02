<script lang="ts">
	import type { PageData } from './$types';
	import { PapersGrid } from '@create-something/components';

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
	<title>All Experiments ({papers.length}) | CREATE SOMETHING</title>
	<meta
		name="description"
		content="Browse tracked experiments with real data — time, costs, errors, and learnings from building production systems with AI-native development."
	/>
</svelte:head>

<!-- Hero Section -->
<section class="relative pt-16 pb-12 px-6">
	<div class="max-w-7xl mx-auto">
		<div class="text-center space-y-4">
			<h1 class="text-4xl md:text-6xl font-bold text-white">All Experiments</h1>
			<p class="text-lg text-white/60">
				{#if isFiltered}
					{resultCount} of {papers.length} experiments
				{:else}
					{papers.length} tracked experiments with real data — time, costs, errors, and learnings
				{/if}
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
						class="w-full px-4 py-3 pl-10 bg-white/5 border border-white/10 rounded-lg
							   text-white placeholder-white/40 focus:outline-none focus:border-white/30
							   transition-colors"
					/>
					<svg
						class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
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
							class="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					{/if}
				</div>
			</div>

			<!-- Master Filter Chips (Hermeneutic filtering) -->
			<div class="flex justify-center">
				<div class="flex flex-wrap justify-center gap-2">
					<button
						onclick={() => masterFilter = 'all'}
						class="px-3 py-1.5 text-sm rounded-full transition-all {masterFilter === 'all'
							? 'bg-white text-black'
							: 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'}"
					>
						All
					</button>
					<button
						onclick={() => masterFilter = 'rams'}
						class="px-3 py-1.5 text-sm rounded-full transition-all {masterFilter === 'rams'
							? 'bg-white text-black'
							: 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'}"
					>
						Rams
					</button>
					<button
						onclick={() => masterFilter = 'heidegger'}
						class="px-3 py-1.5 text-sm rounded-full transition-all {masterFilter === 'heidegger'
							? 'bg-white text-black'
							: 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'}"
					>
						Heidegger
					</button>
					<button
						onclick={() => masterFilter = 'tufte'}
						class="px-3 py-1.5 text-sm rounded-full transition-all {masterFilter === 'tufte'
							? 'bg-white text-black'
							: 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'}"
					>
						Tufte
					</button>
					<button
						onclick={() => masterFilter = 'canon'}
						class="px-3 py-1.5 text-sm rounded-full transition-all {masterFilter === 'canon'
							? 'bg-white text-black'
							: 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-white/10'}"
					>
						Canon
					</button>
				</div>
			</div>

			<!-- Sort Control -->
			<div class="flex justify-center">
				<div class="inline-flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-lg">
					<button
						onclick={() => sortBy = 'newest'}
						class="px-4 py-2 text-sm font-medium rounded-md transition-all {sortBy === 'newest'
							? 'bg-white text-black'
							: 'text-white/70 hover:text-white hover:bg-white/10'}"
					>
						Newest
					</button>
					<button
						onclick={() => sortBy = 'oldest'}
						class="px-4 py-2 text-sm font-medium rounded-md transition-all {sortBy === 'oldest'
							? 'bg-white text-black'
							: 'text-white/70 hover:text-white hover:bg-white/10'}"
					>
						Oldest
					</button>
					<button
						onclick={() => sortBy = 'featured'}
						class="px-4 py-2 text-sm font-medium rounded-md transition-all {sortBy === 'featured'
							? 'bg-white text-black'
							: 'text-white/70 hover:text-white hover:bg-white/10'}"
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
		<p class="text-white/60 text-lg">No experiments match your search.</p>
		<button
			onclick={() => { searchQuery = ''; masterFilter = 'all'; }}
			class="mt-4 px-4 py-2 text-sm text-white/70 hover:text-white border border-white/20 rounded-lg hover:bg-white/5 transition-all"
		>
			Clear filters
		</button>
	</div>
{/if}

<!-- Footer -->
