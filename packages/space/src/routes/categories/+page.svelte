<script lang="ts">
  import { Footer } from '@create-something/components';
  import type { PageData } from './$types';

  export let data: PageData;
  const { categories } = data;

  const quickLinks = [
    { label: 'Home', href: '/' },
    { label: 'Experiments', href: '/experiments' },
    { label: 'Methodology', href: '/methodology' }
  ];
</script>

<svelte:head>
  <title>Browse by Category | CREATE SOMETHING SPACE</title>
  <meta name="description" content="Explore community experiments organized by topic" />
  <link rel="canonical" href="https://createsomething.space/categories" />
</svelte:head>

<!-- Hero Section -->
  <section class="relative pt-32 pb-16 px-6">
    <div class="max-w-7xl mx-auto">
      <div class="text-center space-y-4 animate-reveal">
        <h1 class="hero-title">
          Browse by Category
        </h1>
        <p class="subtitle">
          Explore community experiments organized by topic
        </p>
      </div>
    </div>
  </section>

  <!-- Categories Grid -->
  <section class="py-16 px-6">
    <div class="max-w-5xl mx-auto">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each categories as category, index}
          <div class="animate-reveal" style="--delay: {index + 1}">
            <a
              href="/category/{category.slug}"
              class="category-card group block relative p-8 transition-all overflow-hidden min-h-[160px]"
            >
              <div class="relative z-10 space-y-4">
                <h3 class="category-title">
                  {category.name}
                </h3>

                <div class="flex items-center justify-between">
                  <div class="category-count font-medium">
                    {category.count} {category.count === 1 ? 'experiment' : 'experiments'}
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

              <div class="absolute inset-0 opacity-0 group-hover:opacity-100 category-hover-gradient" />
            </a>
          </div>
        {/each}
      </div>

      {#if categories.length === 0}
        <div class="text-center py-16">
          <p class="empty-text">No categories available yet.</p>
        </div>
      {/if}
    </div>
  </section>

  <Footer
    mode="space"
    showNewsletter={false}
    aboutText="Community playground for AI-native development experiments. Fork experiments, break things, learn in public."
    quickLinks={quickLinks}
    showSocial={true}
  />
<style>
  .hero-title {
    font-size: var(--text-h1);
    font-weight: 700;
    color: var(--color-fg-primary);
  }

  .subtitle {
    font-size: var(--text-body);
    color: var(--color-fg-secondary);
  }

  .category-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  .category-card:hover {
    border-color: var(--color-border-emphasis);
  }

  .category-title {
    font-size: var(--text-h3);
    font-weight: 600;
    color: var(--color-fg-primary);
  }

  .category-count {
    font-size: var(--text-body);
    color: var(--color-fg-secondary);
  }

  .category-arrow {
    color: var(--color-fg-secondary);
  }

  .category-hover-gradient {
    background: linear-gradient(to bottom right, var(--color-hover), transparent);
    transition: opacity var(--duration-micro) var(--ease-standard);
  }

  .empty-text {
    font-size: var(--text-body);
    color: var(--color-fg-secondary);
  }

  .animate-reveal {
    opacity: 0;
    transform: translateY(20px);
    animation: reveal var(--duration-complex) var(--ease-standard) forwards;
    animation-delay: calc(var(--delay, 0) * 100ms);
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
