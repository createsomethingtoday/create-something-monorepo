<script lang="ts">
  /**
   * Research Papers Index
   *
   * Papers document what we tested, what we found, and what it means.
   * Each paper includes methodology, data, and conclusions you can verify.
   */
  import { SEO } from '@create-something/canon';
  import CatalogOpening from '$lib/components/catalog/CatalogOpening.svelte';
  import { onMount } from 'svelte';

  let { data } = $props();
  const papers = $derived(data.papers);

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
  let enhanced = $state(false);
  const itemsPerPage = 12;

  // Check if a paper matches the search query
  function matchesSearch(paper: (typeof papers)[0]): boolean {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const title = (paper.title || '').toLowerCase();
    const description = (paper.description || '').toLowerCase();
    const subtitle = (paper.subtitle || '').toLowerCase();
    const keywords = paper.keywords?.map((k) => k.toLowerCase()).join(' ') || '';

    return (
      title.includes(query) ||
      description.includes(query) ||
      subtitle.includes(query) ||
      keywords.includes(query)
    );
  }

  // Check if a paper matches the category filter
  function matchesCategory(paper: (typeof papers)[0]): boolean {
    if (categoryFilter === 'all') return true;
    return paper.category === categoryFilter;
  }

  // Combined filter, search, and sort
  const filteredAndSortedPapers = $derived.by(() => {
    // First filter
    const filtered = papers.filter((p) => matchesSearch(p) && matchesCategory(p));

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
    return enhanced ? filteredAndSortedPapers.slice(startIndex, endIndex) : filteredAndSortedPapers;
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

  onMount(() => (enhanced = true));
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

<CatalogOpening
  active="papers"
  title="Research Papers"
  description="Choose a paper by its question, evidence, and reading commitment, then decide whether its finding changes the practice."
/>

<section class="io-catalog-collection papers-page" aria-labelledby="paper-collection-title">
  <div class="collection-heading">
    <div>
      <p>Browse the collection</p>
      <h2 id="paper-collection-title">Papers</h2>
    </div>
    <span>{resultCount} of {papers.length} shown</span>
  </div>

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
        <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {#if searchQuery}
          <button onclick={() => (searchQuery = '')} class="search-clear" aria-label="Clear search">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        {/if}
      </div>
    </div>

    <!-- Category Filter Chips -->
    <div class="flex justify-center">
      <div class="flex flex-wrap justify-center gap-2">
        <button
          onclick={() => (categoryFilter = 'all')}
          class="filter-chip {categoryFilter === 'all' ? 'active' : ''}"
          aria-pressed={categoryFilter === 'all'}
        >
          All
        </button>
        <button
          onclick={() => (categoryFilter = 'research')}
          class="filter-chip {categoryFilter === 'research' ? 'active' : ''}"
          aria-pressed={categoryFilter === 'research'}
        >
          Research
        </button>
        <button
          onclick={() => (categoryFilter = 'case-study')}
          class="filter-chip {categoryFilter === 'case-study' ? 'active' : ''}"
          aria-pressed={categoryFilter === 'case-study'}
        >
          Case Study
        </button>
        <button
          onclick={() => (categoryFilter = 'methodology')}
          class="filter-chip {categoryFilter === 'methodology' ? 'active' : ''}"
          aria-pressed={categoryFilter === 'methodology'}
        >
          Methodology
        </button>
      </div>
    </div>

    <!-- Sort Control -->
    <div class="flex justify-center">
      <div class="sort-control">
        <button
          onclick={() => (sortBy = 'newest')}
          class="sort-button {sortBy === 'newest' ? 'active' : ''}"
          aria-pressed={sortBy === 'newest'}
        >
          Newest
        </button>
        <button
          onclick={() => (sortBy = 'oldest')}
          class="sort-button {sortBy === 'oldest' ? 'active' : ''}"
          aria-pressed={sortBy === 'oldest'}
        >
          Oldest
        </button>
        <button
          onclick={() => (sortBy = 'reading-time')}
          class="sort-button {sortBy === 'reading-time' ? 'active' : ''}"
          aria-pressed={sortBy === 'reading-time'}
        >
          Quick Reads
        </button>
      </div>
    </div>
  </div>

  {#if resultCount > 0}
    <div class="papers-grid highlight-flex">
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
    </div>

    <!-- Pagination Controls -->
    {#if enhanced && totalPages > 1}
      <nav class="pagination-nav" aria-label="Papers pagination">
        <div class="pagination-container">
          <button
            onclick={() => (currentPage = currentPage - 1)}
            disabled={currentPage === 1}
            class="pagination-button"
            aria-label="Previous page"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span class="pagination-label">Previous</span>
          </button>

          <div class="pagination-pages">
            {#each Array.from({ length: totalPages }, (_, i) => i + 1) as page}
              {#if page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)}
                <button
                  onclick={() => (currentPage = page)}
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
            onclick={() => (currentPage = currentPage + 1)}
            disabled={currentPage === totalPages}
            class="pagination-button"
            aria-label="Next page"
          >
            <span class="pagination-label">Next</span>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
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
        onclick={() => {
          searchQuery = '';
          categoryFilter = 'all';
        }}
        class="clear-button"
      >
        Clear filters
      </button>
    </div>
  {/if}
</section>

<style>
  .io-catalog-collection {
    border-top: 1px solid var(--color-performance-border-default);
  }

  .collection-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: var(--space-performance-md);
  }

  .collection-heading div {
    display: grid;
    gap: 0.35rem;
  }

  .collection-heading p,
  .collection-heading h2 {
    margin: 0;
  }

  .collection-heading p,
  .collection-heading > span {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  .collection-heading h2 {
    color: var(--color-performance-fg-primary);
    font-size: var(--text-performance-h2);
    font-weight: var(--font-performance-semibold);
  }

  /* Controls */
  .controls-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-performance-sm);
  }

  .search-input {
    width: 100%;
    padding: var(--space-performance-sm) var(--space-performance-sm) var(--space-performance-sm)
      2.5rem;
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-md);
    color: var(--color-performance-fg-primary);
    transition: border-color var(--duration-performance-standard) var(--ease-performance-standard);
  }

  .search-input::placeholder {
    color: var(--color-performance-fg-muted);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--color-performance-border-emphasis);
  }

  .search-icon {
    position: absolute;
    left: var(--space-performance-sm);
    top: 50%;
    transform: translateY(-50%);
    width: 1rem;
    height: 1rem;
    color: var(--color-performance-fg-muted);
  }

  .search-clear {
    position: absolute;
    right: var(--space-performance-sm);
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-performance-fg-muted);
    transition: color var(--duration-performance-standard) var(--ease-performance-standard);
  }

  .search-clear:hover {
    color: var(--color-performance-fg-secondary);
  }

  /* Filter Chips */
  .filter-chip {
    padding: 0.375rem var(--space-performance-sm);
    font-size: var(--text-performance-body-sm);
    border-radius: var(--radius-performance-scale-full);
    transition: all var(--duration-performance-standard) var(--ease-performance-standard);
    background: var(--color-performance-bg-surface);
    color: var(--color-performance-fg-tertiary);
  }

  .filter-chip:hover {
    color: var(--color-performance-fg-primary);
    background: var(--color-performance-hover);
  }

  .filter-chip.active {
    background: var(--color-performance-fg-primary);
    color: var(--color-performance-bg-pure);
    border-color: var(--color-performance-fg-primary);
  }

  /* Sort Control */
  .sort-control {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem;
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-md);
  }

  .sort-button {
    padding: var(--space-performance-xs) var(--space-performance-sm);
    font-size: var(--text-performance-body-sm);
    font-weight: var(--font-performance-medium);
    border-radius: var(--radius-performance-scale-sm);
    transition: all var(--duration-performance-standard) var(--ease-performance-standard);
    color: var(--color-performance-fg-secondary);
  }

  .sort-button:hover {
    color: var(--color-performance-fg-primary);
    background: var(--color-performance-hover);
  }

  .sort-button.active {
    background: var(--color-performance-fg-primary);
    color: var(--color-performance-bg-pure);
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: var(--space-performance-2xl) var(--space-performance-md);
  }

  .empty-message {
    color: var(--color-performance-fg-tertiary);
    font-size: var(--text-performance-body-lg);
    margin-bottom: var(--space-performance-md);
  }

  .clear-button {
    margin-top: var(--space-performance-sm);
    padding: var(--space-performance-xs) var(--space-performance-sm);
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-secondary);
    border: 1px solid var(--color-performance-border-emphasis);
    border-radius: var(--radius-performance-scale-md);
    background: transparent;
    transition: all var(--duration-performance-standard) var(--ease-performance-standard);
  }

  .clear-button:hover {
    color: var(--color-performance-fg-primary);
    background: var(--color-performance-bg-surface);
  }

  /* Pagination */
  .pagination-nav {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-performance-md);
    margin-top: var(--space-performance-lg);
    padding: var(--space-performance-md) 0;
  }

  .pagination-container {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: var(--space-performance-sm);
    max-width: 100%;
  }

  .pagination-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-performance-xs);
    padding: var(--space-performance-xs) var(--space-performance-sm);
    font-size: var(--text-performance-body-sm);
    font-weight: var(--font-performance-medium);
    color: var(--color-performance-fg-secondary);
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-md);
    transition: all var(--duration-performance-standard) var(--ease-performance-standard);
  }

  .pagination-button:hover:not(:disabled) {
    color: var(--color-performance-fg-primary);
    background: var(--color-performance-hover);
    border-color: var(--color-performance-border-emphasis);
  }

  .pagination-button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .pagination-pages {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: var(--space-performance-xs);
  }

  .pagination-page {
    min-width: 2.5rem;
    height: 2.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-performance-xs);
    font-size: var(--text-performance-body-sm);
    font-weight: var(--font-performance-medium);
    color: var(--color-performance-fg-secondary);
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-md);
    transition: all var(--duration-performance-standard) var(--ease-performance-standard);
  }

  .pagination-page:hover {
    color: var(--color-performance-fg-primary);
    background: var(--color-performance-hover);
    border-color: var(--color-performance-border-emphasis);
  }

  .pagination-page.active {
    background: var(--color-performance-fg-primary);
    color: var(--color-performance-bg-pure);
    border-color: var(--color-performance-fg-primary);
  }

  .pagination-ellipsis {
    padding: 0 var(--space-performance-xs);
    color: var(--color-performance-fg-muted);
    font-size: var(--text-performance-body-sm);
  }

  .pagination-info {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-tertiary);
    text-align: center;
  }

  /* Existing paper card styles remain unchanged as they already use Canon */
  /* ==========================================================================
	   Papers Page - Card Styles (Canonical CSS)
	   Hero section uses Tailwind for consistency with /experiments
	   ========================================================================== */

  .papers-page {
    display: grid;
    max-width: 800px;
    margin: 0 auto;
    padding: clamp(2rem, 5vw, 4rem) var(--space-performance-md) clamp(4rem, 8vw, 6rem);
    gap: var(--space-performance-lg);
    overflow-x: clip;
  }

  /* Papers Grid */
  .papers-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-performance-md);
  }

  .paper-card {
    display: block;
    min-width: 0;
    border-radius: var(--radius-performance-scale-md);
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    transition:
      border-color var(--duration-performance-standard) var(--ease-out),
      background var(--duration-performance-standard) var(--ease-out),
      transform var(--duration-performance-standard) var(--ease-out);
  }

  .paper-card:hover {
    border-color: var(--color-performance-border-emphasis);
    background: var(--color-performance-hover);
    transform: translateY(-2px);
  }

  .paper-content {
    padding: var(--space-performance-md);
    min-width: 0;
  }

  .paper-meta {
    gap: var(--space-performance-sm);
    margin-bottom: var(--space-performance-xs);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
    letter-spacing: var(--tracking-performance-wider);
    color: var(--color-performance-fg-muted);
  }

  .paper-category {
    color: var(--color-performance-fg-tertiary);
  }

  .paper-title {
    font-size: var(--text-performance-h3);
    font-weight: var(--font-performance-semibold);
    margin: 0 0 var(--space-performance-xs) 0;
    line-height: var(--leading-performance-snug);
    color: var(--color-performance-fg-primary);
    overflow-wrap: anywhere;
  }

  .paper-subtitle {
    font-size: var(--text-performance-body);
    color: var(--color-performance-fg-tertiary);
    font-style: italic;
    margin: 0 0 var(--space-performance-sm) 0;
  }

  .paper-excerpt {
    color: var(--color-performance-fg-secondary);
    line-height: var(--leading-performance-relaxed);
    margin: 0 0 var(--space-performance-sm) 0;
    overflow-wrap: anywhere;
  }

  .paper-keywords {
    gap: var(--space-performance-xs);
    margin-bottom: var(--space-performance-sm);
  }

  .keyword {
    padding: 0.25rem var(--space-performance-xs);
    background: var(--color-performance-hover);
    border-radius: var(--radius-performance-scale-sm);
    font-size: var(--text-performance-overline);
    color: var(--color-performance-fg-muted);
    max-width: 100%;
    overflow-wrap: anywhere;
  }

  @media (max-width: 640px) {
    .collection-heading {
      align-items: flex-start;
      flex-direction: column;
    }

    .controls-container {
      gap: 0.85rem;
    }

    .search-input {
      min-height: 2.75rem;
      padding-right: 2.75rem;
    }

    .search-clear {
      right: 0.18rem;
      width: 2.5rem;
      height: 2.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .filter-chip {
      min-height: 2.75rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding-inline: 0.9rem;
      line-height: 1.2;
    }

    .sort-control {
      width: min(100%, 22rem);
    }

    .sort-button {
      flex: 1 1 0;
      min-height: 2.75rem;
      min-width: 0;
      padding-inline: 0.55rem;
    }

    .papers-page {
      padding-inline: 1.1rem;
    }

    .papers-grid {
      gap: var(--space-performance-sm);
    }

    .paper-content {
      padding: var(--space-performance-sm) 0;
    }

    .paper-meta {
      flex-wrap: wrap;
      gap: 0.32rem 0.78rem;
      line-height: 1.35;
    }

    .pagination-nav {
      gap: var(--space-performance-sm);
      margin-top: var(--space-performance-md);
    }

    .pagination-container {
      width: 100%;
      gap: 0.5rem;
    }

    .pagination-pages {
      order: -1;
      width: 100%;
      gap: 0.4rem;
    }

    .pagination-button {
      flex: 1 1 calc(50% - 0.5rem);
      min-height: 2.75rem;
      min-width: 0;
      padding-inline: var(--space-performance-xs);
    }

    .pagination-page {
      min-width: 2.75rem;
      height: 2.75rem;
    }

    .pagination-info {
      max-width: 18rem;
      line-height: 1.45;
    }
  }

  @media (max-width: 360px) {
    .pagination-label {
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
