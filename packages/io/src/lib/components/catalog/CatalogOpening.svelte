<script lang="ts">
  type CatalogId = 'agents' | 'categories' | 'experiments' | 'mcp' | 'papers' | 'plugins';
  type SummaryItem = { label: string; value: string };

  let {
    active,
    title,
    description,
    eyebrow = 'Research library',
    summary = []
  }: {
    active: CatalogId;
    title: string;
    description: string;
    eyebrow?: string;
    summary?: SummaryItem[];
  } = $props();

  const catalogs: Array<{ id: CatalogId; label: string; href: string }> = [
    { id: 'papers', label: 'Papers', href: '/papers' },
    { id: 'experiments', label: 'Experiments', href: '/experiments' },
    { id: 'categories', label: 'Topics', href: '/categories' },
    { id: 'agents', label: 'Agents', href: '/agents' },
    { id: 'mcp', label: 'MCP', href: '/mcp' },
    { id: 'plugins', label: 'Plugins', href: '/plugins' }
  ];
</script>

<section class="catalog-opening" aria-labelledby={`${active}-catalog-title`}>
  <div class="catalog-opening-inner">
    <header>
      <p class="catalog-eyebrow">{eyebrow}</p>
      <h1 id={`${active}-catalog-title`}>{title}</h1>
      <p class="catalog-description">{description}</p>
    </header>

    {#if summary.length > 0}
      <dl class="catalog-summary">
        {#each summary as item}
          <div>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        {/each}
      </dl>
    {/if}

    <nav class="catalog-family" aria-label="Research catalogs">
      {#each catalogs as catalog}
        <a
          href={catalog.href}
          aria-current={catalog.id === active ? 'page' : undefined}
          class:active={catalog.id === active}>{catalog.label}</a
        >
      {/each}
    </nav>
  </div>
</section>

<style>
  .catalog-opening {
    padding: clamp(3rem, 6vw, 4.5rem) 1.5rem clamp(1.5rem, 3vw, 2.5rem);
  }

  .catalog-opening-inner {
    display: grid;
    width: min(72rem, 100%);
    margin-inline: auto;
    gap: clamp(1.25rem, 2.5vw, 2rem);
  }

  header {
    display: grid;
    max-width: 52rem;
    gap: 0.75rem;
  }

  .catalog-eyebrow {
    width: fit-content;
    margin: 0;
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-sm);
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    font-weight: var(--font-performance-semibold);
    line-height: 1.15;
    text-transform: uppercase;
  }

  h1 {
    max-width: 14ch;
    margin: 0;
    color: var(--color-performance-fg-primary);
    font-size: var(--text-performance-h1);
    font-weight: var(--font-performance-bold);
    line-height: 1;
  }

  .catalog-description {
    max-width: 46rem;
    margin: 0;
    color: var(--color-performance-fg-tertiary);
    font-size: var(--text-performance-body-lg);
    line-height: var(--leading-performance-relaxed);
  }

  .catalog-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    max-width: 52rem;
    margin: 0;
    border-block: 1px solid var(--color-performance-border-default);
  }

  .catalog-summary div {
    display: grid;
    gap: 0.35rem;
    padding: 1rem 1.25rem 1rem 0;
  }

  .catalog-summary dt {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  .catalog-summary dd {
    margin: 0;
    color: var(--color-performance-fg-primary);
    font-size: var(--text-performance-body);
    font-weight: var(--font-performance-semibold);
  }

  .catalog-family {
    display: flex;
    max-width: 100%;
    gap: 0.5rem;
    overflow-x: auto;
    scrollbar-width: thin;
    scroll-snap-type: x proximity;
    overscroll-behavior-inline: contain;
  }

  .catalog-family a {
    flex: 0 0 auto;
    padding: 0.65rem 0.85rem;
    border: 1px solid var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-sm);
    background: var(--color-performance-bg-surface);
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-sm);
    font-weight: var(--font-performance-medium);
    scroll-snap-align: start;
  }

  .catalog-family a:hover,
  .catalog-family a.active {
    border-color: var(--color-performance-border-strong);
    background: var(--color-performance-fg-primary);
    color: var(--color-performance-bg-pure, #ffffff);
  }

  @media (max-width: 640px) {
    .catalog-opening {
      padding-block: 2.5rem 1.75rem;
      padding-inline: 1.25rem;
    }

    .catalog-summary {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .catalog-summary div {
      padding: 0.75rem 0.45rem 0.75rem 0;
    }

    .catalog-summary dd {
      font-size: var(--text-performance-body-sm);
      overflow-wrap: anywhere;
    }
  }
</style>
