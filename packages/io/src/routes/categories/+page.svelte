<script lang="ts">
  import CatalogOpening from '$lib/components/catalog/CatalogOpening.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
  const { categories } = data;
</script>

<svelte:head>
  <title>Browse by Category | CREATE SOMETHING</title>
  <meta name="description" content="Explore our technical papers organized by topic" />
  <link rel="canonical" href="https://createsomething.io/categories" />
</svelte:head>

<CatalogOpening
  active="categories"
  title="Browse by Topic"
  description="Choose the research topic closest to the current question, then inspect its complete paper set."
/>

<!-- Categories Grid -->
<section class="io-catalog-collection py-16 px-6" aria-labelledby="category-collection-title">
  <div class="max-w-5xl mx-auto">
    <header class="collection-heading">
      <p>Browse the collection</p>
      <h2 id="category-collection-title">Research topics</h2>
    </header>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 highlight-grid">
      {#each categories as category, index}
        <div class="animate-reveal highlight-item" style="--delay: {index + 1}; --index: {index}">
          <a
            href="/category/{category.slug}"
            class="category-card group block relative p-8 min-h-[160px] overflow-hidden"
          >
            <div class="relative z-10 space-y-4">
              <h2 class="category-title">
                {category.name}
              </h2>

              <div class="flex items-center justify-between">
                <div class="category-count">
                  {category.count}
                  {category.count === 1 ? 'article' : 'articles'}
                </div>

                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" class="category-arrow">
                  <path
                    d="M10.6696 6.276L4.93156 12.014L3.98889 11.0713L9.72622 5.33333H4.66956V4H12.0029V11.3333H10.6696V6.276Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
            </div>

            <div class="category-overlay"></div>
          </a>
        </div>
      {/each}
    </div>

    {#if categories.length === 0}
      <div class="text-center py-16">
        <p class="text-tertiary text-body-lg">No categories available yet.</p>
      </div>
    {/if}
  </div>
</section>

<style>
  .io-catalog-collection {
    border-top: 1px solid var(--color-performance-border-default);
  }

  .collection-heading {
    display: grid;
    gap: 0.35rem;
    margin-bottom: var(--space-performance-lg);
  }

  .collection-heading p,
  .collection-heading h2 {
    margin: 0;
  }

  .collection-heading p {
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

  .category-card {
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-lg);
    transition: border-color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .category-card:hover {
    border-color: var(--color-performance-border-strong);
  }

  .category-title {
    font-size: var(--text-performance-h2);
    font-weight: 600;
    color: var(--color-performance-fg-primary);
    transition: color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .group:hover .category-title {
    color: var(--color-performance-fg-secondary);
  }

  .category-count {
    font-size: var(--text-performance-body);
    font-weight: 500;
    color: var(--color-performance-fg-tertiary);
    transition: color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .group:hover .category-count {
    color: var(--color-performance-fg-secondary);
  }

  .category-arrow {
    color: var(--color-performance-fg-tertiary);
    transition: all var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .group:hover .category-arrow {
    color: var(--color-performance-fg-secondary);
    transform: translateX(4px);
  }

  .category-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom right, var(--color-performance-hover), transparent);
    opacity: 0;
    transition: opacity var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .group:hover .category-overlay {
    opacity: 1;
  }

  .animate-reveal {
    opacity: 0;
    transform: translateY(20px);
    animation: reveal var(--duration-performance-complex) var(--ease-performance-standard) forwards;
    animation-delay: calc(var(--delay, 0) * var(--cascade-performance-group));
  }

  @keyframes reveal {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-reveal {
      animation: none;
      opacity: 1;
      transform: none;
    }
  }
</style>
