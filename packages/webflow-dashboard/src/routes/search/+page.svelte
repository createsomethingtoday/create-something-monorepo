<script lang="ts">
  import { onMount } from 'svelte';
  import { Header, Button, Card, BackNavigation, Search } from '$lib/components';
  import { trackEvent } from '$lib/utils/analytics';
  import { ExternalLink, ShieldCheck, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // ── Search state ────────────────────────────────────────────────────────────
  let query = $state('');
  let scope = $state<'all' | 'featured' | 'free' | 'landing_pages'>('all');
  let sort = $state<'popular' | 'newest' | 'price_asc' | 'price_desc'>('popular');
  let freeOnly = $state(false);
  let activeCategorySlug = $state('');
  let page = $state(1);
  let showFilters = $state(false);

  // ── Results state ────────────────────────────────────────────────────────────
  interface SearchItem {
    id: string;
    template_slug: string;
    name: string;
    url: string | null;
    preview_url: string | null;
    creator_name: string | null;
    thumbnail_image_url: string | null;
    price: number | null;
    is_free: boolean;
    popularity_score: number | null;
    cumulative_purchases: number | null;
    category_groups: Array<{ name: string; slug: string }>;
    styles: Array<{ name: string; slug: string }>;
  }

  interface Pagination {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  }

  let items = $state<SearchItem[]>([]);
  let pagination = $state<Pagination | null>(null);
  let availableStyles = $state<Array<{ name: string; slug: string; count: number }>>([]);
  let isLoading = $state(false);
  let fetchError = $state<string | null>(null);
  let hasSearched = $state(false);

  // ── Modal ────────────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let GsapValidationModal = $state<any>(null);
  let isGsapModalOpen = $state(false);
  let validateUrl = $state('');

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  // ── Search ───────────────────────────────────────────────────────────────────
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleSearch(resetPage = true) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (resetPage) page = 1;
      runSearch();
    }, 320);
  }

  async function runSearch() {
    if (!data.workerConfigured) return;

    isLoading = true;
    fetchError = null;
    hasSearched = true;

    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (scope !== 'all') params.set('scope', scope);
    if (freeOnly) params.set('free_only', '1');
    if (activeCategorySlug) params.set('category_group_slug', activeCategorySlug);
    params.set('sort', sort);
    params.set('page', String(page));
    params.set('page_size', '24');

    try {
      const res = await fetch(`/api/templates/search?${params.toString()}`);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const body = await res.json();
      items = body.items ?? [];
      pagination = body.pagination ?? null;
      availableStyles = body.available_facets?.styles ?? [];

      trackEvent('template_search_results_loaded', {
        query: query.trim() || null,
        scope,
        sort,
        free_only: freeOnly,
        category_slug: activeCategorySlug || null,
        page,
        total_items: pagination?.total_items ?? 0
      });
    } catch (err) {
      fetchError = err instanceof Error ? err.message : 'Search failed.';
      trackEvent('template_search_failed', { error: fetchError });
    } finally {
      isLoading = false;
    }
  }

  function handleQueryChange(val: string) {
    query = val;
    scheduleSearch();
  }

  function setScope(s: typeof scope) {
    scope = s;
    freeOnly = s === 'free';
    scheduleSearch();
    trackEvent('template_search_scope_changed', { scope: s });
  }

  function setSort(s: typeof sort) {
    sort = s;
    scheduleSearch();
    trackEvent('template_search_sort_changed', { sort: s });
  }

  function toggleFree() {
    freeOnly = !freeOnly;
    scheduleSearch();
  }

  function setCategory(slug: string) {
    activeCategorySlug = activeCategorySlug === slug ? '' : slug;
    scheduleSearch();
    trackEvent('template_search_category_filtered', { slug, cleared: !activeCategorySlug });
  }

  function goToPage(p: number) {
    page = p;
    runSearch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Validate integration ─────────────────────────────────────────────────────
  function ownInfo(item: SearchItem) {
    return data.userPreviewUrls[item.name.toLowerCase().trim()] ?? null;
  }

  async function handleQuickValidate(url: string, name: string) {
    if (!GsapValidationModal) {
      const mod = await import('$lib/components/GsapValidationModal.svelte');
      GsapValidationModal = mod.default;
    }
    validateUrl = url;
    isGsapModalOpen = true;
    trackEvent('template_search_quick_validate_opened', { template_name: name, url });
  }

  function handleViewTemplate(url: string, name: string) {
    trackEvent('template_search_view_clicked', { template_name: name, url });
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  onMount(() => {
    trackEvent('template_search_page_viewed', {
      worker_configured: data.workerConfigured,
      own_templates: Object.keys(data.userPreviewUrls).length
    });

    if (data.workerConfigured) {
      runSearch();
    }
  });
</script>

<svelte:head>
  <title>Template Search | Webflow Asset Dashboard</title>
</svelte:head>

<div class="search-page">
  <Header onLogout={handleLogout} showMarketplace={data.hasTemplateAsset} />

  <main class="main-content">
    <div class="content-wrapper">
      <BackNavigation />

      <div class="page-header page-intro">
        <div class="header-content">
          <span class="page-kicker">Template marketplace</span>
          <h1 class="page-title page-intro__title">Template Search</h1>
          <p class="page-subtitle page-intro__subtitle">
            Search the full template catalog. Quick Validate any of your own templates directly from
            results.
          </p>
        </div>
      </div>

      {#if !data.workerConfigured}
        <div class="not-configured">
          <p class="not-configured__title">Search not yet configured</p>
          <p class="not-configured__body">
            Set <code>TEMPLATE_SEARCH_WORKER_URL</code> in the dashboard environment to enable full
            template search.
          </p>
        </div>
      {:else}
        <!-- Search bar + filter toggle -->
        <div class="search-bar-row">
          <Search
            placeholder="Search templates…"
            value={query}
            onSearch={handleQueryChange}
            ariaLabel="Search templates"
          />
          <button
            class="filter-toggle"
            class:active={showFilters}
            onclick={() => (showFilters = !showFilters)}
            aria-expanded={showFilters}
            aria-label="Toggle filters"
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
        </div>

        <!-- Scope tabs -->
        <div class="scope-rail" role="tablist" aria-label="Template scope">
          {#each ([['all', 'All'], ['featured', 'Featured'], ['free', 'Free'], ['landing_pages', 'Landing pages']] as const) as [val, label]}
            <button
              role="tab"
              class="scope-btn"
              class:active={scope === val}
              onclick={() => setScope(val)}
              aria-selected={scope === val}
            >
              {label}
            </button>
          {/each}
        </div>

        <!-- Expanded filters -->
        {#if showFilters}
          <div class="filter-panel">
            <div class="filter-group">
              <span class="filter-label">Sort</span>
              <div class="filter-options">
                {#each ([['popular', 'Popular'], ['newest', 'Newest'], ['price_asc', 'Price ↑'], ['price_desc', 'Price ↓']] as const) as [val, label]}
                  <button
                    class="filter-chip"
                    class:active={sort === val}
                    onclick={() => setSort(val)}
                  >{label}</button>
                {/each}
              </div>
            </div>

            {#if data.categoryGroups.length > 0}
              <div class="filter-group">
                <span class="filter-label">Category</span>
                <div class="filter-options">
                  {#each data.categoryGroups as cat}
                    <button
                      class="filter-chip"
                      class:active={activeCategorySlug === cat.name}
                      onclick={() => setCategory(cat.name)}
                    >{cat.name}</button>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Results area -->
        {#if isLoading}
          <div class="loading-row" aria-live="polite" aria-label="Loading">
            <div class="loading-dots">
              <span></span><span></span><span></span>
            </div>
            <p>Searching…</p>
          </div>
        {:else if fetchError}
          <div class="error-state">
            <p>{fetchError}</p>
            <Button variant="secondary" onclick={runSearch}>Retry</Button>
          </div>
        {:else if hasSearched}
          {#if pagination}
            <p class="results-meta">
              {pagination.total_items.toLocaleString()} template{pagination.total_items !== 1 ? 's' : ''}
              {#if query.trim()}— <em>{query.trim()}</em>{/if}
            </p>
          {/if}

          {#if items.length === 0}
            <div class="empty-state">
              <p>No templates found{query.trim() ? ` for "${query.trim()}"` : ''}.</p>
            </div>
          {:else}
            <div class="results-grid">
              {#each items as item (item.id)}
                {@const own = ownInfo(item)}
                <Card class="result-card {own ? 'result-card--own' : ''}">
                  {#if item.thumbnail_image_url}
                    <div class="result-thumb">
                      <img
                        src={item.thumbnail_image_url}
                        alt={item.name}
                        loading="lazy"
                        width="280"
                        height="200"
                      />
                      {#if item.is_free}
                        <span class="thumb-badge thumb-badge--free">Free</span>
                      {:else if item.price}
                        <span class="thumb-badge thumb-badge--price">${item.price}</span>
                      {/if}
                    </div>
                  {/if}

                  <div class="result-body">
                    <div class="result-badges">
                      {#if own}
                        <span class="badge badge--own">Yours · {own.status}</span>
                      {/if}
                      {#if item.category_groups?.length}
                        <span class="badge badge--category">{item.category_groups[0].name}</span>
                      {/if}
                    </div>

                    <h3 class="result-name">{item.name}</h3>

                    {#if item.creator_name}
                      <p class="result-creator">by {item.creator_name}</p>
                    {/if}

                    {#if item.cumulative_purchases}
                      <p class="result-sales">
                        {item.cumulative_purchases.toLocaleString()} sales
                      </p>
                    {/if}
                  </div>

                  <div class="result-actions">
                    {#if own?.previewUrl}
                      <Button
                        variant="default"
                        onclick={() => handleQuickValidate(own.previewUrl!, item.name)}
                        class="action-btn"
                      >
                        <ShieldCheck size={14} />
                        Quick Validate
                      </Button>
                    {/if}
                    {#if item.url}
                      <Button
                        variant={own?.previewUrl ? 'secondary' : 'default'}
                        onclick={() => handleViewTemplate(item.url!, item.name)}
                        class="action-btn"
                      >
                        <ExternalLink size={14} />
                        View
                      </Button>
                    {/if}
                  </div>
                </Card>
              {/each}
            </div>

            <!-- Pagination -->
            {#if pagination && pagination.total_pages > 1}
              <div class="pagination" role="navigation" aria-label="Search results pages">
                <button
                  class="page-btn"
                  disabled={!pagination.has_previous_page}
                  onclick={() => goToPage(page - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span class="page-info">
                  Page {pagination.page} of {pagination.total_pages}
                </span>
                <button
                  class="page-btn"
                  disabled={!pagination.has_next_page}
                  onclick={() => goToPage(page + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            {/if}
          {/if}
        {/if}
      {/if}
    </div>
  </main>
</div>

{#if GsapValidationModal && isGsapModalOpen}
  <svelte:component
    this={GsapValidationModal}
    bind:isOpen={isGsapModalOpen}
    onClose={() => (isGsapModalOpen = false)}
    initialUrl={validateUrl}
    userEmail={data.user?.email}
  />
{/if}

<style>
  .search-page {
    min-height: 100vh;
    background: var(--color-bg-pure);
  }

  .main-content {
    padding: var(--space-lg) var(--space-md);
  }

  .content-wrapper {
    max-width: var(--layout-content-max-width);
    margin: 0 auto;
  }

  .page-kicker {
    display: inline-flex;
    margin-bottom: var(--space-xs);
    color: var(--color-info);
    font-size: var(--text-caption);
    font-weight: var(--font-semibold);
    text-transform: uppercase;
  }

  /* Not configured */
  .not-configured {
    padding: var(--space-lg);
    border: 1px dashed var(--color-shell-border-default);
    border-radius: var(--radius-sm);
    text-align: center;
    color: var(--color-fg-secondary);
  }

  .not-configured__title {
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin: 0 0 var(--space-xs);
  }

  .not-configured__body {
    font-size: var(--text-body-sm);
    margin: 0;
  }

  .not-configured__body code {
    font-family: monospace;
    font-size: 0.88em;
    background: var(--color-bg-subtle);
    padding: 0.1em 0.35em;
    border-radius: 4px;
  }

  /* Search bar row */
  .search-bar-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-sm);
    align-items: center;
    margin-bottom: var(--space-sm);
  }

  .filter-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0 0.9rem;
    height: 2.75rem;
    border: 1px solid var(--color-shell-border-default);
    border-radius: 0.75rem;
    background: var(--color-bg-surface);
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    cursor: pointer;
    white-space: nowrap;
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      color var(--duration-micro) var(--ease-standard);
  }

  .filter-toggle:hover,
  .filter-toggle.active {
    border-color: var(--color-info-border);
    color: var(--color-fg-primary);
  }

  /* Scope rail */
  .scope-rail {
    display: flex;
    gap: 0;
    margin-bottom: var(--space-sm);
    border-bottom: 1px solid var(--color-shell-border-default);
  }

  .scope-btn {
    padding: 0.5rem 0.9rem;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition:
      color var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard);
    margin-bottom: -1px;
  }

  .scope-btn:hover:not(.active) {
    color: var(--color-fg-secondary);
  }

  .scope-btn.active {
    color: var(--color-fg-primary);
    border-bottom-color: var(--color-info);
  }

  /* Filter panel */
  .filter-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    padding: var(--space-sm);
    margin-bottom: var(--space-sm);
    border: 1px solid color-mix(in srgb, var(--color-shell-border-default) 72%, transparent);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--color-bg-surface) 80%, transparent);
  }

  .filter-group {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  .filter-label {
    font-size: var(--text-caption);
    font-weight: var(--font-semibold);
    color: var(--color-fg-muted);
    text-transform: uppercase;
    padding-top: 0.3rem;
    min-width: 4.5rem;
    flex-shrink: 0;
  }

  .filter-options {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .filter-chip {
    padding: 0.28rem 0.7rem;
    border: 1px solid var(--color-shell-border-default);
    border-radius: 999px;
    background: transparent;
    color: var(--color-fg-secondary);
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
    cursor: pointer;
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      background-color var(--duration-micro) var(--ease-standard),
      color var(--duration-micro) var(--ease-standard);
  }

  .filter-chip:hover:not(.active) {
    border-color: var(--color-info-border);
    color: var(--color-fg-primary);
  }

  .filter-chip.active {
    border-color: var(--color-info);
    background: var(--color-info-muted);
    color: var(--color-info);
  }

  /* Loading */
  .loading-row {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-xl) 0;
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
  }

  .loading-dots {
    display: flex;
    gap: var(--space-xs);
  }

  .loading-dots span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-info);
    animation: dot-pulse 1.4s ease-in-out infinite;
  }

  .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
  .loading-dots span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes dot-pulse {
    0%, 100% { opacity: 0.35; }
    50% { opacity: 1; }
  }

  /* Error / empty */
  .error-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-xl) 0;
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    text-align: center;
  }

  /* Results */
  .results-meta {
    margin: 0 0 var(--space-sm);
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--space-sm);
  }

  :global(.result-card) {
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
    border-radius: var(--radius-sm);
    border-color: color-mix(in srgb, var(--color-shell-border-default) 72%, transparent);
    box-shadow: none;
  }

  :global(.result-card--own) {
    border-color: var(--color-info-soft-border) !important;
    background: color-mix(in srgb, var(--color-info-soft-wash) 60%, var(--color-bg-surface)) !important;
  }

  .result-thumb {
    position: relative;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    background: var(--color-bg-subtle);
    flex-shrink: 0;
  }

  .result-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform var(--duration-micro) var(--ease-standard);
  }

  :global(.result-card:hover) .result-thumb img {
    transform: scale(1.02);
  }

  .thumb-badge {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.18rem 0.5rem;
    border-radius: 999px;
    font-size: var(--text-caption);
    font-weight: var(--font-semibold);
    line-height: 1;
  }

  .thumb-badge--free {
    background: color-mix(in srgb, var(--color-success) 14%, var(--color-bg-surface));
    color: var(--color-success);
    border: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent);
  }

  .thumb-badge--price {
    background: color-mix(in srgb, var(--color-bg-pure) 90%, transparent);
    color: var(--color-fg-primary);
    border: 1px solid var(--color-shell-border-default);
  }

  .result-body {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem;
    flex: 1;
  }

  .result-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-bottom: 0.15rem;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.12rem 0.45rem;
    border-radius: 999px;
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
    line-height: 1;
  }

  .badge--own {
    background: color-mix(in srgb, var(--color-info) 12%, transparent);
    color: var(--color-info);
    border: 1px solid var(--color-info-border);
  }

  .badge--category {
    background: var(--color-bg-subtle);
    color: var(--color-fg-muted);
    border: 1px solid color-mix(in srgb, var(--color-shell-border-default) 60%, transparent);
  }

  .result-name {
    font-family: var(--font-heading);
    font-size: var(--text-body-sm);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    color: var(--color-fg-primary);
    margin: 0;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .result-creator,
  .result-sales {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    margin: 0;
    line-height: 1.3;
  }

  .result-actions {
    display: flex;
    gap: 0.35rem;
    padding: 0.6rem 0.75rem;
    border-top: 1px solid color-mix(in srgb, var(--color-shell-border-default) 55%, transparent);
  }

  :global(.action-btn) {
    flex: 1;
    justify-content: center;
    gap: 0.3rem;
    font-size: var(--text-caption) !important;
    padding: 0.38rem 0.55rem !important;
    min-height: 1.9rem !important;
  }

  /* Pagination */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    margin-top: var(--space-lg);
    padding-top: var(--space-md);
    border-top: 1px solid color-mix(in srgb, var(--color-shell-border-default) 60%, transparent);
  }

  .page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--color-fg-secondary);
    cursor: pointer;
    transition:
      border-color var(--duration-micro) var(--ease-standard),
      color var(--duration-micro) var(--ease-standard);
  }

  .page-btn:hover:not(:disabled) {
    border-color: var(--color-info-border);
    color: var(--color-fg-primary);
  }

  .page-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .page-info {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 640px) {
    .search-bar-row {
      grid-template-columns: 1fr;
    }

    .results-grid {
      grid-template-columns: 1fr;
    }

    .filter-group {
      flex-direction: column;
    }
  }
</style>
