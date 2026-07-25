<script lang="ts">
  import type { DatabaseLayerSystemContextLens } from '@create-something/database-layer';
  import { getTemplateReviewSystemContext } from '$lib/system-context/template-review';

  export let defaultLens: DatabaseLayerSystemContextLens = 'authority';
  export let readOnly = false;
  export let title = 'See the operating boundary before work runs.';
  export let state: 'ready' | 'empty' | 'error' = 'ready';

  const lensLabels: Record<DatabaseLayerSystemContextLens, string> = {
    dependencies: 'Dependencies',
    authority: 'Authority',
    change: 'Change',
    proof: 'Proof'
  };

  let selectedLens: DatabaseLayerSystemContextLens = defaultLens;
  let projection = getTemplateReviewSystemContext(selectedLens);
  let selectedId = projection.visibleNodeIds[0] ?? projection.nodes[0]?.id;

  $: projection = getTemplateReviewSystemContext(selectedLens);
  $: visibleIds = new Set(projection.visibleNodeIds);
  $: selected = projection.nodes.find((node) => node.id === selectedId) ?? projection.nodes[0];

  function chooseLens(lens: DatabaseLayerSystemContextLens) {
    if (readOnly) return;
    selectedLens = lens;
    selectedId = getTemplateReviewSystemContext(lens).visibleNodeIds[0];
  }
</script>

