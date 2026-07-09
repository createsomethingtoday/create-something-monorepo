<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    /** Honest count in the heading, monospace (spec §2.8) */
    count?: number | string;
    children: Snippet;
    class?: string;
  }

  let { title, count, children, class: className = '' }: Props = $props();
</script>

<section class={`panel ${className}`}>
  <header class="panel-header flex items-baseline gap-3">
    <h2 class="panel-title">{title}</h2>
    {#if count !== undefined}
      <span class="panel-count">{count}</span>
    {/if}
  </header>
  <div class="min-w-0">
    {@render children()}
  </div>
</section>

<style>
  .panel {
    background: var(--color-shell-surface);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .panel-header {
    padding: var(--space-xs) var(--space-sm);
    border-bottom: 1px solid var(--color-border-default);
    background: var(--color-shell-surface-secondary);
  }

  .panel-title {
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-fg-muted);
  }

  .panel-count {
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    font-size: var(--text-caption);
    color: var(--color-fg-tertiary);
  }
</style>
