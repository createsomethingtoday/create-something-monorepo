<script lang="ts">
  import { PluginCard } from '@create-something/canon/domains/io';
  import CatalogOpening from '$lib/components/catalog/CatalogOpening.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let { plugins, categories } = $derived(data);

  let selectedCategory = $state<string | null>(null);
  let copiedMarketplace = $state(false);
  let copiedInstallAll = $state(false);

  const filteredPlugins = $derived.by(() => {
    if (!selectedCategory) return plugins;
    return plugins.filter((p) => p.category === selectedCategory);
  });

  const marketplaceCommand = '/plugin marketplace add createsomethingtoday/claude-plugins';
  const installAllCommand = $derived(
    plugins.map((p) => `/plugin install ${p.slug}@create-something`).join(' && ')
  );

  async function copyMarketplace() {
    try {
      await navigator.clipboard.writeText(marketplaceCommand);
      copiedMarketplace = true;
      setTimeout(() => (copiedMarketplace = false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  async function copyInstallAll() {
    try {
      await navigator.clipboard.writeText(installAllCommand);
      copiedInstallAll = true;
      setTimeout(() => (copiedInstallAll = false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
</script>

<svelte:head>
  <title>Claude Code Plugins | CREATE SOMETHING</title>
  <meta
    name="description"
    content="Free Claude Code plugins for subtractive design methodology. Implement DRY, Dieter Rams, and Heideggerian principles in your AI-native development workflow."
  />
  <meta
    name="keywords"
    content="Claude Code plugins, AI development tools, subtractive design, DRY principle, Dieter Rams, code quality, Claude AI"
  />
  <link rel="canonical" href="https://createsomething.io/plugins" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://createsomething.io/plugins" />
  <meta property="og:title" content="Claude Code Plugins | CREATE SOMETHING" />
  <meta
    property="og:description"
    content="Free Claude Code plugins for subtractive design methodology. DRY → Rams → Heidegger."
  />
  <meta property="og:image" content="https://createsomething.io/og-image.png" />
  <meta property="og:site_name" content="CREATE SOMETHING" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="https://createsomething.io/plugins" />
  <meta name="twitter:title" content="Claude Code Plugins | CREATE SOMETHING" />
  <meta
    name="twitter:description"
    content="Free Claude Code plugins for subtractive design methodology."
  />
  <meta name="twitter:image" content="https://createsomething.io/og-image.png" />

  <!-- JSON-LD: ItemList for AEO (helps AI assistants list plugins) -->
  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Claude Code Plugins by CREATE SOMETHING',
    description: 'Free plugins for Claude Code implementing subtractive design methodology',
    url: 'https://createsomething.io/plugins',
    numberOfItems: plugins.length,
    itemListElement: plugins.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'SoftwareApplication',
        name: p.name,
        description: p.description,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any',
        url: 'https://createsomething.io/plugins/' + p.slug,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
      }
    }))
  })}<\/script>`}

  <!-- JSON-LD: BreadcrumbList -->
  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://createsomething.io' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Plugins',
        item: 'https://createsomething.io/plugins'
      }
    ]
  })}<\/script>`}

  <!-- JSON-LD: FAQPage for AEO -->
  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How do I install Claude Code plugins from CREATE SOMETHING?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'First, add the marketplace with: /plugin marketplace add createsomethingtoday/claude-plugins. Then install any plugin with: /plugin install [plugin-name]@create-something'
        }
      },
      {
        '@type': 'Question',
        name: 'What is the Subtractive Triad methodology?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The Subtractive Triad has three levels. DRY eliminates duplication, Rams eliminates excess, and Heidegger eliminates disconnection through understanding.'
        }
      },
      {
        '@type': 'Question',
        name: 'Are these Claude Code plugins free?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, all CREATE SOMETHING Claude Code plugins are free and open source.'
        }
      }
    ]
  })}<\/script>`}
</svelte:head>

<CatalogOpening
  active="plugins"
  title="Claude Code Plugins"
  description="Choose a free subtractive-design plugin for the code-quality decision you need to make, then install it from the shared marketplace."
/>

<section class="io-catalog-collection" aria-labelledby="plugin-collection-title">
  <div class="max-w-6xl mx-auto">
    <header class="collection-heading">
      <div>
        <p>Install or inspect</p>
        <h2 id="plugin-collection-title">Plugins</h2>
      </div>
      <span>{filteredPlugins.length} of {plugins.length} shown</span>
    </header>

    <!-- Quick Start -->
    <div class="quick-start">
      <h2 class="quick-start-title">Quick Start</h2>
      <div class="quick-start-steps">
        <div class="quick-start-step">
          <span class="step-label">1. Add marketplace</span>
          <div class="command-box">
            <code class="command-text">{marketplaceCommand}</code>
            <button
              class="copy-button"
              onclick={copyMarketplace}
              aria-label={copiedMarketplace
                ? 'Marketplace command copied'
                : 'Copy marketplace command'}
            >
              {#if copiedMarketplace}
                <span class="copy-success" aria-live="polite">✓</span>
              {:else}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              {/if}
            </button>
          </div>
        </div>
        <div class="quick-start-step">
          <span class="step-label">2. Install all plugins</span>
          <div class="command-box install-all">
            <code class="command-text">{installAllCommand}</code>
            <button
              class="copy-button"
              onclick={copyInstallAll}
              aria-label={copiedInstallAll ? 'Install command copied' : 'Copy install all command'}
            >
              {#if copiedInstallAll}
                <span class="copy-success" aria-live="polite">✓</span>
              {:else}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              {/if}
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="flex flex-wrap gap-3 category-filters">
      <button
        class="category-chip"
        class:active={selectedCategory === null}
        aria-pressed={selectedCategory === null}
        onclick={() => (selectedCategory = null)}
      >
        All ({plugins.length})
      </button>
      {#each categories as category}
        <button
          class="category-chip"
          class:active={selectedCategory === category}
          aria-pressed={selectedCategory === category}
          onclick={() => (selectedCategory = category)}
        >
          {category} ({plugins.filter((p) => p.category === category).length})
        </button>
      {/each}
    </div>

    {#if filteredPlugins.length > 0}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each filteredPlugins as plugin, index}
          <div class="animate-reveal" style="--delay: {index + 1}">
            <PluginCard {plugin} />
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-center py-16">
        <p class="text-fg-secondary text-body-lg">
          No plugins found in {selectedCategory} category.
        </p>
      </div>
    {/if}
  </div>
</section>

<style>
  .io-catalog-collection {
    padding: clamp(2rem, 5vw, 4rem) 1.5rem clamp(4rem, 8vw, 6rem);
    border-top: 1px solid var(--color-performance-border-default);
  }

  .io-catalog-collection > div {
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

  .category-filters {
    padding-block: var(--space-performance-sm);
    border-block: 1px solid var(--color-performance-border-default);
  }

  .quick-start {
    background: var(--color-performance-bg-surface);
    border-radius: var(--radius-performance-scale-lg);
    padding: var(--space-performance-md);
  }

  .quick-start-title {
    font-size: var(--text-performance-body);
    font-weight: 600;
    color: var(--color-performance-fg-primary);
    margin: 0 0 var(--space-performance-sm) 0;
  }

  .quick-start-steps {
    display: flex;
    flex-direction: column;
    gap: var(--space-performance-sm);
  }

  .quick-start-step {
    display: flex;
    flex-direction: column;
    gap: var(--space-performance-xs);
  }

  .step-label {
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-secondary);
    font-weight: 500;
  }

  .install-all .command-text {
    font-size: var(--text-performance-caption);
    word-break: break-all;
  }

  .command-box {
    display: flex;
    align-items: center;
    gap: var(--space-performance-sm);
    background: var(--color-performance-bg-subtle);
    border-radius: var(--radius-performance-scale-md);
    padding: var(--space-performance-sm) var(--space-performance-md);
  }

  .command-text {
    flex: 1;
    min-width: 0;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: var(--text-performance-body-sm);
    color: var(--color-performance-fg-primary);
    background: none;
    padding: 0;
  }

  .copy-button {
    background: none;
    border: none;
    color: var(--color-performance-fg-secondary);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .copy-button:hover {
    color: var(--color-performance-fg-primary);
  }

  .copy-success {
    color: var(--color-performance-success);
    font-weight: 600;
  }

  .category-chip {
    padding: var(--space-performance-xs) var(--space-performance-sm);
    background: var(--color-performance-bg-subtle);
    border-radius: var(--radius-performance-scale-full);
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-sm);
    cursor: pointer;
    transition: all var(--duration-performance-micro) var(--ease-performance-standard);
  }

  .category-chip:hover {
    border-color: var(--color-performance-border-emphasis);
    color: var(--color-performance-fg-primary);
  }

  .category-chip.active {
    background: var(--color-performance-bg-surface);
    border-color: var(--color-performance-border-strong);
    color: var(--color-performance-fg-primary);
  }

  .text-fg-secondary {
    color: var(--color-performance-fg-secondary);
  }

  .text-body-lg {
    font-size: var(--text-performance-body-lg);
  }

  .animate-reveal {
    opacity: 0;
    transform: translateY(20px);
    animation: reveal var(--duration-performance-complex) var(--ease-performance-standard) forwards;
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

  @media (max-width: 640px) {
    .io-catalog-collection {
      padding-inline: 1.25rem;
    }

    .collection-heading {
      align-items: flex-start;
      flex-direction: column;
    }

    .command-text {
      overflow-wrap: anywhere;
    }
  }
</style>
