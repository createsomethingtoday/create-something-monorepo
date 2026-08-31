<script lang="ts">
  import { ChevronDown, LoaderCircle } from 'lucide-svelte';
  import { Button, Card, CardContent, LinkButton } from './ui';
  import StatusBadge from './StatusBadge.svelte';
  import type { AssetWorkQueueItem } from '$lib/utils/asset-actions';

  interface Props {
    items: AssetWorkQueueItem[];
    openingEditAssetId?: string | null;
    onView?: (id: string) => void;
    onPreloadView?: (id: string) => void;
    onEdit?: (id: string) => void;
  }

  let { items, openingEditAssetId = null, onView, onPreloadView, onEdit }: Props = $props();
  let isExpanded = $state(false);

  function getAssetDetailHref(id: string) {
    return `/assets/${id}`;
  }

  function isActionDisabled() {
    return openingEditAssetId !== null;
  }

  function handleView(event: MouseEvent, id: string) {
    if (isActionDisabled()) {
      event.preventDefault();
      return;
    }

    onView?.(id);
  }
</script>

{#if items.length > 0}
  <section class="asset-work-queue" aria-labelledby="asset-work-queue-title">
    <Card>
      <button
        class="queue-toggle"
        type="button"
        aria-expanded={isExpanded}
        aria-controls="asset-work-queue-content"
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} portfolio triage. ${items.length} ${items.length === 1 ? 'asset has' : 'assets have'} a next action.`}
        onclick={() => (isExpanded = !isExpanded)}
      >
        <span class="queue-heading">
          <span class="queue-kicker">Portfolio triage</span>
          <span class="queue-title" id="asset-work-queue-title">Needs attention</span>
        </span>
        <span class="queue-meta">
          <span class="queue-summary">
            {items.length}
            {items.length === 1 ? 'asset has' : 'assets have'} a next action.
          </span>
          <span class:queue-chevron-expanded={isExpanded} class="queue-chevron" aria-hidden="true">
            <ChevronDown size={18} strokeWidth={1.75} />
          </span>
        </span>
      </button>

      {#if isExpanded}
        <CardContent id="asset-work-queue-content">
          <div class="queue-content">
            <ol class="queue-list">
              {#each items as item (item.asset.id)}
                {@const isEditAction = item.action.handler === 'edit'}
                {@const isLoading = isEditAction && openingEditAssetId === item.asset.id}
                <li class="queue-item">
                  <div class="queue-record">
                    <div class="queue-record-header">
                      <h3>{item.asset.name}</h3>
                      <StatusBadge status={item.asset.status} size="sm" />
                    </div>
                    <p>{item.reason}</p>
                  </div>

                  <div class="queue-action">
                    {#if isEditAction}
                      <Button
                        size="sm"
                        disabled={isActionDisabled()}
                        onclick={() => onEdit?.(item.asset.id)}
                      >
                        {#if isLoading}
                          <LoaderCircle size={14} class="button-spinner" />
                          Opening...
                        {:else}
                          {item.action.label}
                        {/if}
                      </Button>
                    {:else}
                      <LinkButton
                        href={getAssetDetailHref(item.asset.id)}
                        size="sm"
                        aria-disabled={isActionDisabled()}
                        tabindex={isActionDisabled() ? -1 : undefined}
                        onmouseenter={() => onPreloadView?.(item.asset.id)}
                        onfocus={() => onPreloadView?.(item.asset.id)}
                        onclick={(event) => handleView(event, item.asset.id)}
                      >
                        {item.action.label}
                      </LinkButton>
                    {/if}
                  </div>
                </li>
              {/each}
            </ol>
          </div>
        </CardContent>
      {/if}
    </Card>
  </section>
{/if}

<style>
  .asset-work-queue {
    margin-top: var(--space-lg);
  }

  .queue-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    width: 100%;
    padding: var(--space-md);
    color: inherit;
    font: inherit;
    text-align: left;
    background: transparent;
    border: 0;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color var(--duration-micro) var(--ease-standard);
  }

  .queue-toggle:hover {
    background: var(--color-bg-subtle);
  }

  .queue-toggle:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }

  .queue-heading {
    display: grid;
    gap: 0.2rem;
  }

  .queue-meta {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .queue-kicker,
  .queue-summary,
  .queue-record p {
    margin: 0;
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
  }

  .queue-kicker {
    font-size: var(--text-caption);
    font-weight: var(--font-semibold);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  h3 {
    margin: 0;
    color: var(--color-fg-primary);
  }

  .queue-title {
    color: var(--color-fg-primary);
    font-size: var(--text-heading-sm);
    font-weight: var(--font-semibold);
  }

  h3 {
    font-size: var(--text-body);
    font-weight: var(--font-semibold);
  }

  .queue-content {
    border-top: 1px solid var(--color-shell-border-default);
  }

  .queue-chevron {
    display: inline-flex;
    flex: 0 0 auto;
    color: var(--color-fg-muted);
    transition: transform var(--duration-micro) var(--ease-standard);
  }

  .queue-chevron-expanded {
    transform: rotate(180deg);
  }

  .queue-list {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .queue-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    padding: var(--space-md) 0;
    border-top: 1px solid var(--color-shell-border-default);
  }

  .queue-item:first-child {
    border-top: 0;
  }

  .queue-record {
    min-width: 0;
  }

  .queue-record-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-sm);
  }

  .queue-record p {
    margin-top: 0.25rem;
    line-height: 1.45;
  }

  .queue-action {
    flex: 0 0 auto;
  }

  :global(.button-spinner) {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 42rem) {
    .queue-toggle,
    .queue-item {
      align-items: flex-start;
      flex-direction: column;
    }

    .queue-meta {
      justify-content: space-between;
      width: 100%;
    }

    .queue-action {
      width: 100%;
    }

    .queue-action :global(.btn) {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .queue-toggle,
    .queue-chevron,
    :global(.button-spinner) {
      transition: none;
      animation: none;
    }
  }
</style>
