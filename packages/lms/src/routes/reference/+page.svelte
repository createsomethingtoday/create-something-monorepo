<script lang="ts">
  import { page } from '$app/stores';
  import { REFERENCE_CATALOG, REFERENCE_PHASES, REFERENCE_REVISION } from '$lib/content/reference';

  let query = $state('');
  let phase = $state($page.url.searchParams.get('phase') ?? 'all');
  let results = $derived(
    REFERENCE_CATALOG.filter((item) =>
      (phase === 'all' || item.phase === phase) &&
      `${item.title} ${item.phase} ${item.lesson}`.toLowerCase().includes(query.toLowerCase().trim())
    )
  );
</script>

<svelte:head>
  <title>AI Engineering Reference Library | CREATE SOMETHING Learn</title>
  <meta name="description" content="Explore 523 open source AI engineering lessons, from math foundations to agent systems, alongside CREATE SOMETHING field practice." />
</svelte:head>

<div class="reference-shell">
  <nav class="breadcrumb"><a href="/">Learn</a><span>/</span><span>Reference library</span></nav>
  <header>
    <p class="eyebrow">Open reference library / 523 lessons</p>
    <h1>Study the mechanics. Build the system.</h1>
    <p class="intro">Explore the full English lesson sequence from <a href="https://github.com/rohitg00/ai-engineering-from-scratch">AI Engineering from Scratch</a>, alongside our <a href="/paths/governed-agent-engineering">governed agent field course</a>. The original curriculum spans mathematics, machine learning, language models, tools, agents, infrastructure, safety, and capstones.</p>
    <p class="source-note">Reference material by Rohit Ghumare and contributors, <a href="/reference-license.txt">MIT licensed</a>. Imported at revision <a href={`https://github.com/rohitg00/ai-engineering-from-scratch/commit/${REFERENCE_REVISION}`}>{REFERENCE_REVISION.slice(0, 12)}</a>. Runnable code and outputs remain linked to the source repository.</p>
    <p class="source-note"><a href="/foundation">Connect your agent to this foundation ↗</a> — public search and lesson retrieval, with a reusable onboarding guide.</p>
  </header>

  <div class="controls">
    <label for="reference-search">Find a lesson</label>
    <input id="reference-search" type="search" bind:value={query} placeholder="Search concepts, tools, or lesson titles" />
    <label for="reference-phase">Phase</label>
    <select id="reference-phase" bind:value={phase}>
      <option value="all">All phases</option>
      {#each REFERENCE_PHASES as item}
        <option value={item.id}>{item.id.slice(0, 2)} · {item.title} ({item.count})</option>
      {/each}
    </select>
  </div>

  <p class="result-count">{results.length} {results.length === 1 ? 'lesson' : 'lessons'}</p>
  <div class="result-list">
    {#each results as item}
      <a href={`/reference/${item.phase}/${item.lesson}`} class="result">
        <span class="phase-label">{item.phase.slice(0, 2)} / {item.phase.replace(/^\d+-/, '').replaceAll('-', ' ')}</span>
        <strong>{item.title}</strong>
        <span class="duration">{item.time} ↗</span>
      </a>
    {:else}
      <p class="empty">No lessons match this search. Try a broader term or another phase.</p>
    {/each}
  </div>
</div>

<style>
  .reference-shell { width: min(72rem, calc(100% - 2.5rem)); margin: 0 auto; padding: 2rem 0 5rem; color: var(--color-performance-ink); }
  .breadcrumb { display: flex; gap: .6rem; font-size: .8rem; color: var(--color-performance-muted); margin-bottom: 2rem; }
  a { color: inherit; }
  .eyebrow, .source-note, .phase-label, .duration, .result-count { font: .78rem var(--font-performance-mono); color: var(--color-performance-muted); }
  .eyebrow, .phase-label { text-transform: uppercase; letter-spacing: .06em; }
  h1 { max-width: 16ch; font-size: clamp(2.3rem, 5vw, 4.5rem); line-height: 1.05; letter-spacing: -.05em; margin: .5rem 0 1rem; }
  .intro { max-width: 48rem; font-size: 1.1rem; line-height: 1.6; }
  .source-note { max-width: 48rem; line-height: 1.6; margin-top: 1.5rem; }
  .controls { display: grid; grid-template-columns: minmax(0, 2fr) minmax(12rem, 1fr); gap: .5rem 1rem; margin: 3rem 0 1.5rem; }
  .controls label { font-size: .8rem; font-weight: 600; }
  .controls label:nth-of-type(2) { grid-column: 2; grid-row: 1; }
  input, select { min-width: 0; width: 100%; padding: .8rem; border: 1px solid var(--color-performance-line); border-radius: 4px; background: var(--color-performance-panel); color: var(--color-performance-ink); font: inherit; }
  .result-list { border-top: 1px solid var(--color-performance-line); }
  .result { display: grid; grid-template-columns: minmax(10rem, 1fr) minmax(0, 2fr) auto; align-items: center; gap: 1rem; padding: 1rem .5rem; border-bottom: 1px solid var(--color-performance-line); text-decoration: none; }
  .result:hover, .result:focus-visible { background: var(--color-performance-court); }
  .result strong { font-size: 1rem; }
  .empty { padding: 2rem 0; color: var(--color-performance-muted); }
  @media (max-width: 650px) { .controls { grid-template-columns: 1fr; } .controls label:nth-of-type(2) { grid-column: 1; grid-row: 3; } .result { grid-template-columns: 1fr; gap: .35rem; } }
</style>
