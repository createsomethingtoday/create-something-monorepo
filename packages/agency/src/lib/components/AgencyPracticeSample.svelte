<script lang="ts">
  let choice = $state<'draft' | 'send' | 'review' | null>(null);
  const responses = {
    draft: 'Draft prepared. A person still decides what may be sent.',
    send: 'Stop here. This example has no permission to send a reminder.',
    review: 'The draft and source record are ready for the named owner to review.'
  };
</script>

<section class="practice-sample" id="short-practice" data-practice-sample aria-labelledby="sample-title">
  <header><p class="eyebrow">One short example / synthetic and local only</p><h2 id="sample-title">Prepare the work.<br />Keep the decision.</h2><p>An example invoice is three days overdue. The agent can read its status and prepare a reminder. Sending needs the owner’s approval.</p></header>
  <div class="sample-task" aria-label="Example workflow">
    <ol><li><span>01 / Source</span><strong>Overdue invoice</strong><small>Synthetic record · no client data</small></li><li><span>02 / Preparation</span><strong>Draft a reminder</strong><small>Allowed in this example</small></li><li><span>03 / Decision</span><strong>Owner reviews</strong><small>Sending remains approval-required</small></li></ol>
    <div class="sample-actions" aria-label="Choose a sample action"><button type="button" aria-pressed={choice === 'draft'} onclick={() => { choice = 'draft'; }}>Prepare a draft</button><button type="button" aria-pressed={choice === 'send'} onclick={() => { choice = 'send'; }}>Try sending it</button><button type="button" aria-pressed={choice === 'review'} onclick={() => { choice = 'review'; }}>Ask for approval</button></div>
    <p class="sample-result" role="status" aria-live="polite">{choice ? responses[choice] : 'Choose an action to inspect its boundary. Nothing is sent or saved.'}</p>
    <p class="sample-limit">Illustrative decision feedback only. No model, connected account, email or live invoice is used.</p>
  </div>
  <a class="continue" href="#practice-workbench">Continue to the ten-stage internal preview →</a>
</section>

<style>
  .practice-sample { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); gap: var(--space-performance-xl); padding: clamp(2rem, 6vw, 6rem) max(1.25rem, 6vw); border-block: 1px solid var(--color-performance-line); color: var(--color-performance-ink); background: var(--color-performance-paper); scroll-margin-top: 7rem; }
  header, .sample-task { min-width: 0; }
  .eyebrow, li span, li small, .sample-limit { font: var(--text-performance-caption)/1.6 var(--font-performance-mono); }
  .eyebrow { margin: 0 0 var(--space-performance-md); }
  h2 { margin: 0 0 var(--space-performance-md); font: var(--font-performance-medium) clamp(2rem, 4vw, 4rem)/1.05 var(--font-performance-interface); letter-spacing: var(--tracking-performance-tight); }
  header > p:last-child { max-width: 42ch; margin: 0; line-height: 1.6; }
  ol { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--color-performance-line); }
  li { display: grid; gap: var(--space-performance-sm); align-content: start; padding: var(--space-performance-md) var(--space-performance-sm) var(--space-performance-md) 0; }
  li strong { font-size: var(--text-performance-body); font-weight: var(--font-performance-medium); }
  .sample-actions { display: flex; flex-wrap: wrap; gap: var(--space-performance-sm); border-top: 1px solid var(--color-performance-line); padding-top: var(--space-performance-md); }
  button { min-height: 44px; padding: var(--space-performance-sm) var(--space-performance-md); border: 1px solid var(--color-performance-line); background: transparent; color: inherit; font: inherit; cursor: pointer; }
  button[aria-pressed='true'] { background: var(--color-performance-ink); color: var(--color-performance-paper); }
  button:focus-visible, a:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 4px; }
  .sample-result { min-height: 4.5em; margin: var(--space-performance-md) 0 0; padding-block: var(--space-performance-sm); font-size: var(--text-performance-body); line-height: 1.6; }
  .sample-limit { margin: 0; }
  .continue { grid-column: 1 / -1; display: inline-flex; align-items: center; min-height: 44px; color: inherit; text-underline-offset: .25em; }
  @media(max-width: 760px) { .practice-sample { grid-template-columns: 1fr; gap: var(--space-performance-lg); } }
  @media(max-width: 600px) { ol { grid-template-columns: 1fr; } li { grid-template-columns: minmax(0, .65fr) minmax(0, 1.35fr); column-gap: var(--space-performance-sm); } li span { grid-row: 1 / 3; } li small { grid-column: 2; } li + li { border-top: 1px solid var(--color-performance-line); } }
</style>
