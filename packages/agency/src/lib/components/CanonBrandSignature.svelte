<script lang="ts">
  import CanonCompanion from './CanonCompanion.svelte';
  let hello = 0;
  let open = false;
</script>
<div class="signature">
  <div class="companion"><CanonCompanion pose="look-up-right" trigger={hello} /><button type="button" aria-expanded={open} aria-controls="canon-origin" onclick={() => { open = !open; if (open) hello++; }}>Say hello to Canon</button></div>
  {#if open}<p id="canon-origin">Canon is our quietly capable companion: a graphite cube with a curious gaze and a small two-foot hop.</p>{/if}
</div>
<style>
  .signature { padding: var(--space-performance-md) max(1.25rem, calc((100% - 80rem) / 2)) 0; color: var(--color-performance-ink); background: var(--color-performance-paper); }
  .companion { display: flex; align-items: center; gap: var(--space-performance-sm); }
  button { background: transparent; color: inherit; border: 0; text-decoration: underline; min-height: 44px; padding: .5rem; cursor: pointer; font: inherit; }
  button:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
  p { margin: 1rem 0; max-width: 40rem; }
</style>
