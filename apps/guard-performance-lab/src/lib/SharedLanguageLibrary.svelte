<script lang="ts">
  import { glossary } from './data.js';
  import SharedLanguageCourt from './SharedLanguageCourt.svelte';

  type TermPhase = 'all' | 'now' | 'next' | 'later';

  let search = $state('');
  let termPhase = $state<TermPhase>('all');
  let selectedTerm = $state<string>(glossary[0][0]);
  let filteredTerms = $derived(glossary.filter(([term, meaning, phase]) => {
    const matchesPhase = termPhase === 'all' || phase === termPhase;
    const needle = search.trim().toLowerCase();
    return matchesPhase && (!needle || `${term} ${meaning}`.toLowerCase().includes(needle));
  }));

  $effect(() => {
    if (filteredTerms.length && !filteredTerms.some(([term]) => term === selectedTerm)) {
      selectedTerm = filteredTerms[0][0];
    }
  });
</script>

<div class="toolbar">
  <input
    class="input"
    type="search"
    bind:value={search}
    aria-label="Search basketball terms"
    placeholder="Search term or meaning"
  />
  {#each ['all', 'now', 'next', 'later'] as phase}
    <button
      class:active={termPhase === phase}
      class="filter mono"
      aria-pressed={termPhase === phase}
      onclick={() => (termPhase = phase as TermPhase)}>{phase}</button
    >
  {/each}
</div>

{#if filteredTerms.length}
  <div class="language-layout">
    <div class="stage-column" id="language-animation-stage">
      <SharedLanguageCourt term={selectedTerm} />
    </div>
    <div class="term-grid" aria-label="Shared basketball terms">
      {#each filteredTerms as [term, meaning, phase]}
        <button
          class="term"
          class:active={selectedTerm === term}
          type="button"
          data-animation-term={term}
          aria-pressed={selectedTerm === term}
          aria-label={`Show animated example for ${term}`}
          aria-controls="language-animation-stage"
          onclick={() => (selectedTerm = term)}
        >
          <strong>{term}</strong>
          <p>{meaning}</p>
          <span class="pill">{phase}</span>
          <span class="play-cue mono" aria-hidden="true">{selectedTerm === term ? 'selected' : 'view motion'} →</span>
        </button>
      {/each}
    </div>
  </div>
{:else}
  <div class="empty">No shared term matches that search.</div>
{/if}

<style>
  .toolbar button:focus-visible,
  .term:focus-visible {
    outline: 3px solid var(--color-performance-focus);
    outline-offset: 2px;
  }
  .language-layout {
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(350px, 0.75fr);
    gap: 16px;
    align-items: start;
  }
  .stage-column {
    position: sticky;
    top: 12px;
    min-width: 0;
  }
  .stage-column :global(.language-example) {
    margin: 0;
  }
  .term-grid {
    grid-template-columns: 1fr;
    align-content: start;
  }
  .term {
    position: relative;
    width: 100%;
    border: 1px solid transparent;
    border-bottom-color: var(--color-performance-line);
    color: var(--color-performance-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .term:hover {
    border-color: var(--color-performance-line-strong);
  }
  .term.active {
    border-color: var(--color-performance-ink);
    box-shadow: inset 4px 0 0 var(--color-performance-pressure);
  }
  .term .play-cue {
    grid-column: 1 / -1;
    color: var(--color-performance-signal);
    font-size: 8px;
    text-transform: uppercase;
  }
  .term.active .play-cue {
    color: var(--color-performance-pressure);
  }
  @media (max-width: 1120px) {
    .language-layout { grid-template-columns: 1fr; }
    .stage-column { position: static; }
    .term-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 720px) {
    .term-grid { grid-template-columns: 1fr; }
  }
</style>
