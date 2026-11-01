<script lang="ts">
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
</script>

<div class="agency-legal-page">
  {@render children()}
</div>

<style>
  .agency-legal-page {
    padding-inline: clamp(1.25rem, 6vw, 6rem);
    padding-bottom: var(--space-performance-xl);
  }
  .agency-legal-page :global(.clear-page-section__inner) {
    width: 100%;
    max-width: 72ch;
    margin-inline: auto;
  }
  .agency-legal-page :global(.clear-page-section) {
    padding-inline: 0;
  }
</style>
