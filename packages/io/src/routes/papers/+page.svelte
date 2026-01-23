<script lang="ts">
	/**
	 * Research Papers Index
	 *
	 * Papers document what we tested, what we found, and what it means.
	 * Each paper includes methodology, data, and conclusions you can verify.
	 */
	import { SEO } from '@create-something/components';

	let { data } = $props();
	const papers = data.papers;

	// Search state
	let searchQuery = $state('');

	// Sort state
	type SortOption = 'newest' | 'oldest' | 'reading-time';
	let sortBy: SortOption = $state('newest');

	// Category filter
	type CategoryFilter = 'all' | 'research' | 'case-study' | 'methodology';
	let categoryFilter: CategoryFilter = $state('all');

	// Pagination state
	let currentPage = $state(1);
	const itemsPerPage = 12;

	// Check if a paper matches the search query
	function matchesSearch(paper: typeof papers[0]): boolean {
		if (!searchQuery.trim()) return true;

		const query = searchQuery.toLowerCase();
		const title = (paper.title || '').toLowerCase();
		const description = (paper.description || '').toLowerCase();
		const subtitle = (paper.subtitle || '').toLowerCase();
		const keywords = paper.keywords?.map((k) => k.toLowerCase()).join(' ') || '';

		return title.includes(query) ||
			   description.includes(query) ||
			   subtitle.includes(query) ||
			   keywords.includes(query);
	}

	// Check if a paper matches the category filter
	function matchesCategory(paper: typeof papers[0]): boolean {
		if (categoryFilter === 'all') return true;
		return paper.category === categoryFilter;
	}

	// Combined filter, search, and sort
	const filteredAndSortedPapers = $derived.by(() => {
		// First filter
		const filtered = papers.filter(p => matchesSearch(p) && matchesCategory(p));

		// Then sort
		switch (sortBy) {
			case 'newest':
				return filtered.sort((a, b) => {
					const aDate = new Date(a.date || 0).getTime();
					const bDate = new Date(b.date || 0).getTime();
					return bDate - aDate;
				});
			case 'oldest':
				return filtered.sort((a, b) => {
					const aDate = new Date(a.date || 0).getTime();
					const bDate = new Date(b.date || 0).getTime();
					return aDate - bDate;
				});
			case 'reading-time':
				return filtered.sort((a, b) => {
					const aTime = a.readingTime || 0;
					const bTime = b.readingTime || 0;
					return aTime - bTime;
				});
			default:
				return filtered;
		}
	});

	// Result count for display
	const resultCount = $derived(filteredAndSortedPapers.length);
	const isFiltered = $derived(searchQuery.trim() !== '' || categoryFilter !== 'all');

	// Pagination calculations
	const totalPages = $derived(Math.ceil(filteredAndSortedPapers.length / itemsPerPage));
	const paginatedPapers = $derived.by(() => {
		const startIndex = (currentPage - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;
		return filteredAndSortedPapers.slice(startIndex, endIndex);
	});

	// Reset to page 1 when filters change
	$effect(() => {
		// Access dependencies
		searchQuery;
		categoryFilter;
		sortBy;
		// Reset page
		currentPage = 1;
	});
</script>

<SEO
	title={data.meta.title}
	description={data.meta.description}
	keywords="research papers, AI-native development, Claude Code, experiments, methodology, systems thinking"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Papers', url: 'https://createsomething.io/papers' }
	]}
/>

