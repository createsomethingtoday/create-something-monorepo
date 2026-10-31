<script lang="ts">
  import type { Snippet } from 'svelte';
  import { onMount } from 'svelte';

  let { children, sectionNavigation = false }: { children: Snippet; sectionNavigation?: boolean } = $props();
  let root: HTMLDivElement;
  let sections = $state<Array<{ id: string; title: string }>>([]);

  onMount(() => {
    if (!sectionNavigation) return;
    sections = Array.from(root.querySelectorAll('h2')).map((heading, index) => {
      const id = heading.id || `legal-section-${index + 1}`;
      heading.id = id;
      return { id, title: heading.textContent?.trim() || `Section ${index + 1}` };
    });
  });
</script>

<div class="agency-legal-content" bind:this={root}>
  {#if sections.length}
    <details class="legal-section-navigation">
      <summary>On this page</summary>
      <nav aria-label="Policy sections">
        {#each sections as section}<a href={`#${section.id}`}>{section.title}</a>{/each}
      </nav>
    </details>
  {/if}
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
    scroll-margin-top: 7rem;
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
  .legal-section-navigation { margin-bottom: var(--space-performance-lg); border-block: 1px solid var(--color-performance-line); }
  .legal-section-navigation summary { display: flex; align-items: center; min-height: 48px; cursor: pointer; }
  .legal-section-navigation nav { display: grid; padding-bottom: var(--space-performance-sm); }
  .legal-section-navigation a { display: flex; align-items: center; min-height: 44px; font-size: var(--text-performance-caption); }
</style>
