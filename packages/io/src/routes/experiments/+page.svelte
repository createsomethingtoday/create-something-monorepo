<script lang="ts">
  import type { PageData } from './$types';
  import { PapersGrid, SEO } from '@create-something/canon';
  import type { Paper } from '@create-something/canon/types';
  import CatalogOpening from '$lib/components/catalog/CatalogOpening.svelte';
  import { onMount } from 'svelte';

  let { data }: { data: PageData } = $props();
  const papers = $derived(data.papers);

  function getTestsPrinciples(experiment: unknown): string[] {
    if (typeof experiment !== 'object' || experiment === null) return [];
    const principles = (experiment as { tests_principles?: unknown }).tests_principles;
    return Array.isArray(principles)
      ? principles.filter((p): p is string => typeof p === 'string')
      : [];
  }

  // Search state
  let searchQuery = $state('');

  // Master filter state (filter by design methodology)
  type MasterFilter = 'all' | 'rams' | 'heidegger' | 'tufte' | 'ive' | 'canon';
  let masterFilter: MasterFilter = $state('all');

  // Sort state
  type SortOption = 'newest' | 'oldest' | 'featured';
  let sortBy: SortOption = $state('newest');
  let enhanced = $state(false);
  let currentPage = $state(1);
  const itemsPerPage = 12;

  // Master filter definitions - maps principle prefixes to masters
  const masterPrefixes: Record<Exclude<MasterFilter, 'all'>, string[]> = {
    rams: ['rams-principle'],
    heidegger: ['heidegger-'],
    tufte: ['tufte-'],
    ive: ['ive-motion', 'ive-'],
    canon: ['subtractive-triad', 'hermeneutic-workflow', 'being-modes']
  };

  // Check if an experiment matches the current master filter
  function matchesMasterFilter(experiment: (typeof papers)[0]): boolean {
    if (masterFilter === 'all') return true;

    const principles = getTestsPrinciples(experiment);
    const prefixes = masterPrefixes[masterFilter];

    return principles.some((principle: string) =>
      prefixes.some((prefix) => principle.startsWith(prefix))
    );
  }

  // Check if an experiment matches the search query
  function matchesSearch(experiment: (typeof papers)[0]): boolean {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const title = (experiment.title || '').toLowerCase();
    const description = (experiment.description || '').toLowerCase();
    const tags = Array.isArray(experiment.tags)
      ? experiment.tags
          .map((t: string | { name: string }) =>
            typeof t === 'string' ? t.toLowerCase() : t.name.toLowerCase()
          )
          .join(' ')
      : '';

    return title.includes(query) || description.includes(query) || tags.includes(query);
  }

  // Combined filter, search, and sort
  const filteredAndSortedPapers = $derived.by(() => {
    // First filter
    const filtered = papers.filter(
      (p: (typeof papers)[number]) => matchesMasterFilter(p) && matchesSearch(p)
    );

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
  }) as Paper[];

  // Result count for display
  const resultCount = $derived(filteredAndSortedPapers.length);
  const isFiltered = $derived(searchQuery.trim() !== '' || masterFilter !== 'all');
  const totalPages = $derived(Math.ceil(filteredAndSortedPapers.length / itemsPerPage));
  const visiblePapers = $derived.by(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return enhanced
      ? filteredAndSortedPapers.slice(start, start + itemsPerPage)
      : filteredAndSortedPapers;
  });

  $effect(() => {
    searchQuery;
    masterFilter;
    sortBy;
    currentPage = 1;
  });

  onMount(() => (enhanced = true));
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

<CatalogOpening
  active="experiments"
  title="Tracked Experiments"
  description="Choose a production experiment by the design principle it tests, then inspect its time, cost, errors, and learnings."
/>

