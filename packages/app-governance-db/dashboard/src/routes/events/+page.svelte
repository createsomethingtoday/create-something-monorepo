<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import Panel from '$lib/components/Panel.svelte';
  import { shortTimestamp } from '$lib/format';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function applyFilter(name: string, value: string) {
    const params = new URLSearchParams($page.url.searchParams);
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    goto(`/events?${params.toString()}`, { keepFocus: true });
  }

  function isFailure(action: string): boolean {
    return action.toLowerCase().includes('fail');
  }
</script>

<h1 class="page-title">Events</h1>
<p class="page-note mt-2">Append-only audit trail of every write through the MCP boundary.</p>

<!-- Filters -->
<div class="mt-6 flex flex-wrap items-end gap-4">
  <label class="filter-field">
    <span class="filter-label">Entity type</span>
    <select
      class="filter-select"
      value={data.filters.entityType}
      onchange={(e) => applyFilter('entity_type', e.currentTarget.value)}
    >
      <option value="">All</option>
      {#each data.entityTypes as entityType (entityType)}
        <option value={entityType}>{entityType}</option>
      {/each}
    </select>
  </label>

  <label class="filter-field">
    <span class="filter-label">Actor</span>
    <select
      class="filter-select"
      value={data.filters.actor}
      onchange={(e) => applyFilter('actor', e.currentTarget.value)}
    >
      <option value="">All</option>
      {#each data.actors as actor (actor)}
        <option value={actor}>{actor}</option>
      {/each}
    </select>
  </label>
</div>

<div class="mt-6">
  <Panel title="Audit trail" count={data.events.length}>
    {#if data.events.length === 0}
      <p class="empty-note">No events recorded yet.</p>
    {:else}
      <ol class="timeline">
        {#each data.events as event (event.id)}
          <li class="event-row">
            <span class="timeline-node" class:failure={isFailure(event.action)} aria-hidden="true"
            ></span>
            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span class="mono-caption" title={event.created_at}>
                {shortTimestamp(event.created_at)}
              </span>
              <span class="mono-caption">{event.actor}</span>
              <span class="event-action">{event.action}</span>
              <span class="mono-caption">
                {event.entity_type}{event.entity_id ? `#${event.entity_id}` : ''}
              </span>
            </div>
            {#if event.payload_json}
              <details class="payload-details mt-1">
                <summary>payload</summary>
                <pre class="payload-pre">{event.payload_json}</pre>
              </details>
            {/if}
          </li>
        {/each}
      </ol>
    {/if}
  </Panel>
</div>

<style>
  .page-title {
    font-size: var(--text-h1);
    color: var(--color-fg-primary);
  }

  .page-note {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
  }

  .filter-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .filter-label {
    font-size: var(--text-caption);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  .filter-select {
    font-size: var(--text-body-sm);
    color: var(--color-fg-primary);
    background: var(--color-shell-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    padding: var(--space-xs) var(--space-sm);
    max-width: 18rem;
    transition: border-color var(--duration-micro) var(--ease-standard);
  }

  .filter-select:focus {
    outline: none;
    border-color: var(--color-border-emphasis);
  }

  /* Left timeline rule ties the log together (spec §7) */
  .timeline {
    position: relative;
    margin: var(--space-xs) 0;
  }

  .timeline::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: calc(var(--space-sm) + 2px);
    width: 1px;
    background: var(--color-border-default);
  }

  .event-row {
    position: relative;
    padding: var(--space-xs) var(--space-sm) var(--space-xs) calc(var(--space-sm) + var(--space-md));
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .timeline-node {
    position: absolute;
    left: var(--space-sm);
    top: calc(var(--space-xs) + 0.4em);
    width: 6px;
    height: 6px;
    border-radius: var(--radius-full);
    background: var(--color-fg-subtle);
  }

  /* Semantic color only when the action itself is a failure */
  .timeline-node.failure {
    background: var(--color-error);
  }

  .event-action {
    color: var(--color-fg-primary);
  }

  .mono-caption {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .empty-note {
    padding: var(--space-md) var(--space-sm);
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .payload-details summary {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    cursor: pointer;
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .payload-details summary:hover {
    color: var(--color-fg-secondary);
  }

  .payload-pre {
    margin-top: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    background: var(--color-bg-elevated);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--text-caption);
    color: var(--color-fg-tertiary);
    overflow-x: auto;
  }
</style>
