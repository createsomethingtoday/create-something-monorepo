<script lang="ts">
  import PluginToggle from '$lib/components/plugins/PluginToggle.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let { plugin, isAuthenticated, isEnabled } = $derived(data);

  const url = `https://createsomething.io/plugins/${plugin.slug}`;
</script>

<svelte:head>
  <title>{plugin.name} | Plugins | CREATE SOMETHING</title>
  <meta name="description" content={plugin.description} />
  <meta name="keywords" content="{plugin.tags.join(', ')}, plugin, Claude Code" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:url" content={url} />
  <meta property="og:title" content="{plugin.name} | CREATE SOMETHING" />
  <meta property="og:description" content={plugin.description} />
  <meta property="og:image" content="https://createsomething.io/og-image.png" />
  <meta property="og:site_name" content="CREATE SOMETHING" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content={url} />
  <meta name="twitter:title" content={plugin.name} />
  <meta name="twitter:description" content={plugin.description} />
  <meta name="twitter:image" content="https://createsomething.io/og-image.png" />

  <link rel="canonical" href={url} />

  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: plugin.name,
    description: plugin.description,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    publisher: {
      '@type': 'Organization',
      name: 'CREATE SOMETHING',
      url: 'https://createsomething.io'
    }
  })}<\/script>`}
</svelte:head>

<!-- Back Navigation -->
<section class="pt-24 px-6">
  <div class="max-w-4xl mx-auto">
    <a href="/plugins" class="back-link">
      ← Back to Plugins
    </a>
  </div>
</section>

<!-- Hero Section -->
<section class="pt-8 pb-16 px-6">
  <div class="max-w-4xl mx-auto">
    <div class="space-y-6 animate-reveal">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <div class="category-badge">{plugin.category}</div>
          <h1 class="plugin-title">{plugin.name}</h1>
          <p class="plugin-description">{plugin.description}</p>
        </div>
        <div class="toggle-container">
          <PluginToggle
            slug={plugin.slug}
            bind:enabled={isEnabled}
            {isAuthenticated}
          />
        </div>
      </div>

      <!-- Tags -->
      <div class="tags">
        {#each plugin.tags as tag}
          <span class="tag">{tag}</span>
        {/each}
      </div>
    </div>
  </div>
</section>

<!-- Features Section -->
<section class="py-16 px-6">
  <div class="max-w-4xl mx-auto">
    <div class="section-card animate-reveal" style="--delay: 1">
      <h2 class="section-title">Features</h2>
      <ul class="features-list">
        {#each plugin.features as feature}
          <li class="feature-item">{feature}</li>
        {/each}
      </ul>
    </div>
  </div>
</section>

<!-- Installation Section -->
<section class="py-16 px-6">
  <div class="max-w-4xl mx-auto">
    <div class="section-card animate-reveal" style="--delay: 2">
      <h2 class="section-title">Installation</h2>
      <div class="installation-steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3 class="step-title">Enable the Plugin</h3>
            <p class="step-description">
              Toggle the plugin on to add it to your configuration.
            </p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3 class="step-title">Export Settings</h3>
            <p class="step-description">
              Go to the <a href="/plugins" class="inline-link">plugins page</a> and click
              "Export Settings" to download your configuration.
            </p>
          </div>
        </div>

        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3 class="step-title">Add to Claude Code</h3>
            <p class="step-description">
              Copy the exported settings into your Claude Code <code>settings.json</code> file.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<style>
  /* Back Link */
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    color: var(--color-fg-secondary);
    font-size: var(--text-body);
    text-decoration: none;
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .back-link:hover {
    color: var(--color-fg-primary);
  }

  /* Hero */
  .category-badge {
    display: inline-block;
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
    font-weight: 500;
    margin-bottom: var(--space-sm);
  }

  .plugin-title {
    font-size: var(--text-display);
    font-weight: 700;
    color: var(--color-fg-primary);
    margin-bottom: var(--space-sm);
  }

  .plugin-description {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    line-height: 1.6;
  }

  .toggle-container {
    flex-shrink: 0;
  }

  /* Tags */
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  .tag {
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg-subtle);
    border-radius: var(--radius-sm);
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
  }

  /* Section Card */
  .section-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
  }

  .section-title {
    font-size: var(--text-h2);
    font-weight: 700;
    color: var(--color-fg-primary);
    margin-bottom: var(--space-md);
  }

  /* Features List */
  .features-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .feature-item {
    position: relative;
    padding-left: var(--space-lg);
    color: var(--color-fg-secondary);
    font-size: var(--text-body);
    line-height: 1.6;
  }

  .feature-item::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: var(--color-success);
    font-weight: 700;
  }

  /* Installation Steps */
  .installation-steps {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  .step {
    display: flex;
    gap: var(--space-md);
  }

  .step-number {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-subtle);
    border-radius: var(--radius-full);
    color: var(--color-fg-primary);
    font-weight: 700;
    font-size: var(--text-body);
  }

  .step-content {
    flex: 1;
  }

  .step-title {
    font-size: var(--text-body-lg);
    font-weight: 600;
    color: var(--color-fg-primary);
    margin-bottom: var(--space-xs);
  }

  .step-description {
    font-size: var(--text-body);
    color: var(--color-fg-secondary);
    line-height: 1.6;
  }

  .step-description code {
    padding: 2px 6px;
    background: var(--color-bg-subtle);
    border-radius: var(--radius-sm);
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
    font-size: var(--text-body-sm);
    color: var(--color-fg-primary);
  }

  .inline-link {
    color: var(--color-info);
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  .inline-link:hover {
    border-bottom-color: var(--color-info);
  }

  /* Animation */
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

  /* Responsive */
  @media (max-width: 768px) {
    .plugin-title {
      font-size: var(--text-h1);
    }

    .toggle-container {
      width: 100%;
    }

    .section-card {
      padding: var(--space-md);
    }
  }
</style>
