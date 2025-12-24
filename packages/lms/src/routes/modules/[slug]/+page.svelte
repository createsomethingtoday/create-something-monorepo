<script lang="ts">
  import ModuleCard from '$lib/components/ModuleCard.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const { module, relatedModules } = data;

  let enabled = $state(false);
  let copied = $state(false);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }

  async function toggleModule(enable: boolean) {
    // TODO: Implement module enable/disable via API
    // For now, just update local state
    enabled = enable;
  }
</script>

<svelte:head>
  <title>{module.name} — CREATE SOMETHING Learn</title>
  <meta name="description" content={module.description} />
  <meta property="og:title" content={module.name} />
  <meta property="og:description" content={module.description} />
  <meta property="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="module-detail">
  <!-- Back Link -->
  <nav class="breadcrumb">
    <a href="/modules">← Back to Modules</a>
  </nav>

  <!-- Module Header -->
  <header class="module-header" style="--stagger-delay: 0ms">
    <div class="header-badges">
      <span class="category-badge">{module.category}</span>
      {#if module.version}
        <span class="version-badge">v{module.version}</span>
      {/if}
      {#if module.difficulty}
        <span class="difficulty-badge difficulty-{module.difficulty}">
          {module.difficulty}
        </span>
      {/if}
    </div>

    <h1 class="module-title">{module.name}</h1>
    <p class="module-subtitle">{module.description}</p>

    {#if module.tags}
      <div class="tags">
        {#each module.tags as tag}
          <span class="tag">{tag}</span>
        {/each}
      </div>
    {/if}

    <div class="module-meta-info">
      {#if module.duration}
        <span class="meta-item">⏱ {module.duration}</span>
      {/if}
      {#if module.lastUpdated}
        <span class="meta-item">
          📅 Updated {new Date(module.lastUpdated).toLocaleDateString()}
        </span>
      {/if}
    </div>
  </header>

  <div class="module-content">
    <!-- Features Section -->
    {#if module.features && module.features.length > 0}
      <section class="features-section" style="--stagger-delay: 100ms">
        <h2>What You'll Learn</h2>
        <ul class="features-list">
          {#each module.features as feature}
            <li>{feature}</li>
          {/each}
        </ul>
      </section>
    {/if}

    <!-- Examples Section -->
    {#if module.examples && module.examples.length > 0}
      <section class="examples-section" style="--stagger-delay: 200ms">
        <h2>Lesson Highlights</h2>
        <div class="examples-list">
          {#each module.examples as example}
            <div class="example-item">
              <h3>{example.title}</h3>
              <p>{example.description}</p>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Enable Module Section -->
    <section class="enable-section" style="--stagger-delay: 300ms">
      <h2>Start Learning</h2>
      <div class="enable-card">
        <p>
          {#if enabled}
            This module is enabled. Access it from your learning dashboard.
          {:else}
            Enable this module to start learning. It will appear in your active modules.
          {/if}
        </p>
        <button
          class="enable-button"
          class:enabled
          onclick={() => toggleModule(!enabled)}
        >
          {enabled ? 'Disable Module' : 'Enable Module'}
        </button>
      </div>
    </section>

    <!-- Related Modules Section -->
    {#if relatedModules && relatedModules.length > 0}
      <section class="related-section" style="--stagger-delay: 400ms">
        <h2>Related Modules</h2>
        <div class="related-grid">
          {#each relatedModules as relatedModule}
            <ModuleCard module={relatedModule} />
          {/each}
        </div>
      </section>
    {/if}
  </div>
</div>

<style>
  .module-detail {
    max-width: 900px;
    margin: 0 auto;
    padding: var(--space-lg);
  }

  /* Breadcrumb */
  .breadcrumb {
    margin-bottom: var(--space-lg);
  }

  .breadcrumb a {
    color: var(--color-fg-secondary);
    text-decoration: none;
    font-size: var(--text-body);
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .breadcrumb a:hover {
    color: var(--color-fg-primary);
  }

  /* Header */
  .module-header {
    margin-bottom: var(--space-2xl);
    animation: slideInUp var(--duration-complex) var(--ease-standard)
      calc(var(--stagger-delay, 0ms)) both;
  }

  .header-badges {
    display: flex;
    gap: var(--space-xs);
    margin-bottom: var(--space-md);
    flex-wrap: wrap;
    align-items: center;
  }

  .category-badge {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 600;
  }

  .version-badge,
  .difficulty-badge {
    font-size: var(--text-body-sm);
    padding: 0.25rem 0.75rem;
    border-radius: var(--radius-sm);
    font-weight: 500;
  }

  .version-badge {
    background: var(--color-bg-subtle);
    color: var(--color-fg-tertiary);
  }

  .difficulty-beginner {
    background: rgba(68, 170, 68, 0.1);
    color: var(--color-success);
  }

  .difficulty-intermediate {
    background: rgba(80, 130, 185, 0.1);
    color: var(--color-info);
  }

  .difficulty-advanced {
    background: rgba(212, 77, 77, 0.1);
    color: var(--color-error);
  }

  .module-title {
    font-size: var(--text-display);
    font-weight: 700;
    color: var(--color-fg-primary);
    margin: 0 0 var(--space-md) 0;
    line-height: 1.2;
  }

  .module-subtitle {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    margin: 0 0 var(--space-lg) 0;
    line-height: 1.6;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    margin-bottom: var(--space-lg);
  }

  .tag {
    display: inline-block;
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    background: var(--color-bg-subtle);
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    text-transform: lowercase;
  }

  .module-meta-info {
    display: flex;
    gap: var(--space-md);
    flex-wrap: wrap;
  }

  .meta-item {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  /* Content Sections */
  .module-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xl);
  }

  section {
    animation: slideInUp var(--duration-complex) var(--ease-standard)
      calc(var(--stagger-delay, 0ms)) both;
  }

  @media (prefers-reduced-motion: reduce) {
    section {
      animation: none;
      opacity: 1;
    }
  }

  section h2 {
    font-size: var(--text-h2);
    font-weight: 700;
    color: var(--color-fg-primary);
    margin: 0 0 var(--space-lg) 0;
  }

  /* Features Section */
  .features-section {
  }

  .features-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .features-list li {
    display: flex;
    gap: var(--space-sm);
    padding: var(--space-md);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-lg);
    color: var(--color-fg-secondary);
    font-size: var(--text-body);
    line-height: 1.5;
  }

  .features-list li::before {
    content: '✓';
    color: var(--color-success);
    font-weight: bold;
    flex-shrink: 0;
  }

  /* Examples Section */
  .examples-section {
  }

  .examples-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space-lg);
  }

  .example-item {
    padding: var(--space-md);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .example-item:hover {
    border-color: var(--color-border-emphasis);
    background: var(--color-bg-subtle);
  }

  .example-item h3 {
    font-size: var(--text-body-lg);
    font-weight: 600;
    color: var(--color-fg-primary);
    margin: 0 0 var(--space-xs) 0;
  }

  .example-item p {
    font-size: var(--text-body);
    color: var(--color-fg-secondary);
    margin: 0;
    line-height: 1.5;
  }

  /* Enable Section */
  .enable-section {
  }

  .enable-card {
    padding: var(--space-lg);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    align-items: flex-start;
  }

  .enable-card p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: var(--text-body);
    line-height: 1.5;
  }

  .enable-button {
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-subtle);
    color: var(--color-fg-primary);
    font-size: var(--text-body);
    font-weight: 600;
    cursor: pointer;
    transition: all var(--duration-micro) var(--ease-standard);
  }

  .enable-button:hover {
    border-color: var(--color-border-emphasis);
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
  }

  .enable-button.enabled {
    background: var(--color-success);
    border-color: var(--color-success);
    color: var(--color-bg-pure);
  }

  .enable-button.enabled:hover {
    background: rgba(68, 170, 68, 0.8);
  }

  /* Related Modules Section */
  .related-section {
  }

  .related-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-lg);
  }

  @media (max-width: 768px) {
    .module-detail {
      padding: var(--space-md);
    }

    .module-title {
      font-size: var(--text-h1);
    }

    .module-subtitle {
      font-size: var(--text-body);
    }

    .related-grid {
      grid-template-columns: 1fr;
    }
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
</style>
