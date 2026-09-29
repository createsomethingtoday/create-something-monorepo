<script lang="ts">
  import type { Snippet } from 'svelte';

  let { label, children }: { label: string; children: Snippet } = $props();
</script>

<nav class="agency-wayfinding-group" aria-label={label}>
  {@render children()}
</nav>

<style>
  .agency-wayfinding-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
    gap: var(--space-performance-sm);
    min-width: 0;
  }
</style>
