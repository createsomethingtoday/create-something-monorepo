<script lang="ts">
  import {
    PerformanceCardGrid,
    SEO,
    type PerformanceCardItem
  } from '@create-something/canon';

  const datasets: PerformanceCardItem[] = [
    {
      eyebrow: 'Live data',
      icon: 'settings',
      title: 'NBA Live',
      href: '/data/nba',
      detail:
        'Inspect live NBA games through play-by-play, box scores, shot networks, and pace analysis.',
      points: [
        'A Cloudflare Worker limits requests and caches results',
        'Saved snapshots make analysis repeatable',
        'Built for close inspection, not decoration'
      ]
    }
  ];
</script>

<SEO
  title="Data Studio"
  description="Live data dashboards with real-time updates. Explore NBA analytics, player synergies, and league insights."
  keywords="data studio, live dashboards, NBA analytics, real-time data, Cloudflare Workers"
  propertyName="space"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.space' },
    { name: 'Data Studio', url: 'https://createsomething.space/data' }
  ]}
/>

<main class="index-page">
  <section data-page-chapter="orientation" class="index-opening">
    <div class="container opening-inner">
      <p class="eyebrow">Data Studio · live and saved evidence</p>
      <h1>Choose a live dataset to inspect.</h1>
      <p class="opening-copy">
        Start with NBA Live. It combines current game data with saved snapshots, so you can compare
        findings without guessing whether the source changed.
      </p>
    </div>
  </section>

  <section
    data-page-chapter="collection"
    class="index-collection"
    aria-labelledby="data-collection-title"
  >
    <div class="container collection-inner">
      <header class="collection-heading">
        <p class="eyebrow">Available now</p>
        <h2 id="data-collection-title">Live datasets</h2>
        <p>Open the dataset to inspect its current state, historical snapshots, and derived views.</p>
      </header>
      <PerformanceCardGrid items={datasets} columns={1} ariaLabel="Available live data surfaces" />
    </div>
  </section>
</main>

<style>
  .index-page,
  .container,
  .collection-inner {
    min-width: 0;
    max-width: 100%;
  }

  .container {
    width: min(100%, 64rem);
    margin-inline: auto;
  }

  .index-opening {
    padding: clamp(6rem, 12vw, 9rem) var(--space-performance-md) clamp(2.5rem, 6vw, 4.5rem);
  }

  .opening-inner,
  .collection-heading {
    display: grid;
    gap: var(--space-performance-sm);
  }

  .eyebrow,
  .index-opening h1,
  .opening-copy,
  .collection-heading h2,
  .collection-heading p {
    margin: 0;
  }

  .eyebrow {
    color: var(--color-performance-fg-muted);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .index-opening h1 {
    max-width: 15ch;
    color: var(--color-performance-fg-primary);
    font-size: clamp(2.5rem, 7vw, var(--text-performance-h1));
    font-weight: var(--font-performance-bold);
    line-height: 1;
  }

  .opening-copy {
    max-width: 42rem;
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-lg);
    line-height: 1.6;
  }

  .index-collection {
    padding: clamp(2rem, 5vw, 4rem) var(--space-performance-md) clamp(4rem, 8vw, 7rem);
    border-top: 1px solid var(--color-performance-border-default);
  }

  .collection-inner {
    display: grid;
    gap: var(--space-performance-lg);
  }

  .collection-heading h2 {
    color: var(--color-performance-fg-primary);
    font-size: var(--text-performance-h2);
  }

  .collection-heading > p:last-child {
    max-width: 42rem;
    color: var(--color-performance-fg-secondary);
  }
</style>
