<script lang="ts">
  import { onMount } from 'svelte';
  import { getAnalytics } from '@create-something/canon/analytics';
  import {
    connectorCatalogCount,
    integrationCatalog,
    type IntegrationCatalogEntry
  } from '$lib/data/integrationCatalog.generated';

  export let surface: 'partners' = 'partners';

  let query = '';
  let visibleCount = 24;

  $: normalizedQuery = query.trim().toLocaleLowerCase();
  $: filteredIntegrations = normalizedQuery
    ? integrationCatalog.filter((integration) =>
        `${integration.name} ${integration.slug}`.toLocaleLowerCase().includes(normalizedQuery)
      )
    : integrationCatalog;
  $: visibleIntegrations = filteredIntegrations.slice(0, visibleCount);

  function mapHref(integration: IntegrationCatalogEntry) {
    return `/map?source=integration-catalog&integration=${encodeURIComponent(integration.slug)}`;
  }

  function trackResult(integration: IntegrationCatalogEntry) {
    getAnalytics()?.track('interaction', 'integration_catalog_result_click', {
      metadata: {
        surface,
        integration_id: integration.id,
        integration_name: integration.name,
        integration_status: integration.status
      }
    });
  }

  function showMore() {
    visibleCount += 24;
    getAnalytics()?.track('interaction', 'integration_catalog_more', {
      metadata: { surface, visible_count: visibleCount, result_count: filteredIntegrations.length }
    });
  }

  onMount(() => {
    const requestedIntegration = new URL(window.location.href).searchParams.get('integration');
    if (requestedIntegration) query = requestedIntegration;

    getAnalytics()?.track('interaction', 'integration_catalog_view', {
      metadata: { surface, connector_count: connectorCatalogCount }
    });
  });
</script>

