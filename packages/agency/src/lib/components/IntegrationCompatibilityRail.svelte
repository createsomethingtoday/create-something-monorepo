<script lang="ts">
  import { onMount } from 'svelte';
  import { getAnalytics } from '@create-something/canon/analytics';
  import { integrationProofItems, type IntegrationProofItem } from '$lib/data/integrationProof';

  export let surface: 'homepage' | 'partners' = 'homepage';

  const platformItems = integrationProofItems.filter((item) => item.role === 'platform');
  const connectorItems = integrationProofItems.filter((item) => item.role === 'connector');

  function trackClick(item: IntegrationProofItem) {
    getAnalytics()?.track('interaction', 'integration_rail_click', {
      metadata: {
        surface,
        integration_id: item.id,
        integration_name: item.name,
        integration_role: item.role,
        integration_status: item.status
      }
    });
  }

  function trackCatalogLink() {
    getAnalytics()?.track('interaction', 'integration_rail_click', {
      metadata: {
        surface,
        integration_id: 'catalog',
        integration_name: 'Connector directory',
        integration_role: 'catalog',
        integration_status: 'available'
      }
    });
  }

  onMount(() => {
    getAnalytics()?.track('interaction', 'integration_rail_view', {
      metadata: { surface, item_count: integrationProofItems.length }
    });
  });
</script>

<section class="compatibility-rail" aria-labelledby="compatibility-{surface}-title">
  <div class="compatibility-rail__header">
    <div>
      <span class="compatibility-rail__eyebrow">Tool compatibility</span>
      <h2 id="compatibility-{surface}-title">
        Built on a controlled core. Connected to the tools your team already uses.
      </h2>
    </div>
    <a
      href="/partners#integration-catalog"
      class="compatibility-rail__catalog-link"
      onclick={trackCatalogLink}
    >
      Search every connector →
    </a>
  </div>

  <div class="compatibility-rail__groups">
    <div class="compatibility-rail__group">
      <span class="compatibility-rail__group-label">Built on</span>
      <div class="compatibility-rail__items compatibility-rail__items--platforms">
        {#each platformItems as item}
          <a
            class="compatibility-rail__item"
            href={item.href}
            aria-label={`${item.name}: ${item.statusLabel}`}
            onclick={() => trackClick(item)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={item.icon.path}></path>
            </svg>
            <span>{item.name}</span>
          </a>
        {/each}
      </div>
    </div>

    <div class="compatibility-rail__group compatibility-rail__group--connectors">
      <span class="compatibility-rail__group-label">Connects to</span>
      <div class="compatibility-rail__items">
        {#each connectorItems as item}
          <a
            class="compatibility-rail__item"
            href={item.href}
            aria-label={`${item.name}: ${item.statusLabel}`}
            onclick={() => trackClick(item)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={item.icon.path}></path>
            </svg>
            <span>{item.name}</span>
          </a>
        {/each}
      </div>
    </div>
  </div>

  <p class="compatibility-rail__disclaimer">
    Brand marks identify tool paths, not partnerships or endorsements. Accounts, permissions, and
    write access are scoped for each workflow.
  </p>
</section>

<style>
  .compatibility-rail {
    width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
    margin: clamp(1.5rem, 4vw, 3.5rem) auto;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
  }

  .compatibility-rail__header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 2rem;
    padding: clamp(1.25rem, 3vw, 2rem);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .compatibility-rail__eyebrow,
  .compatibility-rail__group-label {
    display: block;
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption, 0.75rem);
    font-weight: var(--font-performance-semibold, 600);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h2 {
    max-width: 42rem;
    margin: 0.65rem 0 0;
    font-family: var(--font-performance-display);
    font-size: clamp(1.4rem, 3vw, 2.3rem);
    font-weight: var(--font-performance-medium, 500);
    letter-spacing: var(--tracking-performance-tight, -0.02em);
    line-height: 1.05;
  }

  .compatibility-rail__catalog-link {
    flex: 0 0 auto;
    color: inherit;
    font-size: var(--text-performance-body-sm, 0.875rem);
    font-weight: var(--font-performance-semibold, 600);
    text-underline-offset: 0.25rem;
  }

  .compatibility-rail__groups {
    display: grid;
    grid-template-columns: minmax(13rem, 0.65fr) minmax(0, 1.35fr);
  }

  .compatibility-rail__group {
    padding: 1rem clamp(1.25rem, 3vw, 2rem) 1.35rem;
  }

  .compatibility-rail__group--connectors {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .compatibility-rail__items {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
    margin-top: 0.8rem;
  }

  .compatibility-rail__items--platforms {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .compatibility-rail__item {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.6rem;
    padding: 0.7rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    color: inherit;
    font-size: var(--text-performance-body-sm, 0.875rem);
    font-weight: var(--font-performance-medium, 500);
    text-decoration: none;
  }

  .compatibility-rail__item:hover,
  .compatibility-rail__item:focus-visible {
    border-color: var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-paper, #f3f3f0);
  }

  .compatibility-rail__item svg {
    width: 1.15rem;
    height: 1.15rem;
    flex: 0 0 auto;
    fill: currentColor;
  }

  .compatibility-rail__item span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .compatibility-rail__disclaimer {
    margin: 0;
    padding: 0.8rem clamp(1.25rem, 3vw, 2rem);
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
    color: var(--color-performance-muted, #5e6268);
    font-size: var(--text-performance-caption, 0.75rem);
  }

  @media (max-width: 800px) {
    .compatibility-rail__header {
      display: grid;
    }

    .compatibility-rail__groups {
      grid-template-columns: 1fr;
    }

    .compatibility-rail__group--connectors {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }
  }

  @media (max-width: 640px) {
    .compatibility-rail {
      width: min(100% - 1.5rem, var(--content-width-performance, 85rem));
    }

    .compatibility-rail__items,
    .compatibility-rail__items--platforms {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .compatibility-rail__item {
      padding: 0.65rem;
    }
  }
</style>
