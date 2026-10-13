<script lang="ts">
  import { tick } from 'svelte';
  import { installPageAnnotations } from './page-annotations';
  let { pathname }: { pathname: string } = $props();
  $effect(() => {
    const path = pathname;
    let disposed = false;
    let cleanup = () => {};
    void tick().then(() => {
      if (disposed) return;
      const main = document.getElementById('main-content');
      if (main) cleanup = installPageAnnotations(main, path);
    });
    return () => { disposed = true; cleanup(); };
  });
</script>

<style>
  :global(.agency-annotation-controls) { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-performance-sm); margin-block: var(--space-performance-md); }
  :global(.performance-evidence-index > .agency-annotation-controls) { margin-inline: 1.25rem; }
  :global(.agency-annotation-button) { appearance: none; font: inherit; font-size: var(--text-sm, .875rem); color: inherit; background: transparent; border: 1px solid currentColor; border-radius: var(--radius-performance-sm); padding: var(--space-performance-xs) var(--space-performance-sm); min-height: 44px; max-width: 100%; text-align: left; line-height: 1.5; white-space: normal; cursor: pointer; }
  :global(.agency-annotation-button:hover) { text-decoration: underline; }
  :global(.agency-annotation-button:focus-visible) { outline: 2px solid currentColor; outline-offset: 3px; }
  :global(.agency-annotation-status) { font-size: var(--text-xs, .75rem); line-height: 1.5; max-width: 38ch; }
</style>
