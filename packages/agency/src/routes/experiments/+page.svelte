<script lang="ts">
  import type { PageData } from './$types';
  import { PapersGrid, PerformanceCampaignOpening, SEO } from '@create-something/canon';

  let { data }: { data: PageData } = $props();

  type SortOption = 'newest' | 'oldest' | 'featured';
  let sortBy: SortOption = $state('newest');

  const sortedPapers = $derived.by(() => {
    const sorted = [...data.papers];
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => {
          const aDate = new Date(a.published_at || a.created_at || 0).getTime();
          const bDate = new Date(b.published_at || b.created_at || 0).getTime();
          return bDate - aDate;
        });
      case 'oldest':
        return sorted.sort((a, b) => {
          const aDate = new Date(a.published_at || a.created_at || 0).getTime();
          const bDate = new Date(b.published_at || b.created_at || 0).getTime();
          return aDate - bDate;
        });
      case 'featured':
        return sorted.sort((a, b) => {
          const aFeatured = a.featured ?? 0;
          const bFeatured = b.featured ?? 0;
          if (bFeatured !== aFeatured) return bFeatured - aFeatured;
          const aDate = new Date(a.published_at || a.created_at || 0).getTime();
          const bDate = new Date(b.published_at || b.created_at || 0).getTime();
          return bDate - aDate;
        });
    }
  });
</script>

<SEO
  title="Agency Experiments ({data.papers.length})"
  description="Browse CREATE SOMETHING agency experiments: real projects, operating boundaries, and inspectable results."
  propertyName="agency"
  noindex={true}
  breadcrumbs={[
    { name: 'Home', url: '/' },
    { name: 'Experiments', url: '/experiments' }
  ]}
/>

<PerformanceCampaignOpening
  eyebrow="Experiment index"
  title="Browse the work. Start with the result."
  lede="These are working experiments, not a generic portfolio. Sort the collection, inspect one result, and follow its evidence and limits."
  density="compact"
  media={{
    src: '/images/performance-lab/pressure-boundary-natural.webp',
    mobileSrc: '/images/performance-lab/pressure-boundary-natural-mobile.webp',
    alt: 'Black-and-white engineered boundary holding pressure between two surfaces'
  }}
  proof={[
    { label: 'Experiments', value: String(data.papers.length).padStart(2, '0') },
    { label: 'Claims', value: 'Inspectable' },
    { label: 'Limits', value: 'Visible' }
  ]}
>
  {#snippet actions()}
    <div class="experiment-sort" role="group" aria-label="Sort experiments">
      <button type="button" aria-pressed={sortBy === 'newest'} onclick={() => (sortBy = 'newest')}
        >Newest</button
      >
      <button type="button" aria-pressed={sortBy === 'oldest'} onclick={() => (sortBy = 'oldest')}
        >Oldest</button
      >
      <button
        type="button"
        aria-pressed={sortBy === 'featured'}
        onclick={() => (sortBy = 'featured')}>Featured</button
      >
    </div>
  {/snippet}
</PerformanceCampaignOpening>

<PapersGrid
  papers={sortedPapers}
  title="Choose one experiment."
  subtitle="Each destination owns its result, evidence, and operating boundary."
/>

<style>
  .experiment-sort {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    padding: 0.35rem;
    border: 1px solid rgb(255 255 255 / 0.38);
    background: rgb(9 9 9 / 0.35);
  }

  .experiment-sort button {
    min-height: 2.75rem;
    padding: 0.65rem 0.9rem;
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    font: 600 0.72rem/1 var(--font-performance-mono);
    text-transform: uppercase;
    cursor: pointer;
  }

  .experiment-sort button[aria-pressed='true'] {
    border-color: rgb(255 255 255 / 0.7);
    background: #fff;
    color: #090909;
  }

  .experiment-sort button:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 2px;
  }
</style>
