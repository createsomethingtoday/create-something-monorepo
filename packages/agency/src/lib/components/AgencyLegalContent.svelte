<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<div class="agency-legal-content">
  {@render children()}
</div>

<style>
  /* Shared legal content still consumes the dark-surface semantic tokens.
   * Resolve them to the enclosing Agency Performance/Meridian palette here,
   * without changing legal content or the other properties' presentation. */
  .agency-legal-content {
    --color-performance-fg-primary: var(--color-performance-ink);
    --color-performance-fg-secondary: var(--color-performance-ink-soft);
    --color-performance-fg-tertiary: var(--color-performance-muted);
    --color-performance-fg-muted: var(--color-performance-muted);
    --color-performance-bg-surface: var(--color-performance-panel);
    --radius-performance-scale-lg: var(--radius-performance-sm);

    width: 100%;
    max-width: 72ch;
    min-width: 0;
    color: var(--color-performance-ink);
    font-family: var(--font-performance-prose);
    font-size: var(--text-performance-body);
    overflow-wrap: anywhere;
  }

  .agency-legal-content :global(h2) {
    font-family: var(--font-performance-editorial);
    font-weight: var(--font-performance-editorial-weight);
    line-height: var(--leading-performance-editorial);
  }

  .agency-legal-content :global(h3) {
    font-family: var(--font-performance-display);
    font-weight: var(--font-performance-medium);
    line-height: var(--leading-performance-tight);
  }

  .agency-legal-content :global(section + section) {
    padding-top: var(--space-performance-lg);
    border-top: 1px solid var(--color-performance-line);
  }

  .agency-legal-content :global(ul) {
    list-style-position: outside;
    padding-inline-start: var(--space-performance-md);
  }

  .agency-legal-content :global(a) {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }

  .agency-legal-content :global(a:focus-visible) {
    outline: 2px solid var(--color-performance-ink);
    outline-offset: 4px;
  }
</style>
