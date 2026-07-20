<script lang="ts">
  import CatalogCopyField from '$lib/components/catalog/CatalogCopyField.svelte';
  import CatalogDetailOpening from '$lib/components/catalog/CatalogDetailOpening.svelte';
  import { getRelatedPlugins } from '$lib/config/plugins';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  let { plugin } = $derived(data);
  let relatedPlugins = $derived.by(() => getRelatedPlugins(plugin.slug));

  const url = $derived(`https://createsomething.io/plugins/${plugin.slug}`);
  const marketplaceCommand = '/plugin marketplace add createsomethingtoday/claude-plugins';
  const installCommand = $derived(`/plugin install ${plugin.slug}@create-something`);

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  }
</script>

<svelte:head>
  <title>{plugin.name} | Plugins | CREATE SOMETHING</title>
  <meta name="description" content={plugin.description} />
  <meta name="keywords" content="{plugin.tags.join(', ')}, plugin, Claude Code" />

  <meta property="og:type" content="article" />
  <meta property="og:url" content={url} />
  <meta property="og:title" content="{plugin.name} | CREATE SOMETHING" />
  <meta property="og:description" content={plugin.description} />
  <meta property="og:image" content="https://createsomething.io/og-image.png" />
  <meta property="og:site_name" content="CREATE SOMETHING" />

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

<CatalogDetailOpening
  backHref="/plugins"
  backLabel="plugin catalog"
  eyebrow="Claude Code plugin"
  title={plugin.name}
  description={plugin.description}
  badges={[plugin.category, ...plugin.tags]}
  summary={[
    { label: 'Version', value: plugin.version ?? 'Current' },
    { label: 'Updated', value: plugin.lastUpdated ? formatDate(plugin.lastUpdated) : 'Not listed' },
    { label: 'Features', value: String(plugin.features.length) },
    { label: 'Examples', value: String(plugin.examples?.length ?? 0) }
  ]}
  action={{ href: '#install', label: 'Go to installation' }}
/>

