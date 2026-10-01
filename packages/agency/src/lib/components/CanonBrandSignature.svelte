<script lang="ts">
  import CanonCompanion from './CanonCompanion.svelte';
  let hello = 0;
  let open = false;
</script>
<div class="signature">
  <CanonCompanion trigger={hello} />
  <div class="signature-copy">
    <p>We build AI agents for useful business tasks. You keep the code, instructions, and work history.</p>
    <button type="button" aria-expanded={open} aria-controls="canon-origin" onclick={() => { open = !open; if (open) hello++; }}>Meet Canon <span aria-hidden="true">{open ? '−' : '+'}</span></button>
    {#if open}<p id="canon-origin">Canon is our quietly capable companion. He accompanies workflow guidance, review and completion.</p>{/if}
  </div>
</div>
<style>
  .signature { display: grid; grid-template-columns: 72px minmax(0, 1fr); align-items: start; gap: var(--space-performance-sm); color: inherit; }
  .signature :global(.canon) { width: 72px; }
  p { margin: 0; font-size: .875rem; line-height: 1.6; }
  button { display: inline-flex; align-items: center; gap: .5rem; background: transparent; color: inherit; border: 0; text-decoration: underline; text-underline-offset: .25em; min-height: 44px; padding: 0; cursor: pointer; font: inherit; font-size: .875rem; }
  button:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 3px; }
  #canon-origin { margin-top: var(--space-performance-sm); color: var(--color-performance-muted); }
</style>