<!-- Hero Section -->
<section class="hero-section">
	<div class="max-w-7xl mx-auto">
		<div class="text-center space-y-4">
			<h1 class="hero-title">Research Papers</h1>
			<p class="hero-subtitle">
				{#if isFiltered}
					{resultCount} of {papers.length} papers
				{:else}
					{papers.length} papers — methodology, data, and conclusions you can verify
				{/if}
			</p>
		</div>

		<!-- Search & Filter Controls -->
		<div class="controls-container">
			<!-- Search Input -->
			<div class="flex justify-center">
				<div class="relative w-full max-w-md">
					<label for="papers-search" class="sr-only">Search papers</label>
					<input
						id="papers-search"
						type="text"
						bind:value={searchQuery}
						placeholder="Search papers..."
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

			<!-- Category Filter Chips -->
			<div class="flex justify-center">
				<div class="flex flex-wrap justify-center gap-2">
					<button
						onclick={() => categoryFilter = 'all'}
						class="filter-chip {categoryFilter === 'all' ? 'active' : ''}"
					>
						All
					</button>
					<button
						onclick={() => categoryFilter = 'research'}
						class="filter-chip {categoryFilter === 'research' ? 'active' : ''}"
					>
						Research
					</button>
					<button
						onclick={() => categoryFilter = 'case-study'}
						class="filter-chip {categoryFilter === 'case-study' ? 'active' : ''}"
					>
						Case Study
					</button>
					<button
						onclick={() => categoryFilter = 'methodology'}
						class="filter-chip {categoryFilter === 'methodology' ? 'active' : ''}"
					>
						Methodology
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
						onclick={() => sortBy = 'reading-time'}
						class="sort-button {sortBy === 'reading-time' ? 'active' : ''}"
					>
						Quick Reads
					</button>
				</div>
			</div>
		</div>
	</div>
</section>

<main class="papers-page">

	{#if resultCount > 0}
		<section class="papers-grid highlight-flex">
			{#each paginatedPapers as paper, index}
				<a href="/papers/{paper.slug}" class="paper-card highlight-item" style="--index: {index}">
					<div class="paper-content">
						<div class="paper-meta flex">
							<span class="paper-category">{paper.category}</span>
							<span class="paper-reading-time">{paper.readingTime} min read</span>
							<span class="paper-difficulty">{paper.difficulty}</span>
						</div>

						<h2 class="paper-title">{paper.title}</h2>

						{#if paper.subtitle}
							<p class="paper-subtitle">{paper.subtitle}</p>
						{/if}

						<p class="paper-excerpt">{paper.description}</p>

						<div class="paper-keywords flex flex-wrap">
							{#each paper.keywords as keyword}
								<span class="keyword">{keyword}</span>
							{/each}
						</div>
					</div>
				</a>
			{/each}
		</section>

		<!-- Pagination Controls -->
		{#if totalPages > 1}
			<nav class="pagination-nav" aria-label="Papers pagination">
				<div class="pagination-container">
					<button
						onclick={() => currentPage = currentPage - 1}
						disabled={currentPage === 1}
						class="pagination-button"
						aria-label="Previous page"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
						Previous
					</button>

					<div class="pagination-pages">
						{#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
							{#if page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)}
								<button
									onclick={() => currentPage = page}
									class="pagination-page {currentPage === page ? 'active' : ''}"
									aria-label="Page {page}"
									aria-current={currentPage === page ? 'page' : undefined}
								>
									{page}
								</button>
							{:else if page === currentPage - 2 || page === currentPage + 2}
								<span class="pagination-ellipsis">...</span>
							{/if}
						{/each}
					</div>

					<button
						onclick={() => currentPage = currentPage + 1}
						disabled={currentPage === totalPages}
						class="pagination-button"
						aria-label="Next page"
					>
						Next
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</button>
				</div>

				<p class="pagination-info">
					Page {currentPage} of {totalPages} • Showing {paginatedPapers.length} of {resultCount} papers
				</p>
			</nav>
		{/if}
	{:else}
		<div class="empty-state">
			<p class="empty-message">No papers match your search.</p>
			<button
				onclick={() => { searchQuery = ''; categoryFilter = 'all'; }}
				class="clear-button"
			>
				Clear filters
			</button>
		</div>
	{/if}
</main>

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

	/* Pagination */
	.pagination-nav {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
		margin-top: var(--space-lg);
		padding: var(--space-md) 0;
	}

	.pagination-container {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.pagination-button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.pagination-button:hover:not(:disabled) {
		color: var(--color-fg-primary);
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.pagination-button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.pagination-pages {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.pagination-page {
		min-width: 2.5rem;
		height: 2.5rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-xs);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.pagination-page:hover {
		color: var(--color-fg-primary);
		background: var(--color-hover);
		border-color: var(--color-border-emphasis);
	}

	.pagination-page.active {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-color: var(--color-fg-primary);
	}

	.pagination-ellipsis {
		padding: 0 var(--space-xs);
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.pagination-info {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		text-align: center;
	}

	/* Existing paper card styles remain unchanged as they already use Canon */
	/* ==========================================================================
	   Papers Page - Card Styles (Canonical CSS)
	   Hero section uses Tailwind for consistency with /experiments
	   ========================================================================== */

	.papers-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 0 var(--space-md) var(--space-lg);
	}

	/* Papers Grid */
	.papers-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.paper-card {
		display: block;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		overflow: hidden;
		text-decoration: none;
		color: inherit;
		transition: border-color var(--duration-standard) var(--ease-out),
		            background var(--duration-standard) var(--ease-out),
		            transform var(--duration-standard) var(--ease-out);
	}

	.paper-card:hover {
		border-color: var(--color-border-emphasis);
		background: var(--color-hover);
		transform: translateY(-2px);
	}

	.paper-content {
		padding: var(--space-md);
	}

	.paper-meta {
		gap: var(--space-sm);
		margin-bottom: var(--space-xs);
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
		color: var(--color-fg-muted);
	}

	.paper-category {
		color: var(--color-fg-tertiary);
	}

	.paper-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		margin: 0 0 var(--space-xs) 0;
		line-height: var(--leading-snug);
		color: var(--color-fg-primary);
	}

	.paper-subtitle {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		font-style: italic;
		margin: 0 0 var(--space-sm) 0;
	}

	.paper-excerpt {
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin: 0 0 var(--space-sm) 0;
	}

	.paper-keywords {
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
	}

	.keyword {
		padding: 0.25rem var(--space-xs);
		background: var(--color-hover);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		font-size: var(--text-overline);
		color: var(--color-fg-muted);
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