<section class="catalog-detail-chapter" aria-labelledby="capability-title">
  <div class="catalog-detail-chapter__inner">
    <header class="chapter-heading">
      <p>01 / Fit</p>
      <h2 id="capability-title">See what changes in your work</h2>
      <span>Match the outcomes to the command, agent, skill, or hook the plugin adds.</span>
    </header>

    <div class="capability-grid">
      <article>
        <h3>Outcomes</h3>
        <ul class="feature-list">
          {#each plugin.features as feature}
            <li>{feature}</li>
          {/each}
        </ul>
      </article>

      {#if plugin.provides}
        <article>
          <h3>What the plugin adds</h3>
          <div class="provided-groups">
            {#if plugin.provides.commands?.length}
              <div>
                <h4>Commands</h4>
                {#each plugin.provides.commands as command}
                  <p><code>{command.name}</code><span>{command.description}</span></p>
                {/each}
              </div>
            {/if}
            {#if plugin.provides.agents?.length}
              <div>
                <h4>Agents</h4>
                {#each plugin.provides.agents as agent}
                  <p><code>{agent.name}</code><span>{agent.description}</span></p>
                {/each}
              </div>
            {/if}
            {#if plugin.provides.skills?.length}
              <div>
                <h4>Skills</h4>
                {#each plugin.provides.skills as skill}
                  <p><code>{skill.name}</code><span>{skill.description}</span></p>
                {/each}
              </div>
            {/if}
            {#if plugin.provides.hooks?.length}
              <div>
                <h4>Hooks</h4>
                {#each plugin.provides.hooks as hook}
                  <p><code>{hook.name}</code><span>{hook.description}</span></p>
                {/each}
              </div>
            {/if}
          </div>
        </article>
      {/if}
    </div>
  </div>
</section>

<section id="install" class="catalog-detail-chapter" aria-labelledby="install-title">
  <div class="catalog-detail-chapter__inner">
    <header class="chapter-heading">
      <p>02 / Install</p>
      <h2 id="install-title">Install in Claude Code</h2>
      <span>Add the public marketplace once, then install this plugin.</span>
    </header>

    <ol class="install-steps">
      <li>
        <div>
          <strong>Add the marketplace</strong>
          <span>Skip this step if the CREATE SOMETHING marketplace is already configured.</span>
        </div>
        <CatalogCopyField
          value={marketplaceCommand}
          language="Claude Code command"
          label="Copy marketplace command"
        />
      </li>
      <li>
        <div>
          <strong>Install {plugin.name}</strong>
          <span>Run this command in the same Claude Code environment.</span>
        </div>
        <CatalogCopyField
          value={installCommand}
          language="Claude Code command"
          label={`Copy ${plugin.name} install command`}
        />
      </li>
    </ol>
  </div>
</section>

<section class="catalog-detail-chapter" aria-labelledby="try-title">
  <div class="catalog-detail-chapter__inner">
    <header class="chapter-heading">
      <p>03 / Continue</p>
      <h2 id="try-title">Try it, then continue</h2>
      <span>Start with one real task. Compare a related plugin only after you see the result.</span>
    </header>

    {#if plugin.examples?.length}
      <div class="example-list">
        {#each plugin.examples as example}
          <article>
            <p>{example.description}</p>
            <CatalogCopyField
              value={example.prompt}
              language="Starter prompt"
              label={`Copy prompt: ${example.description}`}
            />
          </article>
        {/each}
      </div>
    {/if}

    {#if relatedPlugins.length}
      <div class="related-block">
        <h3>Related plugins</h3>
        <div class="related-grid">
          {#each relatedPlugins as related}
            <a href="/plugins/{related.slug}">
              <span>{related.category}</span>
              <strong>{related.name}</strong>
              <p>{related.description}</p>
            </a>
          {/each}
        </div>
      </div>
    {/if}

    <a class="collection-handoff" href="/plugins">Compare the full plugin catalog</a>
  </div>
</section>

<style>
  .catalog-detail-chapter {
    padding: clamp(3rem, 6vw, 5rem) 1.5rem;
    border-top: 1px solid var(--color-performance-border-default);
  }

  .catalog-detail-chapter__inner {
    display: grid;
    width: min(64rem, 100%);
    margin-inline: auto;
    gap: var(--space-performance-lg);
  }

  .chapter-heading {
    display: grid;
    max-width: 46rem;
    gap: var(--space-performance-xs);
  }

  .chapter-heading p,
  .chapter-heading h2,
  .chapter-heading span {
    margin: 0;
  }

  .chapter-heading > p {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  .chapter-heading h2 {
    color: var(--color-performance-fg-primary);
    font-size: var(--text-performance-h2);
  }

  .chapter-heading span {
    color: var(--color-performance-fg-secondary);
    line-height: var(--leading-performance-relaxed);
  }

  .capability-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
    gap: var(--space-performance-md);
  }

  .capability-grid > article,
  .example-list article {
    min-width: 0;
    padding: var(--space-performance-lg);
    border: 1px solid var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-lg);
    background: var(--color-performance-bg-surface);
  }

  h3,
  h4,
  p,
  ul {
    margin-top: 0;
  }

  .feature-list {
    display: grid;
    gap: var(--space-performance-sm);
    padding-left: 1.2rem;
  }

  .feature-list li,
  .provided-groups span,
  .example-list p,
  .related-grid p,
  .install-steps span {
    color: var(--color-performance-fg-secondary);
    line-height: var(--leading-performance-relaxed);
  }

  .provided-groups {
    display: grid;
    gap: var(--space-performance-md);
  }

  .provided-groups h4 {
    margin-bottom: var(--space-performance-xs);
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  .provided-groups p {
    display: grid;
    gap: 0.25rem;
    margin-bottom: var(--space-performance-sm);
  }

  .provided-groups code {
    width: fit-content;
    color: var(--color-performance-fg-primary);
  }

  .install-steps {
    display: grid;
    margin: 0;
    padding: 0;
    counter-reset: install-step;
    gap: var(--space-performance-md);
    list-style: none;
  }

  .install-steps li {
    display: grid;
    grid-template-columns: minmax(12rem, 0.65fr) minmax(0, 1.35fr);
    align-items: start;
    gap: var(--space-performance-lg);
    padding: var(--space-performance-lg);
    border: 1px solid var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-lg);
    background: var(--color-performance-bg-surface);
    counter-increment: install-step;
  }

  .install-steps li > div:first-child {
    display: grid;
    gap: var(--space-performance-xs);
  }

  .install-steps strong::before {
    content: counter(install-step) '. ';
  }

  .example-list,
  .related-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-performance-md);
  }

  .example-list article {
    display: grid;
    gap: var(--space-performance-sm);
  }

  .example-list p {
    margin: 0;
  }

  .related-block {
    display: grid;
    gap: var(--space-performance-sm);
  }

  .related-grid a {
    display: grid;
    gap: var(--space-performance-xs);
    padding: var(--space-performance-md);
    border: 1px solid var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-sm);
    background: var(--color-performance-bg-surface);
    color: var(--color-performance-fg-primary);
    text-decoration: none;
  }

  .related-grid a:hover {
    border-color: var(--color-performance-border-strong);
  }

  .related-grid span {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  .related-grid p {
    margin: 0;
  }

  .collection-handoff {
    width: fit-content;
    font-weight: var(--font-performance-semibold);
    text-decoration: underline;
  }

  @media (max-width: 700px) {
    .catalog-detail-chapter {
      padding: 3rem 1.25rem;
    }

    .capability-grid,
    .install-steps li,
    .example-list,
    .related-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
