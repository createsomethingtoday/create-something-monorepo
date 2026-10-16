<script lang="ts">
  import { Button } from '@create-something/canon';
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

<div class="brief-workspace" data-no-track data-analytics-ignore>
  <header>
    <p class="brief-eyebrow">AI-native technical support · Local preview</p>
    <h1>Make the problem clear.</h1>
    <p>Describe one real workflow. Review the evidence, boundaries and unknowns before sharing it with an accountable expert.</p>
    <p class="boundary">This form keeps your brief in page memory. Reloading clears it. Export requests a file download; it does not open a ticket or authorize work. Omit passwords, tokens and confidential customer details.</p>
  </header>
  <section aria-labelledby="agent-heading">
    <h2 id="agent-heading">Start with your agent, or write here.</h2>
    <p>Ask your agent to help describe the workflow using the <a href="/api/support-brief">versioned brief contract</a>. Paste its JSON below and review it. Your agent’s host controls its own data handling and available tools.</p>
    <details>
      <summary>Import a prepared brief</summary>
      <label for="brief-import">Brief JSON</label>
      <textarea id="brief-import" bind:value={incoming} rows="6" maxlength="40000" spellcheck="false"></textarea>
      <Button variant="secondary" onclick={load}>Import for review</Button>
    </details>
  </section>
  <form aria-label="Support brief" onsubmit={(event) => { event.preventDefault(); dispatch({ type: 'prepare' }); }}>
    {#each fields as [key, field]}
      <div class="field" class:field-wide={key !== 'tools' && key !== 'owner'}>
        <label for={`brief-${key}`}>{field.label}{field.required ? ' (required)' : ' (optional)'}</label>
        <textarea id={`brief-${key}`} value={model.brief[key]} oninput={(event) => dispatch({ type: 'edit', field: key, value: event.currentTarget.value })} rows={key === 'workflow' || key === 'owner' ? 2 : 3} required={field.required} maxlength={field.maxLength}></textarea>
      </div>
    {/each}
    <div class="brief-actions">
      <Button type="submit">Prepare for review</Button>
      <Button variant="secondary" onclick={() => { incoming = ''; dispatch({ type: 'clear' }); }}>Clear brief</Button>
    </div>
  </form>
  {#if model.error}<p class="brief-error" role="alert">{model.error}</p>{/if}
  <p role="status" aria-live="polite">{model.notice}</p>
  {#if model.phase === 'prepared'}
    <section aria-labelledby="review-heading">
      <h2 id="review-heading">Review before sharing</h2>
      <p>Confirm the evidence and remove anything the recipient should not receive. Arrange the recipient and scope separately; this preview has no submission connection.</p>
      <pre aria-label="Prepared support brief">{model.prepared}</pre>
      <div class="brief-actions">
        <Button onclick={() => download('json')}>Export JSON</Button>
        <Button variant="secondary" onclick={() => download('md')}>Export Markdown</Button>
      </div>
    </section>
  {/if}
</div>

<style>
  .brief-workspace { width: min(var(--content-width-performance), 86%); margin-inline: auto; padding-block: var(--space-performance-lg) var(--space-performance-2xl); font-family: var(--font-performance-interface); }
  header, section, form { max-width: 52rem; margin-block-end: var(--space-performance-lg); }
  header { padding-block-end: var(--space-performance-sm); border-bottom: 1px solid var(--color-performance-line); }
  h1 { max-width: 24ch; margin-block: var(--space-performance-sm); font: var(--font-performance-medium) var(--text-performance-h1)/var(--leading-performance-tight) var(--font-performance-interface); letter-spacing: var(--tracking-performance-tight); }
  h2 { margin-block-end: var(--space-performance-sm); font: var(--font-performance-medium) var(--text-performance-h2)/var(--leading-performance-tight) var(--font-performance-interface); }
  p { max-width: 70ch; line-height: var(--leading-performance-relaxed); margin-block: var(--space-performance-sm); }
  .brief-eyebrow { color: var(--color-performance-muted); font: var(--text-performance-operator-label) var(--font-performance-mono); text-transform: uppercase; }
  .boundary { padding-inline-start: var(--space-performance-md); border-inline-start: 2px solid var(--color-performance-line-strong); color: var(--color-performance-muted); font-size: var(--text-performance-body-sm); }
  form { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--space-performance-md); }
  .field { min-width: 0; }
  .field-wide, .brief-actions { grid-column: 1 / -1; }
  label { display: block; margin-block-end: var(--space-performance-xs); font-size: var(--text-performance-body-sm); font-weight: var(--font-performance-medium); }
  textarea { display: block; width: 100%; box-sizing: border-box; background: var(--color-performance-panel); color: var(--color-performance-ink); border: 1px solid var(--color-performance-line-strong); border-radius: var(--radius-performance-sm); padding: var(--space-performance-sm) var(--space-performance-md); font: inherit; line-height: var(--leading-performance-normal); resize: vertical; }
  .brief-actions { display: flex; flex-wrap: wrap; gap: var(--space-performance-sm); }
  :is(textarea, summary, a):focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 3px; }
  details { margin-block-start: var(--space-performance-md); border-block: 1px solid var(--color-performance-line); padding-block-end: var(--space-performance-sm); }
  details textarea { margin-block-end: var(--space-performance-sm); font-family: var(--font-performance-code); }
  summary { display: list-item; cursor: pointer; min-height: var(--height-performance-control-min); align-content: center; padding-block: var(--space-performance-xs); }
  a { color: inherit; text-decoration: underline; text-underline-offset: 0.2em; }
  pre { white-space: pre-wrap; overflow-wrap: anywhere; border: 1px solid var(--color-performance-line-strong); border-radius: var(--radius-performance-sm); background: var(--color-performance-panel); padding: var(--space-performance-md); font: var(--text-performance-body-sm)/var(--leading-performance-relaxed) var(--font-performance-code); }
  .brief-error { border-inline-start: 2px solid var(--color-performance-error); padding-inline-start: var(--space-performance-md); }
  @media (max-width: 40rem) { form { grid-template-columns: minmax(0, 1fr); } .brief-actions { flex-direction: column; align-items: stretch; } }
</style>
