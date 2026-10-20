<script lang="ts">
  import { onMount } from 'svelte';
  import ScopefieldAnatomy from './ScopefieldAnatomy.svelte';
  let active = $state(0);
  let mounted = $state(false);
  let reduced = $state(true);
  const steps = [
    { label:'Context', title:'One page. A smaller view.', copy:'The raised page is your browser. The pull-out tray represents a bounded observation from the selected tab and document—not your whole browsing session.', fact:'Local checks: observations exclude input values. Visible text can still be sensitive. Inspect what would be shared before releasing it.', part:'Page → selected context' },
    { label:'Recipient', title:'Name who receives it.', copy:'The tray belongs to a specific task and recipient. Opening a tab is not permission to send its contents to an agent.', fact:'Current local work: Codex observation and a narrow Claude read have been exercised. They are separate integrations, not interchangeable connections.', part:'Selected context → named task' },
    { label:'Approval', title:'A request is not an action.', copy:'The control strip is a human decision gate. Review the target and proposed action before approving. A pending request must stay visibly pending.', fact:'Unverified: the live Codex human-approved action loop. This illustration does not demonstrate a successful agent action.', part:'Proposed action → human decision' },
    { label:'Stop', title:'Keep a way back to you.', copy:'Stop or Take control ends the task’s permission for further actions. It does not prove that an action already in flight was undone.', fact:'Local checks cover permission revocation and cleanup with synthetic tasks. An uncertain effect needs inspection, not a success label.', part:'Stop → further actions revoked' },
    { label:'Receipt', title:'Check what actually happened.', copy:'The paper in the tray stands for a receipt: what was requested, what was observed, and what remains uncertain. Completion requires evidence from the target.', fact:'A completed process is not proof of a completed action. No live session, page data or provider connection is present in this diagram.', part:'Observed result → evidence' }
  ];
  onMount(() => {
    mounted = true;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reduced = preference.matches; };
    update(); preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  });
</script>

<div class="story" class:enhanced={mounted}>
  <figure class="stage">
    <div class="stage-top"><span>FIG. 01 / THE CONTEXT BOUNDARY</span><span>Illustrative</span></div>
    <ScopefieldAnatomy stage={mounted ? active : 4} still={reduced} />
    <figcaption><span>Original conceptual drafting station.</span><span>Not a product recording or live agent session.</span></figcaption>
  </figure>
  <div class="explanation">
    {#if mounted}
      <div class="selector" role="group" aria-label="Explore the context boundary">
        {#each steps as step, i}
          <button type="button" aria-pressed={active === i} aria-controls={`boundary-${i}`} onclick={() => { active = i; }}><span class="number">0{i+1}</span> {step.label}</button>
        {/each}
      </div>
    {/if}
    <div class="readout" aria-live="polite" aria-atomic="true">
      {#each steps as step, i}
        <article id={`boundary-${i}`} hidden={mounted && active !== i}>
          <p class="step-label">0{i+1} / {step.part}</p><h3>{step.title}</h3><p class="step-copy">{step.copy}</p><p class="fact">{step.fact}</p>
        </article>
      {/each}
    </div>
    <p class="model-note">Select a part to read its role. These controls only change the illustration.</p>
  </div>
</div>

<style>
  .story { display:grid; grid-template-columns:1.2fr 1fr; gap:4vw; align-items:start; }
  .stage { margin:0; border:1px solid var(--color-performance-line); background:var(--color-performance-panel); }
  .stage-top, figcaption { display:flex; justify-content:space-between; gap:1rem; padding:1rem 1.25rem; color:var(--color-performance-muted); font:0.7rem/1.5 var(--font-performance-mono); }
  .stage-top { border-bottom:1px solid var(--color-performance-line); }
  figcaption { border-top:1px solid var(--color-performance-line); flex-wrap:wrap; }
  .selector { display:flex; flex-wrap:wrap; gap:0.4rem; padding-bottom:2rem; }
  button { min-height:44px; padding:0.65rem 0.8rem; border:1px solid var(--color-performance-line-strong); border-radius:2px; color:var(--color-performance-ink); background:transparent; font:0.8rem/1.4 var(--font-performance-sans); cursor:pointer; }
  button[aria-pressed='true'] { color:var(--color-performance-paper); background:var(--color-performance-ink); }
  button:focus-visible { outline:2px solid var(--color-performance-focus); outline-offset:4px; }
  .number { font:0.65rem var(--font-performance-mono); opacity:0.8; margin-right:0.3rem; }
  article { padding:0 0 2rem; }
  article[hidden] { display:none; }
  .step-label { font:0.72rem/1.6 var(--font-performance-mono); color:var(--color-performance-muted); margin:0 0 1rem; text-transform:uppercase; }
  h3 { font-size:clamp(1.8rem,2.7vw,3rem); font-weight:500; letter-spacing:-0.04em; line-height:1.12; margin:0 0 1.4rem; }
  .step-copy { font-size:1.05rem; line-height:1.65; margin:0; }
  .fact { font-size:0.85rem; line-height:1.65; color:var(--color-performance-muted); border-left:2px solid var(--color-performance-line-strong); padding-left:1rem; margin:1.5rem 0 0; }
  .model-note { font:0.72rem/1.6 var(--font-performance-mono); color:var(--color-performance-muted); border-top:1px solid var(--color-performance-line); padding-top:1rem; }
  @media(max-width:850px) { .story { grid-template-columns:1fr; gap:1.5rem; } .stage :global(.anatomy) { max-width:560px; margin:auto; } .selector { padding-bottom:1.5rem; } }
  @media print { .story { display:block; } .stage { max-width:26rem; margin-bottom:1.5rem; } .selector,.model-note { display:none; } article[hidden] { display:block; } article { break-inside:avoid; } }
</style>
