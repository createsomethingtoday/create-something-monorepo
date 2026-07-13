<script lang="ts">
  /**
   * Concept Discovery Page
   *
   * Visualizes a concept's journey across all CREATE SOMETHING properties.
   * Route: /discover/:concept
   *
   * Canon: Understanding emerges through the hermeneutic spiral.
   */

  import type { PageData } from './$types';
  import { ConceptJourney, SEO } from '@create-something/canon';

  let { data }: { data: PageData } = $props();
</script>

<SEO
  title="Discover: {data.concept}"
  description="Explore {data.concept} across all CREATE SOMETHING properties - from canon definition to practical application."
  keywords="{data.concept}, concept discovery, hermeneutic spiral, CREATE SOMETHING"
  propertyName="space"
  breadcrumbs={[
    { name: 'Home', url: 'https://createsomething.space' },
    { name: 'Discover', url: 'https://createsomething.space/discover' },
    { name: data.concept, url: `https://createsomething.space/discover/${data.concept}` }
  ]}
/>

<main class="discover-page">
  <ConceptJourney
    concept={data.concept}
    searchApiUrl={data.searchApiUrl}
    maxItemsPerStage={5}
    showEmptyStages={false}
  />

  <!-- Back Navigation -->
  <nav class="discover-nav">
    <a href="/" class="nav-link">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Back to experiments
    </a>
  </nav>
</main>

<style>
  .discover-page {
    min-height: 100vh;
    background: var(--color-bg-primary, #000);
  }

  .discover-nav {
    max-width: 800px;
    margin: 0 auto;
    padding: var(--space-performance-lg, 2.618rem) var(--space-performance-md, 1.618rem);
  }

  .nav-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-performance-xs, 0.5rem);
    color: var(--color-performance-fg-muted, rgba(255, 255, 255, 0.46));
    text-decoration: none;
    font-size: var(--text-performance-body-sm, 0.875rem);
    transition: color var(--duration-performance-micro, 200ms) var(--ease-performance-standard);
  }

  .nav-link:hover {
    color: var(--color-performance-fg-primary, #fff);
  }
</style>
