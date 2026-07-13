<script lang="ts">
  import type { PageData } from './$types';

  export let data: PageData;
  const { categories } = data;

  const quickLinks = [
    { label: 'Home', href: '/' },
    { label: 'All Experiments', href: '/experiments' },
    { label: 'Methodology', href: '/methodology' },
    { label: 'About', href: '/about' }
  ];
</script>

<svelte:head>
  <title>Browse by Category | CREATE SOMETHING</title>
  <meta name="description" content="Explore our technical papers organized by topic" />
  <link rel="canonical" href="https://createsomething.io/categories" />
</svelte:head>


  <!-- Hero Section -->
  <section class="relative pt-32 pb-16 px-6">
    <div class="max-w-7xl mx-auto">
      <div class="text-center space-y-4 animate-reveal">
        <h1 class="page-title">
          Browse by Category
        </h1>
        <p class="text-tertiary text-body-lg">
          Explore our technical papers organized by topic
        </p>
      </div>
    </div>
  </section>

  <!-- Categories Grid -->
  <section class="py-16 px-6">
    <div class="max-w-5xl mx-auto">
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
                    {category.count} {category.count === 1 ? 'article' : 'articles'}
                  </div>

                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="none"
                    class="category-arrow"
                  >
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
  /* Page title - uses --text-performance-h1 for internal pages */
  .page-title {
    font-size: var(--text-performance-h1);
    font-weight: var(--font-performance-bold);
    color: var(--color-performance-fg-primary);
  }

  .text-tertiary {
    color: var(--color-performance-fg-tertiary);
  }

  .text-body-lg {
    font-size: var(--text-performance-body-lg);
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
