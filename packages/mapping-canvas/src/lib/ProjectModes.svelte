<script lang="ts">
  let { id, mode, navigate } = $props<{
    id: string;
    mode: 'canvas' | 'motion' | 'preview';
    navigate?: (event: MouseEvent, mode: 'canvas' | 'motion' | 'preview') => void;
  }>();
</script>

<nav aria-label="Project mode" class="project-modes">
  {#each ['canvas', 'motion', 'preview'] as entry}
    <a
      data-sveltekit-reload
      class:active={mode === entry}
      aria-current={mode === entry ? 'page' : undefined}
      href={`${entry === 'canvas' ? '/' : '/animate'}?project=${encodeURIComponent(id)}${entry === 'preview' ? '&mode=preview' : ''}`}
      onclick={(event) => navigate?.(event, entry as 'canvas' | 'motion' | 'preview')}
      >{entry.charAt(0).toUpperCase() + entry.slice(1)}</a
    >
  {/each}
</nav>

<style>
  .project-modes {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border: 1px solid var(--alfred-rule);
    border-radius: 4px;
    flex-shrink: 0;
  }
  .project-modes a {
    padding: 7px 10px;
    text-decoration: none;
    text-transform: capitalize;
    border-radius: 2px;
    color: var(--alfred-gray);
    font: 500 12px var(--alfred-sans);
  }
  .project-modes a.active {
    background: var(--alfred-tile);
    color: var(--alfred-ink);
  }
  .project-modes a:hover {
    color: var(--alfred-ink);
  }
  .project-modes a:focus-visible {
    outline: 2px solid var(--alfred-ink);
  }
</style>
