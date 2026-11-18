<script lang="ts">
  import DeliveryFixture from '$lib/components/canon-preview/DeliveryFixture.svelte';
  import ServicesFixture from '$lib/components/canon-preview/ServicesFixture.svelte';
  import MapFixture from '$lib/components/canon-preview/MapFixture.svelte';
  let { data } = $props();
</script>
<svelte:head><title>Canon consumer scene review — local study</title><meta name="robots" content="noindex,nofollow" /></svelte:head>
<div class="agency-surface property-performance" data-theme="dark">
<header class="fixture-review">
  <p>LOCAL REVIEW / {data.surface} / {data.proposed ? 'Proposed Canon scene study' : 'Existing compatible composition'}</p>
  <p>Original business copy, records and destinations. Illustrations are concept studies, not customer results or proof. Portrait studies and this composition await approval.</p>
  <nav aria-label="Consumer fixture selection">
    {#each ['delivery', 'services', 'map'] as surface}
      <a href={`?surface=${surface}&variant=existing`}>{surface}: existing</a>
      <a href={`?surface=${surface}&variant=proposed`}>{surface}: proposed</a>
    {/each}
  </nav>
</header>
{#if data.surface === 'services'}<ServicesFixture proposed={data.proposed} />
{:else if data.surface === 'map'}<MapFixture proposed={data.proposed} />
{:else}<DeliveryFixture proposed={data.proposed} />{/if}
</div>
<style>
/* The no-JS navigation expands to multiple rows; retain it in flow for this local review. */
:global(body:has(.fixture-review) .nav-container:has(.nav-static-links)) { position: relative !important; inset: auto !important; width: calc(100% - 2rem) !important; margin: 1rem auto !important; }
:global(body:has(.nav-static-links)) .fixture-review { padding-top: 2rem; }

.fixture-review { padding: 7rem 5% 2rem; background: var(--color-performance-paper); color: var(--color-performance-ink); border-bottom: 1px solid var(--color-performance-line); }
.fixture-review p { max-width: 75ch; margin: 0 0 1rem; font: 1rem/1.6 var(--font-performance-sans); }
.fixture-review p:first-child { font-family: var(--font-performance-mono); font-size: .75rem; }
.fixture-review nav { display: flex; flex-wrap: wrap; gap: .5rem 1.5rem; }
.fixture-review a { display: inline-flex; align-items: center; min-height: 44px; color: inherit; text-underline-offset: .25em; }
.fixture-review a:focus-visible { outline: 3px solid var(--color-performance-focus); outline-offset: 3px; }
</style>
