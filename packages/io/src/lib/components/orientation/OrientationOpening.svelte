<script lang="ts">
  type OrientationId = 'about' | 'contact' | 'docs' | 'methodology';
  type SummaryItem = { label: string; value: string };

  let {
    active,
    title,
    description,
    eyebrow = 'CREATE SOMETHING IO',
    summary = []
  }: {
    active: OrientationId;
    title: string;
    description: string;
    eyebrow?: string;
    summary?: SummaryItem[];
  } = $props();

  const destinations: Array<{ id: OrientationId; label: string; href: string }> = [
    { id: 'about', label: 'About', href: '/about' },
    { id: 'methodology', label: 'Method', href: '/methodology' },
    { id: 'docs', label: 'Documentation', href: '/docs' },
    { id: 'contact', label: 'Contact', href: '/contact' }
  ];
</script>

<section class="orientation-opening" aria-labelledby="orientation-title">
  <div class="orientation-opening__inner">
    <header>
      <p>{eyebrow}</p>
      <h1 id="orientation-title">{title}</h1>
      <div class="orientation-rule" aria-hidden="true"></div>
      <p class="orientation-description">{description}</p>
    </header>

    {#if summary.length > 0}
      <dl>
        {#each summary as item}
          <div>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        {/each}
      </dl>
    {/if}

    <nav aria-label="IO orientation">
      {#each destinations as destination}
        <a
          href={destination.href}
          aria-current={destination.id === active ? 'page' : undefined}
          class:active={destination.id === active}>{destination.label}</a
        >
      {/each}
    </nav>
  </div>
</section>

<style>
  .orientation-opening {
    padding: clamp(3rem, 7vw, 5rem) 1.5rem clamp(1.75rem, 4vw, 3rem);
  }

  .orientation-opening__inner {
    display: grid;
    width: min(72rem, 100%);
    margin-inline: auto;
    gap: clamp(1.25rem, 3vw, 2.25rem);
  }

  header {
    display: grid;
    max-width: 58rem;
    gap: 0.75rem;
  }

  header > p:first-child {
    margin: 0;
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    font-weight: var(--font-performance-semibold);
    text-transform: uppercase;
  }

  h1 {
    max-width: 15ch;
    margin: 0;
    color: var(--color-performance-fg-primary);
    font-size: var(--text-performance-h1);
    font-weight: var(--font-performance-bold);
    line-height: 1;
  }

  .orientation-rule {
    width: min(9rem, 35vw);
    height: 0.25rem;
    background: var(--color-performance-fg-primary);
  }

  .orientation-description {
    max-width: 48rem;
    margin: 0;
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-lg);
    line-height: var(--leading-performance-relaxed);
  }

  dl {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    max-width: 58rem;
    margin: 0;
    border-block: 1px solid var(--color-performance-border-default);
  }

  dl div {
    display: grid;
    gap: 0.3rem;
    padding: 1rem 1rem 1rem 0;
  }

  dt {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  dd {
    margin: 0;
    color: var(--color-performance-fg-primary);
    font-size: var(--text-performance-body-sm);
    font-weight: var(--font-performance-semibold);
  }

  nav {
    display: flex;
    max-width: 100%;
    gap: 0.5rem;
    overflow-x: auto;
    scrollbar-width: thin;
    scroll-snap-type: x proximity;
    overscroll-behavior-inline: contain;
  }

  nav a {
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

  nav a:hover,
  nav a.active {
    border-color: var(--color-performance-border-strong);
    background: var(--color-performance-fg-primary);
    color: var(--color-performance-bg-pure, #ffffff);
  }

  @media (max-width: 640px) {
    .orientation-opening {
      padding-block: 2.5rem 1.75rem;
      padding-inline: 1.25rem;
    }

    dl div {
      padding-right: 0.45rem;
    }

    dd {
      overflow-wrap: anywhere;
    }
  }
</style>
