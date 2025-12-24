<script lang="ts">
  import ModuleCard from '$lib/components/ModuleCard.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let selectedCategory: string | null = $state(null);

  const filteredModules = $derived.by(() => {
    if (selectedCategory === null) {
      return data.modules;
    }
    return data.modules.filter((m) => m.category === selectedCategory);
  });
</script>

<svelte:head>
  <title>Learning Modules — CREATE SOMETHING Learn</title>
  <meta name="description" content="Discover and enable learning modules to deepen your mastery of the CREATE SOMETHING methodology." />
</svelte:head>

<div class="modules-page">
  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-content">
      <h1 class="page-title">Learning Modules</h1>
      <p class="page-subtitle">
        Specialized modules for deeper mastery. Enable the modules that match your learning goals, or explore paths to discover structured sequences.
      </p>
    </div>
  </section>

  <!-- Category Filter -->
  <section class="filters">
    <div class="category-chips">
      <button
        class="chip"
        class:active={selectedCategory === null}
        onclick={() => (selectedCategory = null)}
      >
        All ({data.modules.length})
      </button>
      {#each data.categories as category}
        {@const count = data.modules.filter((m) => m.category === category).length}
        <button
          class="chip"
          class:active={selectedCategory === category}
          onclick={() => (selectedCategory = category)}
        >
          {category} ({count})
        </button>
      {/each}
    </div>
  </section>

  <!-- Modules Grid -->
  <section class="modules-grid">
    {#if filteredModules.length > 0}
      <div class="grid">
        {#each filteredModules as module, index}
          <div style="--stagger-delay: {index * 100}ms">
            <ModuleCard {module} />
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <p>No modules in this category yet.</p>
      </div>
    {/if}
  </section>
</div>

<style>
  .modules-page {
    width: 100%;
    max-width: 100%;
  }

  /* Hero Section */
  .hero {
    padding: var(--space-2xl) var(--space-lg);
    text-align: center;
  }

  @media (max-width: 768px) {
    .hero {
      padding: var(--space-xl) var(--space-sm);
    }
  }

  .hero-content {
    max-width: 800px;
    margin: 0 auto;
  }

  .page-title {
    font-size: var(--text-display);
    font-weight: 700;
    color: var(--color-fg-primary);
    margin: 0 0 var(--space-md) 0;
    line-height: 1.2;
  }

  .page-subtitle {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    margin: 0;
    line-height: 1.6;
  }

  /* Filters */
  .filters {
    padding: var(--space-lg);
    border-bottom: 1px solid var(--color-border-default);
  }

  .category-chips {
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
    justify-content: center;
    max-width: 1200px;
    margin: 0 auto;
  }

  .chip {
    padding: 0.5rem 1rem;
    border-radius: var(--radius-full);
    border: 1px solid var(--color-border-default);
    background: transparent;
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    font-weight: 500;
    cursor: pointer;
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .chip:hover {
    border-color: var(--color-border-emphasis);
    color: var(--color-fg-primary);
  }

  .chip.active {
    border-color: var(--color-border-emphasis);
    background: var(--color-bg-subtle);
    color: var(--color-fg-primary);
  }

  /* Grid */
  .modules-grid {
    padding: var(--space-2xl) var(--space-lg);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--space-lg);
    max-width: 1400px;
    margin: 0 auto;
  }

  @media (max-width: 1024px) {
    .grid {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: var(--space-md);
    }
  }

  @media (max-width: 640px) {
    .grid {
      grid-template-columns: 1fr;
      gap: var(--space-md);
    }
  }

  /* Staggered entrance animation */
  div {
    animation: slideInUp var(--duration-complex) var(--ease-standard)
      calc(var(--stagger-delay, 0ms)) both;
  }

  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    div {
      animation: none;
      opacity: 1;
    }
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: var(--space-2xl) var(--space-lg);
    color: var(--color-fg-muted);
  }

  .empty-state p {
    margin: 0;
    font-size: var(--text-body);
  }
</style>
