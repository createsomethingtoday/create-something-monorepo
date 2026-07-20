<script lang="ts">
  import { onMount } from 'svelte';
  import { PaperCard } from '@create-something/canon';
  import type { Paper } from '@create-something/canon/types';
  import CatalogDetailOpening from '$lib/components/catalog/CatalogDetailOpening.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const papers = $derived(data.papers as Array<Paper & { route: string }>);
  const category = $derived(data.category);
  let enhanced = $state(false);
  let showAll = $state(false);
  const visiblePapers = $derived(showAll ? papers : enhanced ? papers.slice(0, 12) : papers);

  onMount(() => {
    enhanced = true;
  });

  const categoryDescriptions: Record<string, string> = {
    research: 'Evidence-backed papers on building, testing, and governing AI-native systems.',
    'case-study':
      'Real implementations explained through the decisions, failures, and evidence that shaped them.',
    methodology: 'Practical methods for designing, evaluating, and reviewing agentic systems.'
  };

  const description = $derived(
    categoryDescriptions[category.slug] ??
      `${papers.length} papers that share the ${category.name} research topic.`
  );
  const url = $derived(`https://createsomething.io/category/${category.slug}`);
</script>

<svelte:head>
  <title>{category.name} Articles | CREATE SOMETHING</title>
  <meta name="description" content={description} />
  <meta name="keywords" content="{category.slug}, technical papers, tutorials, {category.name}" />

  <meta property="og:type" content="website" />
  <meta property="og:url" content={url} />
  <meta property="og:title" content="{category.name} Articles | CREATE SOMETHING" />
  <meta property="og:description" content={description} />
  <meta property="og:image" content="https://createsomething.io/og-image.png" />
  <meta property="og:site_name" content="CREATE SOMETHING" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content={url} />
  <meta name="twitter:title" content="{category.name} Articles" />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content="https://createsomething.io/og-image.png" />

  <link rel="canonical" href={url} />

  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} Articles`,
    description,
    url,
    publisher: {
      '@type': 'Organization',
      name: 'CREATE SOMETHING',
      url: 'https://createsomething.io'
    },
    numberOfItems: papers.length
  })}<\/script>`}
</svelte:head>

<CatalogDetailOpening
  backHref="/categories"
  backLabel="research topics"
  eyebrow="Research topic"
  title={category.name}
  {description}
  summary={[
    { label: 'Papers', value: String(papers.length) },
    { label: 'Order', value: 'Newest first' }
  ]}
  action={{ href: '#papers', label: 'Choose a paper' }}
/>

<section id="papers" class="catalog-detail-collection" aria-labelledby="papers-title">
  <div class="catalog-detail-collection__inner">
    <header>
      <div>
        <p>Read within this topic</p>
        <h2 id="papers-title">Choose a paper</h2>
      </div>
      <span>{visiblePapers.length} of {papers.length} shown</span>
    </header>

    <div class="paper-grid">
      {#each visiblePapers as paper}
        <PaperCard {paper} rotation={0} index={0} animate={false} />
      {/each}
    </div>

    {#if enhanced}
      <button
        class="show-all"
        type="button"
        aria-disabled={showAll}
        onclick={() => {
          if (!showAll) showAll = true;
        }}
      >
        {showAll ? `All ${papers.length} papers shown` : `Show all ${papers.length} papers`}
      </button>
    {/if}

    <a class="collection-handoff" href="/papers">Browse every paper</a>
  </div>
</section>

<style>
  .catalog-detail-collection {
    padding: clamp(3rem, 6vw, 5rem) 1.5rem;
    border-top: 1px solid var(--color-performance-border-default);
  }

  .catalog-detail-collection__inner {
    display: grid;
    width: min(72rem, 100%);
    margin-inline: auto;
    gap: var(--space-performance-lg);
  }

  header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: var(--space-performance-md);
  }

  header div {
    display: grid;
    gap: var(--space-performance-xs);
  }

  header p,
  header h2,
  header > span {
    margin: 0;
  }

  header p,
  header > span {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  header h2 {
    color: var(--color-performance-fg-primary);
    font-size: var(--text-performance-h2);
  }

  .paper-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-performance-md);
  }

  .show-all {
    width: fit-content;
    padding: 0.7rem 0.9rem;
    border: 1px solid var(--color-performance-border-strong);
    border-radius: var(--radius-performance-scale-sm);
    background: var(--color-performance-bg-surface);
    color: var(--color-performance-fg-primary);
    font-weight: var(--font-performance-semibold);
  }

  .show-all:hover {
    background: var(--color-performance-fg-primary);
    color: var(--color-performance-bg-pure, #ffffff);
  }

  .collection-handoff {
    width: fit-content;
    font-weight: var(--font-performance-semibold);
    text-decoration: underline;
  }

  @media (max-width: 900px) {
    .paper-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .catalog-detail-collection {
      padding: 3rem 1.25rem;
    }

    header {
      align-items: flex-start;
      flex-direction: column;
    }

    .paper-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
