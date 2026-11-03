<script lang="ts">
  interface Props { kind: 'signal' | 'decision' | 'proof'; }
  let { kind }: Props = $props();
  let selected = $state(0);
  const cases = {
    signal: [
      { label: 'Source update', state: 'Needs review', title: 'A support answer changed.', reason: 'A source article has a new revision. The draft still cites the earlier version.', detail: 'Owner: support lead · Source: example article, revision 2', record: 'Next: compare the new source before using the draft.' },
      { label: 'Missing source', state: 'Waiting', title: 'The source cannot be checked.', reason: 'The article is unavailable. The update stays visible without treating the missing evidence as an answer.', detail: 'Owner: support lead · Source: unavailable', record: 'Next: ask for a current source. No reply is sent.' }
    ],
    decision: [
      { label: 'Request evidence', state: 'Waiting', title: 'Hold the proposed reply.', reason: 'Ask for the current article and a revised draft before deciding.', detail: 'Owner: support lead · Proposed action: send a customer reply', record: 'Illustrated outcome: evidence requested; no reply sent.' },
      { label: 'Approve draft', state: 'Reviewed', title: 'Approve this draft for the next step.', reason: 'The owner reviewed the current source and the proposed wording. Sending still follows the agreed tool permissions.', detail: 'Owner: support lead · Boundary: this example does not send', record: 'Illustrated outcome: draft approved; no tool is connected.' },
      { label: 'Stop', state: 'Stopped', title: 'Keep the reply from proceeding.', reason: 'The proposed answer is outside the agreed task. A new scope decision is needed.', detail: 'Owner: support lead · Reason: outside scope', record: 'Illustrated outcome: stopped with a reason; no reply sent.' }
    ],
    proof: [
      { label: 'Result', state: 'Recorded example', title: 'The draft stayed in review.', reason: 'The owner requested current evidence instead of sending an unverified answer.', detail: 'Task: support reply · Decision: request evidence', record: 'Result: waiting for a current source; no external action.' },
      { label: 'Evidence', state: 'Source context', title: 'Keep the reason beside the result.', reason: 'The draft cited revision 1. The source update identified revision 2. Those are separate from the owner’s decision.', detail: 'Source: example article · Draft: example reply', record: 'Private logs and credentials do not belong in this public example.' },
      { label: 'Recovery', state: 'Next owner', title: 'A clear way to continue.', reason: 'The support lead can supply the current source, revise the draft and request review again.', detail: 'Next owner: support lead · Recovery: repeat the source check', record: 'No rollback is needed: this example made no external change.' }
    ]
  } as const;
  const options = $derived(cases[kind]);
  const current = $derived(options[Math.min(selected, options.length - 1)]);
</script>

<section class="example" aria-label={`${kind} synthetic workflow example`}>
  <div class="example-label"><span>Synthetic example</span><span>No connected tools</span></div>
  <p class="workflow">Support request → draft → human review</p>
  <div class="choices" aria-label={`Inspect a ${kind} example state`}>
    {#each options as option, index}<button type="button" aria-pressed={selected === index} onclick={() => selected = index}>{option.label}</button>{/each}
  </div>
  <div class="record" aria-live="polite">
    <p class="state">{current.state}</p><h2>{current.title}</h2><p>{current.reason}</p><p class="detail">{current.detail}</p><p class="receipt">{current.record}</p>
  </div>
</section>

<style>
  .example { width: 100%; min-width: 0; padding: clamp(1rem, 2vw, 2rem); background: var(--color-performance-shell-surface); color: var(--color-performance-fg-primary); border: 1px solid var(--color-performance-shell-border-strong); }
  .example-label { display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--space-performance-sm); font: 11px/1.6 var(--font-performance-mono); color: var(--color-performance-fg-secondary); }
  .example-label span:first-child { color: var(--color-performance-fg-primary); }
  .workflow { margin: var(--space-performance-md) 0; font-size: var(--text-performance-body-sm); line-height: 1.6; }
  .choices { display: flex; gap: var(--space-performance-sm); flex-wrap: wrap; border-block: 1px solid var(--color-performance-shell-border-default); }
  button { min-height: 44px; padding: var(--space-performance-xs) var(--space-performance-sm); border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--color-performance-fg-secondary); cursor: pointer; font: inherit; font-size: var(--text-performance-caption); }
  button[aria-pressed='true'] { color: var(--color-performance-fg-primary); border-color: currentColor; }
  button:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
  .record { padding-top: var(--space-performance-lg); }
  .state { font: 11px/1.6 var(--font-performance-mono); color: var(--color-performance-fg-secondary); text-transform: uppercase; }
  h2 { font: var(--font-performance-medium) clamp(1.4rem, 2.5vw, 2.2rem)/1.12 var(--font-performance-interface); letter-spacing: var(--tracking-performance-tight); margin: var(--space-performance-sm) 0 var(--space-performance-md); }
  .record > p:not(.state) { font-size: var(--text-performance-body-sm); line-height: 1.65; margin: 0 0 var(--space-performance-md); }
  .detail { color: var(--color-performance-fg-secondary); }
  .receipt { border-top: 1px solid var(--color-performance-shell-border-default); padding-top: var(--space-performance-md); margin-bottom: 0!important; }
  @media(prefers-reduced-motion: reduce) { * { transition: none; } }
</style>
