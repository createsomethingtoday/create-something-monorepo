<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  type Variant = 'default' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  export type { Variant };

  interface Props extends HTMLAttributes<HTMLSpanElement> {
    variant?: Variant;
    children?: Snippet;
  }

  let { variant = 'default', class: className = '', children, ...restProps }: Props = $props();
</script>

<span class="badge badge-{variant} {className}" {...restProps}>
  {#if children}
    {@render children()}
  {/if}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.4rem;
    font-size: var(--text-caption);
    font-weight: var(--font-medium);
    letter-spacing: 0.01em;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border-default);
    white-space: nowrap;
    background: transparent;
    color: var(--color-fg-secondary);
  }

  .badge-default {
    color: var(--color-fg-primary);
    border-color: var(--color-border-emphasis);
  }

  .badge-secondary {
    color: var(--color-fg-secondary);
    border-color: var(--color-border-default);
  }

  .badge-success {
    background: color-mix(in srgb, var(--color-success-muted) 35%, transparent);
    color: var(--color-success-ink);
    border-color: var(--color-success-border);
  }

  .badge-warning {
    background: color-mix(in srgb, var(--color-warning-muted) 35%, transparent);
    color: var(--color-warning-ink);
    border-color: var(--color-warning-border);
  }

  .badge-error {
    background: color-mix(in srgb, var(--color-error-muted) 35%, transparent);
    color: var(--color-error-ink);
    border-color: var(--color-error-border);
  }

  .badge-info {
    background: var(--color-info-soft-bg);
    color: var(--color-info-soft-text);
    border-color: var(--color-info-soft-border);
  }

  .badge-outline {
    color: var(--color-fg-secondary);
    border-color: var(--color-border-default);
  }
</style>
