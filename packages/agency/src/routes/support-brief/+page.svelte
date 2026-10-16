<script lang="ts">
  import { briefFields, parseBrief, briefMarkdown, type BriefField } from '$lib/support-brief/contract';
  import { initialBriefState, reduceBrief, type BriefEvent } from '$lib/support-brief/state';
  let model = $state(initialBriefState());
  let incoming = $state('');
  const fields = Object.entries(briefFields) as [BriefField, (typeof briefFields)[BriefField]][];
  function dispatch(event: BriefEvent) { model = reduceBrief(model, event); }
  function load() { dispatch({ type: 'import', text: incoming }); if (model.phase !== 'invalid') incoming = ''; }
  function download(format: 'json' | 'md') {
    if (model.phase !== 'prepared') return;
    const revision = model.revision;
    try {
      const checked = parseBrief(model.brief);
      const content = format === 'json' ? JSON.stringify(checked, null, 2) : briefMarkdown(checked);
      const url = URL.createObjectURL(new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' }));
      const link = document.createElement('a'); link.href = url; link.download = `support-brief.${format}`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      dispatch({ type: 'export-requested', revision });
    } catch { dispatch({ type: 'export-failed', revision }); }
  }
</script>

<svelte:head>
  <title>Prepare a support brief | CREATE SOMETHING</title>
  <meta name="robots" content="noindex,nofollow" />
  <meta name="description" content="Prepare and review a workflow support brief before sharing it." />
</svelte:head>

<main data-no-track data-analytics-ignore>
  <header>
    <p class="eyebrow">AI-native technical support · Local preview</p>
    <h1>Make the problem clear.</h1>
    <p>Describe one real workflow. Review the evidence, boundaries and unknowns before sharing it with an accountable expert.</p>
    <p class="boundary">This form keeps your brief in page memory. Reloading clears it. Export saves a file; it does not open a ticket or authorize work. Omit passwords, tokens and confidential customer details.</p>
  </header>
  <section aria-labelledby="agent-heading">
    <h2 id="agent-heading">Start with your agent, or write here.</h2>
    <p>Ask your agent to help describe the workflow using the <a href="/api/support-brief">versioned brief contract</a>. Paste its JSON below and review it. Your agent’s host controls its own data handling and available tools.</p>
    <details>
      <summary>Import a prepared brief</summary>
      <label for="brief-import">Brief JSON</label>
      <textarea id="brief-import" bind:value={incoming} rows="6" maxlength="40000" spellcheck="false"></textarea>
      <button type="button" onclick={load}>Import for review</button>
    </details>
  </section>
  <form onsubmit={(event) => { event.preventDefault(); dispatch({ type: 'prepare' }); }}>
    {#each fields as [key, field]}
      <div class="field">
        <label for={`brief-${key}`}>{field.label}{field.required ? ' (required)' : ' (optional)'}</label>
        <textarea id={`brief-${key}`} value={model.brief[key]} oninput={(event) => dispatch({ type: 'edit', field: key, value: event.currentTarget.value })} rows={key === 'workflow' || key === 'owner' ? 2 : 3} required={field.required} maxlength={field.maxLength}></textarea>
      </div>
    {/each}
    <button type="submit">Prepare for review</button>
    <button type="button" onclick={() => { incoming = ''; dispatch({ type: 'clear' }); }}>Clear brief</button>
  </form>
  {#if model.error}<p role="alert">{model.error}</p>{/if}
  <p role="status" aria-live="polite">{model.notice}</p>
  {#if model.phase === 'prepared'}
    <section aria-labelledby="review-heading">
      <h2 id="review-heading">Review before sharing</h2>
      <p>Confirm the evidence and remove anything the recipient should not receive. Arrange the recipient and scope separately; this preview has no submission connection.</p>
      <pre aria-label="Prepared support brief">{model.prepared}</pre>
      <button type="button" onclick={() => download('json')}>Export JSON</button>
      <button type="button" onclick={() => download('md')}>Export Markdown</button>
    </section>
  {/if}
</main>

<style>
  main { max-width: 58rem; margin: auto; padding: var(--space-performance-xl, 4rem) var(--space-performance-md, 1.5rem); }
  header, section, form { margin-bottom: var(--space-performance-xl, 3rem); }
  h1 { font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; letter-spacing: -0.04em; }
  h2 { font-size: 1.5rem; margin-bottom: 1rem; }
  p { max-width: 70ch; line-height: 1.6; margin: 1rem 0; }
  .eyebrow { font-family: var(--font-performance-mono, monospace); font-size: 0.8rem; }
  .boundary { border-left: 2px solid currentColor; padding-left: 1rem; }
  .field { margin-bottom: 1.5rem; }
  label { display: block; margin: 1rem 0 0.5rem; }
  textarea { display: block; width: 100%; box-sizing: border-box; background: transparent; color: inherit; border: 1px solid currentColor; padding: 0.75rem; font: inherit; resize: vertical; }
  button { background: transparent; color: inherit; border: 1px solid currentColor; padding: 0.75rem 1rem; margin: 0.75rem 0.5rem 0 0; cursor: pointer; font: inherit; }
  :is(button, textarea, summary, a, pre):focus-visible { outline: 3px solid currentColor; outline-offset: 4px; }
  summary { cursor: pointer; padding: 0.75rem 0; }
  a { text-decoration: underline; }
  pre { white-space: pre-wrap; overflow-wrap: anywhere; border: 1px solid currentColor; padding: 1rem; font-size: 0.85rem; }
</style>
