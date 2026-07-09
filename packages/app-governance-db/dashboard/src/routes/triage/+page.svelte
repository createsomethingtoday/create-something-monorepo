<script lang="ts">
  import Panel from '$lib/components/Panel.svelte';
  import { excerpt, relativeTime } from '$lib/format';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<!-- Queue header: the count is the surface's single loud number (spec §5) -->
<header class="flex items-baseline gap-4">
  <span class="queue-count">{data.total}</span>
  <h1 class="queue-label">new items</h1>
  {#if data.items.length < data.total}
    <span class="showing-note">showing {data.items.length} of {data.total}</span>
  {/if}
</header>

<div class="mt-6">
  {#if data.items.length === 0}
    <div class="inbox-zero">
      <p class="inbox-zero-title">Inbox zero.</p>
      <p class="inbox-zero-note">Cursors are current — nothing awaits triage.</p>
    </div>
  {:else}
    <Panel title="Triage queue">
      <ul>
        {#each data.items as item (item.id)}
          <li class="triage-row" class:threaded={Boolean(item.thread_ts)}>
            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {#if item.source_name}
                <span class="mono-caption">{item.source_name}</span>
              {/if}
              {#if item.author}
                <span class="row-author">{item.author}</span>
              {/if}
              <span class="mono-caption" title={item.posted_at ?? undefined}>
                {relativeTime(item.posted_at)}
              </span>
              {#if item.permalink}
                <a class="out-link ml-auto" href={item.permalink} target="_blank" rel="noreferrer">
                  Open in Slack ↗
                </a>
              {/if}
            </div>
            {#if item.text}
              <p class="row-text mt-1">{excerpt(item.text)}</p>
            {/if}
          </li>
        {/each}
      </ul>
    </Panel>
  {/if}
</div>

<style>
  .queue-count {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-h1);
    color: var(--color-fg-primary);
    line-height: 1;
  }

  .queue-label {
    font-size: var(--text-h3);
    color: var(--color-fg-muted);
  }

  .showing-note {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-caption);
    color: var(--color-fg-subtle);
  }

  .inbox-zero {
    background: var(--color-shell-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    padding: var(--space-lg);
  }

  .inbox-zero-title {
    font-size: var(--text-body);
    color: var(--color-fg-primary);
  }

  .inbox-zero-note {
    margin-top: var(--space-xs);
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .triage-row {
    padding: var(--space-xs) var(--space-sm);
    border-bottom: 1px solid var(--color-border-default);
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
  }

  .triage-row:last-child {
    border-bottom: none;
  }

  /* Thread children indent under parents with a left rule (spec §5) */
  .triage-row.threaded {
    margin-left: var(--space-md);
    border-left: 1px solid var(--color-border-default);
  }

  .row-author {
    color: var(--color-fg-primary);
  }

  .row-text {
    color: var(--color-fg-tertiary);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .mono-caption {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
  }

  .out-link {
    font-size: var(--text-caption);
    color: var(--color-fg-secondary);
    text-decoration: underline;
    transition: color var(--duration-micro) var(--ease-standard);
  }

  .out-link:hover {
    color: var(--color-fg-primary);
  }
</style>