<section id="integration-catalog" class="integration-catalog" aria-labelledby="integration-catalog-title">
  <div class="integration-catalog__header">
    <div>
      <span class="integration-catalog__eyebrow">Connector directory</span>
      <h2 id="integration-catalog-title">Search the available tool paths.</h2>
      <p>
        {connectorCatalogCount.toLocaleString()} brokered connector paths are listed. Availability is
        a starting point; connection, permissions, actions, and approval rules are verified during
        workflow mapping.
      </p>
    </div>
    <label class="integration-catalog__search">
      <span>Search connectors</span>
      <input
        type="search"
        bind:value={query}
        oninput={() => (visibleCount = 24)}
        placeholder="Try Slack, Salesforce, or Sheets"
        autocomplete="off"
      />
    </label>
  </div>

  <div class="integration-catalog__status" aria-live="polite">
    <span>{filteredIntegrations.length.toLocaleString()} results</span>
    <span>Connector available ≠ connected or write-authorized</span>
  </div>

  {#if visibleIntegrations.length > 0}
    <div class="integration-catalog__grid">
      {#each visibleIntegrations as integration}
        <article class="integration-catalog__item">
          <div class="integration-catalog__monogram" aria-hidden="true">
            {integration.name.slice(0, 2).toLocaleUpperCase()}
          </div>
          <div class="integration-catalog__copy">
            <h3>{integration.name}</h3>
            <span>Connector available</span>
          </div>
          <a href={mapHref(integration)} onclick={() => trackResult(integration)}>
            Map this tool <span aria-hidden="true">→</span>
          </a>
        </article>
      {/each}
    </div>

    {#if visibleIntegrations.length < filteredIntegrations.length}
      <div class="integration-catalog__more">
        <button type="button" onclick={showMore}>Show 24 more</button>
      </div>
    {/if}
  {:else}
    <div class="integration-catalog__empty">
      <h3>No matching connector is listed.</h3>
      <p>The workflow may still have a custom API or MCP path. Bring the system to the map.</p>
      <a href="/map?source=integration-catalog&integration=custom">Map a custom path →</a>
    </div>
  {/if}

  <p class="integration-catalog__disclaimer">
    Directory entries indicate a brokered connector path, not a live customer connection,
    delivered integration, certification, partnership, or endorsement.
  </p>
</section>

<style>
  .integration-catalog {
    width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
    margin: clamp(1.5rem, 4vw, 3.5rem) auto 0;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
    scroll-margin-top: 5rem;
  }

  .integration-catalog__header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(16rem, 0.55fr);
    gap: clamp(1.5rem, 4vw, 4rem);
    align-items: end;
    padding: clamp(1.25rem, 3vw, 2rem);
  }

  .integration-catalog__eyebrow,
  .integration-catalog__search span,
  .integration-catalog__status,
  .integration-catalog__copy span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption, 0.75rem);
    font-weight: var(--font-performance-semibold, 600);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0.65rem 0 0;
    font-family: var(--font-performance-display);
    font-size: clamp(1.4rem, 3vw, 2.3rem);
    font-weight: var(--font-performance-medium, 500);
    letter-spacing: var(--tracking-performance-tight, -0.02em);
    line-height: 1.05;
  }

  .integration-catalog__header p {
    max-width: 48rem;
    margin: 0.8rem 0 0;
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.55;
  }

  .integration-catalog__search {
    display: grid;
    gap: 0.55rem;
  }

  .integration-catalog__search input {
    width: 100%;
    min-height: 3rem;
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
    font: inherit;
    padding: 0.75rem 0.9rem;
  }

  .integration-catalog__search input:focus-visible {
    outline: 2px solid var(--color-performance-signal, #0057b8);
    outline-offset: 2px;
  }

  .integration-catalog__status {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.7rem clamp(1.25rem, 3vw, 2rem);
    border-block: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-paper, #f3f3f0);
  }

  .integration-catalog__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .integration-catalog__item {
    display: grid;
    grid-template-columns: 2.5rem minmax(0, 1fr);
    gap: 0.8rem;
    min-height: 8.5rem;
    padding: 1rem;
    border-right: 1px solid var(--color-performance-line, #d7d7d2);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .integration-catalog__item:nth-child(3n) {
    border-right: 0;
  }

  .integration-catalog__monogram {
    display: grid;
    width: 2.5rem;
    height: 2.5rem;
    place-items: center;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-paper, #f3f3f0);
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    font-weight: var(--font-performance-semibold, 600);
  }

  .integration-catalog__copy {
    min-width: 0;
  }

  .integration-catalog__copy h3,
  .integration-catalog__empty h3 {
    margin: 0 0 0.45rem;
    font-size: 1rem;
    font-weight: var(--font-performance-semibold, 600);
    overflow-wrap: anywhere;
  }

  .integration-catalog__item > a {
    grid-column: 2;
    align-self: end;
    color: inherit;
    font-size: var(--text-performance-body-sm, 0.875rem);
    font-weight: var(--font-performance-semibold, 600);
    text-underline-offset: 0.2rem;
  }

  .integration-catalog__more {
    display: flex;
    justify-content: center;
    padding: 1rem;
  }

  .integration-catalog__more button {
    min-height: 2.75rem;
    border: 1px solid var(--color-performance-ink, #090909);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-ink, #090909);
    color: var(--color-performance-panel, #ffffff);
    font: inherit;
    font-weight: var(--font-performance-semibold, 600);
    padding: 0.65rem 1rem;
    cursor: pointer;
  }

  .integration-catalog__empty {
    padding: clamp(1.5rem, 4vw, 3rem);
    text-align: center;
  }

  .integration-catalog__empty p {
    color: var(--color-performance-muted, #5e6268);
  }

  .integration-catalog__empty a {
    color: inherit;
    font-weight: var(--font-performance-semibold, 600);
  }

  .integration-catalog__disclaimer {
    margin: 0;
    padding: 0.8rem clamp(1.25rem, 3vw, 2rem);
    color: var(--color-performance-muted, #5e6268);
    font-size: var(--text-performance-caption, 0.75rem);
  }

  @media (max-width: 850px) {
    .integration-catalog__header,
    .integration-catalog__grid {
      grid-template-columns: 1fr 1fr;
    }

    .integration-catalog__header > div {
      grid-column: 1 / -1;
    }

    .integration-catalog__search {
      grid-column: 1 / -1;
    }

    .integration-catalog__item:nth-child(3n) {
      border-right: 1px solid var(--color-performance-line, #d7d7d2);
    }

    .integration-catalog__item:nth-child(2n) {
      border-right: 0;
    }
  }

  @media (max-width: 640px) {
    .integration-catalog {
      width: min(100% - 1.5rem, var(--content-width-performance, 85rem));
    }

    .integration-catalog__grid {
      grid-template-columns: 1fr;
    }

    .integration-catalog__item,
    .integration-catalog__item:nth-child(2n),
    .integration-catalog__item:nth-child(3n) {
      min-height: 7.5rem;
      border-right: 0;
    }

    .integration-catalog__status {
      display: grid;
    }
  }
</style>