<section class="io-catalog-collection" aria-labelledby="experiment-collection-title">
  <div class="max-w-7xl mx-auto collection-inner">
    <header class="collection-heading">
      <div>
        <p>Browse the collection</p>
        <h2 id="experiment-collection-title">Experiments</h2>
      </div>
      <span>{resultCount} of {papers.length} shown</span>
    </header>

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
          <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {#if searchQuery}
            <button
              onclick={() => (searchQuery = '')}
              class="search-clear"
              aria-label="Clear search"
            >
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

      <!-- Filter by Design Methodology -->
      <div class="flex justify-center">
        <div class="flex flex-wrap justify-center gap-2">
          <button
            onclick={() => (masterFilter = 'all')}
            class="filter-chip {masterFilter === 'all' ? 'active' : ''}"
            aria-pressed={masterFilter === 'all'}
          >
            All
          </button>
          <button
            onclick={() => (masterFilter = 'rams')}
            class="filter-chip {masterFilter === 'rams' ? 'active' : ''}"
            aria-pressed={masterFilter === 'rams'}
            title="Dieter Rams - Less, but better"
          >
            Minimalism
          </button>
          <button
            onclick={() => (masterFilter = 'heidegger')}
            class="filter-chip {masterFilter === 'heidegger' ? 'active' : ''}"
            aria-pressed={masterFilter === 'heidegger'}
            title="Tool transparency - when tools recede into use"
          >
            Tool Design
          </button>
          <button
            onclick={() => (masterFilter = 'tufte')}
            class="filter-chip {masterFilter === 'tufte' ? 'active' : ''}"
            aria-pressed={masterFilter === 'tufte'}
            title="Edward Tufte - Data visualization"
          >
            Data Viz
          </button>
          <button
            onclick={() => (masterFilter = 'ive')}
            class="filter-chip {masterFilter === 'ive' ? 'active' : ''}"
            aria-pressed={masterFilter === 'ive'}
            title="Jony Ive - Purposeful motion, physics-based feedback"
          >
            Motion
          </button>
          <button
            onclick={() => (masterFilter = 'canon')}
            class="filter-chip {masterFilter === 'canon' ? 'active' : ''}"
            aria-pressed={masterFilter === 'canon'}
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
            onclick={() => (sortBy = 'featured')}
            class="sort-button {sortBy === 'featured' ? 'active' : ''}"
            aria-pressed={sortBy === 'featured'}
          >
            Featured
          </button>
        </div>
      </div>
    </div>

    {#if resultCount > 0}
      <PapersGrid papers={visiblePapers} title="" subtitle="" />
      {#if enhanced && totalPages > 1}
        <nav class="catalog-pagination" aria-label="Experiments pagination">
          <button type="button" disabled={currentPage === 1} onclick={() => (currentPage -= 1)}
            >Previous</button
          >
          <span>Page {currentPage} of {totalPages}</span>
          <button
            type="button"
            disabled={currentPage === totalPages}
            onclick={() => (currentPage += 1)}>Next</button
          >
        </nav>
      {/if}
    {:else}
      <div class="empty-state">
        <p class="empty-message">No experiments match your search.</p>
        <button
          onclick={() => {
            searchQuery = '';
            masterFilter = 'all';
          }}
          class="clear-button"
        >
          Clear filters
        </button>
      </div>
    {/if}
  </div>
</section>

<!-- Footer -->

<style>
  .io-catalog-collection {
    padding: clamp(2rem, 5vw, 4rem) var(--space-performance-md) clamp(4rem, 8vw, 6rem);
    border-top: 1px solid var(--color-performance-border-default);
  }

  .collection-inner {
    display: grid;
    gap: var(--space-performance-lg);
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

  .catalog-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-performance-md);
  }

  .catalog-pagination button {
    min-height: 2.75rem;
    padding: var(--space-performance-xs) var(--space-performance-md);
    border: 1px solid var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-sm);
    background: var(--color-performance-bg-surface);
    font-weight: var(--font-performance-medium);
  }

  .catalog-pagination button:disabled {
    opacity: 0.45;
  }

  .catalog-pagination span {
    color: var(--color-performance-fg-tertiary);
    font-size: var(--text-performance-body-sm);
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

    :global(.papers-section) {
      padding-top: var(--space-performance-md);
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