<section class:read-only={readOnly} class="system-context" aria-label="Public workflow system context">
  <header class="system-context__header">
    <div>
      <span>Public worked example</span>
      <h3>{title}</h3>
      <p>{projection.workflow.boundary}</p>
    </div>
    <div class="freshness" data-state={projection.source.freshness}>
      <i aria-hidden="true"></i>
      {projection.source.freshness === 'current' ? projection.receipt.lastCheckedLabel : 'Review date reached'}
    </div>
  </header>

  <nav class="lens-tabs" aria-label="System context lenses">
    {#each Object.entries(lensLabels) as [lens, label]}
      <button
        type="button"
        class:active={selectedLens === lens}
        aria-pressed={selectedLens === lens}
        disabled={readOnly}
        on:click={() => chooseLens(lens as DatabaseLayerSystemContextLens)}>{label}</button
      >
    {/each}
  </nav>

  {#if state === 'empty'}
    <div class="context-state" role="status">
      <span>No public context yet</span>
      <strong>Start with a named owner and workflow boundary.</strong>
      <p>Nothing can run from this view. Add reviewed context in Map before using it in Control.</p>
    </div>
  {:else if state === 'error'}
    <div class="context-state context-state--error" role="alert">
      <span>Context unavailable</span>
      <strong>The reviewed workflow definition could not be read.</strong>
      <p>Keep work stopped and return to the named owner until the source can be verified.</p>
    </div>
  {:else}
  <div class="system-context__body">
    <aside class="workflow-rail">
      <span>Workflow</span>
      <strong>{projection.workflow.label}</strong>
      <p>{projection.workflow.summary}</p>
      <dl>
        <div><dt>Source</dt><dd>{projection.source.label}</dd></div>
        <div><dt>Boundary</dt><dd>Human judgment retained</dd></div>
        <div><dt>Recovery</dt><dd>Named human owner</dd></div>
      </dl>
    </aside>

    <div class="context-board" aria-label={`${lensLabels[selectedLens]} view`}>
      {#each projection.nodes as node}
        <button
          type="button"
          class:visible={visibleIds.has(node.id)}
          class:selected={selected?.id === node.id}
          class:stop={node.semantics.authority === 'stop'}
          on:click={() => (selectedId = node.id)}
          aria-pressed={selected?.id === node.id}
        >
          <span>{node.kind}</span>
          <strong>{node.label}</strong>
          <small>{node.semantics.authority}</small>
        </button>
      {/each}
    </div>

    {#if selected}
      <aside class="inspector" aria-live="polite">
        <span>Selected context</span>
        <h4>{selected.label}</h4>
        <p>{selected.summary}</p>
        <dl>
          <div><dt>Owner</dt><dd>{selected.owner}</dd></div>
          <div><dt>Authority</dt><dd>{selected.semantics.authority}</dd></div>
          <div><dt>Evidence</dt><dd>{selected.evidence[0] ?? 'Not required'}</dd></div>
          <div><dt>Source</dt><dd>{selected.provenance.kind}</dd></div>
        </dl>
        <footer><span>Recovery</span><p>{selected.recovery}</p></footer>
      </aside>
    {/if}
  </div>
  {/if}

  <footer class="receipt-rail">
    <span>Change</span><strong>{projection.receipt.changeLabel}</strong>
    <span>Proof</span><strong>{projection.receipt.sourceLabel}</strong>
  </footer>
</section>

<style>
  .system-context { border: 1px solid #c8c8c2; border-radius: 6px; background: #f8f8f5; color: #111; overflow: hidden; box-shadow: 0 18px 48px rgb(24 24 20 / 8%); }
  .system-context__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 2rem; padding: 1.25rem 1.5rem; border-bottom: 1px solid #d8d8d2; background: #fff; }
  .system-context__header span, .workflow-rail > span, .inspector > span, .receipt-rail > span { font-family: var(--font-performance-mono); font-size: .68rem; letter-spacing: .08em; text-transform: uppercase; color: #696963; }
  h3 { margin: .35rem 0; font-size: clamp(1.15rem, 2vw, 1.65rem); }
  h4 { margin: .35rem 0 .65rem; font-size: 1.15rem; }
  p { margin: 0; color: #60605a; line-height: 1.5; }
  .freshness { display: flex; flex: 0 0 auto; align-items: center; gap: .45rem; padding: .45rem .65rem; border: 1px solid #cfcfc8; border-radius: 999px; font-family: var(--font-performance-mono); font-size: .68rem; text-transform: uppercase; }
  .freshness i { width: .5rem; height: .5rem; border-radius: 50%; background: #377a54; }
  .freshness[data-state='stale'] i { background: #a65b28; }
  .lens-tabs { display: flex; gap: .35rem; padding: .75rem 1rem; border-bottom: 1px solid #d8d8d2; background: #eeeeea; overflow-x: auto; }
  .lens-tabs button { padding: .48rem .7rem; border: 1px solid transparent; border-radius: 3px; background: transparent; color: #55554f; font: 600 .72rem var(--font-performance-mono); text-transform: uppercase; cursor: pointer; }
  .lens-tabs button.active { border-color: #adada6; background: #fff; color: #111; }
  .lens-tabs button:focus-visible, .context-board button:focus-visible { outline: 3px solid #2774d6; outline-offset: 2px; }
  .read-only .lens-tabs button:not(.active) { display: none; }
  .system-context__body { display: grid; grid-template-columns: minmax(10rem, .68fr) minmax(22rem, 1.65fr) minmax(12rem, .8fr); min-height: 31rem; }
  .context-state { display: grid; place-content: center; gap: .6rem; min-height: 24rem; padding: 2rem; text-align: center; background-color: #f1f1ed; background-image: radial-gradient(#c8c8c1 .7px, transparent .7px); background-size: 16px 16px; }
  .context-state span { color: #696963; font: .68rem var(--font-performance-mono); letter-spacing: .08em; text-transform: uppercase; }
  .context-state strong { font-size: clamp(1.2rem, 2.5vw, 2rem); }
  .context-state--error strong { color: #7b463a; }
  .workflow-rail, .inspector { padding: 1.25rem; background: #fff; }
  .workflow-rail { border-right: 1px solid #d8d8d2; }
  .workflow-rail strong { display: block; margin: .5rem 0; font-size: 1rem; }
  dl { display: grid; gap: .75rem; margin: 1.25rem 0 0; }
  dl div { display: grid; gap: .2rem; }
  dt { color: #777770; font: .64rem var(--font-performance-mono); text-transform: uppercase; }
  dd { margin: 0; font-size: .82rem; line-height: 1.4; }
  .context-board { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-content: center; gap: .75rem; padding: 1.5rem; background-color: #f1f1ed; background-image: radial-gradient(#c8c8c1 .7px, transparent .7px); background-size: 16px 16px; }
  .context-board button { display: grid; grid-template-columns: 1fr auto; gap: .35rem .65rem; min-height: 6rem; padding: .85rem; border: 1px solid #c5c5bf; border-left: 4px solid #a1a19a; border-radius: 3px; background: rgb(255 255 255 / 92%); text-align: left; opacity: .42; cursor: pointer; transition: opacity .16s ease, transform .16s ease, box-shadow .16s ease; }
  .context-board button.visible { border-left-color: #477e65; opacity: 1; }
  .context-board button.stop { border-left-color: #a55245; }
  .context-board button.selected { transform: translateY(-2px); box-shadow: 0 9px 20px rgb(30 30 25 / 12%); }
  .context-board button span, .context-board button small { font: .62rem var(--font-performance-mono); text-transform: uppercase; color: #6e6e67; }
  .context-board button strong { grid-column: 1 / -1; font-size: .92rem; }
  .context-board button small { grid-column: 2; grid-row: 1; }
  .inspector { border-left: 1px solid #d8d8d2; }
  .inspector footer { margin-top: 1.35rem; padding-top: 1rem; border-top: 1px solid #d8d8d2; }
  .inspector footer span { color: #7b463a; font: .66rem var(--font-performance-mono); text-transform: uppercase; }
  .inspector footer p { margin-top: .35rem; font-size: .8rem; }
  .receipt-rail { display: grid; grid-template-columns: auto 1fr auto 1fr; align-items: center; gap: .6rem 1rem; padding: .85rem 1.25rem; border-top: 1px solid #d8d8d2; background: #171715; color: #fff; }
  .receipt-rail > span { color: #a9a9a2; }
  .receipt-rail strong { font-size: .78rem; font-weight: 500; }
  @media (prefers-reduced-motion: reduce) { .context-board button { transition: none; } }
  @media (max-width: 800px) {
    .system-context__header { flex-direction: column; gap: 1rem; }
    .system-context__body { grid-template-columns: 1fr; }
    .workflow-rail { border-right: 0; border-bottom: 1px solid #d8d8d2; }
    .context-board { grid-template-columns: 1fr; min-height: 29rem; padding: 1rem; }
    .context-board button { min-height: 5.25rem; }
    .inspector { border-top: 1px solid #d8d8d2; border-left: 0; }
    .receipt-rail { grid-template-columns: auto 1fr; }
  }
</style>
