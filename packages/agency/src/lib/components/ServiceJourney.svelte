<script lang="ts">
  import { onMount } from 'svelte';

  let ready = $state(false);
  let reducedMotion = $state(true);
  let tracing = $state(false);
  let stopTrace: ReturnType<typeof setTimeout> | undefined;
  onMount(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => { reducedMotion = preference.matches; tracing = false; clearTimeout(stopTrace); };
    sync();
    ready = true;
    preference.addEventListener('change', sync);
    return () => { preference.removeEventListener('change', sync); clearTimeout(stopTrace); };
  });
  function trace() {
    if (reducedMotion) return;
    tracing = !tracing;
    clearTimeout(stopTrace);
    if (tracing) stopTrace = setTimeout(() => { tracing = false; }, 4200);
  }
</script>

<section class="service-journey" aria-labelledby="service-journey-title">
  <header><div><p class="eyebrow">How we work together</p><h2 id="service-journey-title">A clear task.<br />An agreed way forward.</h2></div><p class="intro">Diagnosis, engineering and learning stay connected. The context carries into the next agreed improvement.</p></header>
  <figure class:tracing aria-labelledby="continuity-title">
    <figcaption id="continuity-title"><div><span class="figure-label">The support relationship</span><p>Your tools. Your goals. <br />A shared understanding.</p></div>{#if ready && !reducedMotion}<button type="button" onclick={trace}>{tracing ? 'Stop motion' : 'Trace the connection'}<span aria-hidden="true"> {tracing ? 'Ⅱ' : '→'}</span></button>{/if}</figcaption>
    <ol>
      <li class="stage stage-one"><span class="step"><span class="step-number">01</span>Diagnose</span><h3>Bring the problem.</h3><p>Show us the tools, the task and what a good result looks like. If the work is unclear, we start by mapping it.</p><p class="artifact"><span>You get</span>A shared understanding.</p><span class="connector" aria-hidden="true"></span></li>
      <li class="stage stage-two"><span class="step"><span class="step-number">02</span>Engineer</span><h3>Agree the change.</h3><p>Confirm the deliverable, price, capacity and acceptance checks before payment. You decide what can change.</p><p class="artifact"><span>You get</span>Agreed work. A tested result.</p><span class="connector" aria-hidden="true"></span></li>
      <li class="stage stage-three"><span class="step"><span class="step-number">03</span>Learn</span><h3>Use what we build.</h3><p>Review the tested result and learn how to use it. Keep the instructions and recovery checks alongside the work.</p><p class="artifact"><span>You keep</span>Checked handoff. The work and how to use it.</p></li>
    </ol>
    <div class="context">
      <div class="context-title"><span class="return-mark" aria-hidden="true">↳</span><h3>Context stays with the work.</h3></div>
      <ul class="context-items" aria-label="Retained project context"><li>Diagnosis</li><li>Decisions</li><li>Changes</li><li>Checks</li><li>Instructions</li></ul>
      <p class="next-task">A starting point for the next agreed task.</p>
    </div>
    <div class="figure-foot"><p>One support relationship, across agreed work.</p></div>
  </figure>
  <footer><p>Membership covers agreed improvements. Larger Builds, launch and production incident response require separate agreements.</p><a href="/services">Read the process and support scope ↗</a></footer>
</section>
<style>
  .service-journey { padding: var(--space-performance-xl) 7vw; background: var(--color-performance-bg-surface); color: var(--color-performance-fg-primary); border-block: 1px solid var(--color-performance-shell-border-default); }
  header { display: grid; grid-template-columns: minmax(0,1.5fr) minmax(0,1fr); align-items: end; gap: var(--space-performance-lg); }
  .eyebrow, .step, .figure-label { font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); text-transform: uppercase; letter-spacing: .06em; }
  h2 { margin: var(--space-performance-sm) 0 0; font: var(--font-performance-medium) clamp(2.5rem,4.4vw,4rem)/1.08 var(--font-performance-interface); letter-spacing: var(--tracking-performance-tight); }
  p { font-size: var(--text-performance-body-sm); line-height: 1.65; }
  .intro { max-width: 39ch; margin: 0 0 .25rem; }
  figure { margin: var(--space-performance-lg) 0 var(--space-performance-md); }
  figcaption { display: flex; justify-content: space-between; align-items: center; gap: var(--space-performance-md); border-top: 1px solid var(--color-performance-shell-border-strong); padding-block: var(--space-performance-md); }
  figcaption p { margin: .6rem 0 0; font-size: var(--text-performance-body-sm); line-height: 1.5; }
  ol { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: var(--space-performance-lg); list-style: none; padding: 0; margin: var(--space-performance-sm) 0 0; }
  .stage { position: relative; padding-block: 0 var(--space-performance-lg); display: flex; flex-direction: column; }
  .stage::before { content: ''; position: absolute; inset: 19px 0 auto 145px; height: 2px; background: currentColor; transform: scaleX(0); transform-origin: left; pointer-events: none; }
  .step { display: flex; align-items: center; gap: .8rem; position: relative; }
  .step-number { display: inline-flex; width: 40px; height: 40px; align-items: center; justify-content: center; border: 1px solid var(--color-performance-shell-border-strong); border-radius: 50%; background: var(--color-performance-bg-surface); }
  h3 { margin: 1.25rem 0 .5rem; font: var(--font-performance-medium) clamp(1.3rem,1.8vw,1.65rem)/1.25 var(--font-performance-interface); letter-spacing: -.02em; }
  .stage p { max-width: 39ch; margin-top: .25rem; }
  .stage .artifact { margin-top: auto; margin-bottom: 0; padding-top: 1rem; font-size: var(--text-performance-caption); }
  .artifact span { display: block; font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); text-transform: uppercase; margin-bottom: .5rem; }
  .connector { position: absolute; right: calc(-1 * var(--space-performance-lg) + .5rem); top: 20px; width: calc(var(--space-performance-lg) - 1rem); border-top: 1px solid var(--color-performance-shell-border-strong); }
  .connector::after { content: ''; position: absolute; right: 0; top: -3px; width: 5px; height: 5px; border-top: 1px solid currentColor; border-right: 1px solid currentColor; transform: rotate(45deg); }
  .context { position: relative; display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: .75rem var(--space-performance-lg); border-block: 1px solid var(--color-performance-shell-border-strong); padding-block: var(--space-performance-md); }
  .context::before { content: ''; position: absolute; inset: -1px 0 auto; height: 2px; background: currentColor; transform: scaleX(0); transform-origin: left; }
  .context-title { display: flex; gap: 1rem; align-items: center; grid-row: span 2; }
  .context-title h3 { margin: 0; max-width: 16ch; font-size: clamp(1.5rem,2.3vw,2rem); }
  .return-mark { font-size: 2rem; line-height: 1; }
  .context-items { padding: 0; margin: 0; list-style: none; display: flex; flex-wrap: wrap; gap: .4rem 1rem; font-size: var(--text-performance-caption); }
  .context-items li { display: flex; align-items: center; gap: .5rem; }
  .context-items li::before { content: ''; width: 3px; height: 3px; background: currentColor; border-radius: 50%; }
  .next-task { margin: 0; font-size: var(--text-performance-caption); }
  .figure-foot p { margin: .9rem 0 0; font-size: var(--text-performance-caption); }
  button { appearance: none; display: inline-flex; align-items: center; justify-content: space-between; gap: 1rem; background: transparent; color: inherit; border: 1px solid var(--color-performance-shell-border-strong); padding: .7rem 1rem; min-height: 44px; min-width: 195px; cursor: pointer; font: inherit; font-size: var(--text-performance-caption); }
  button:hover { background: var(--color-performance-fg-primary); color: var(--color-performance-bg-surface); }
  footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-performance-md); border-top: 1px solid var(--color-performance-shell-border-default); padding-top: var(--space-performance-md); }
  footer p { font-size: var(--text-performance-caption); max-width: 60ch; }
  a { color: inherit; display: inline-flex; align-items: center; min-height: 44px; text-underline-offset: .3em; }
  a:focus-visible, button:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 4px; }
  @keyframes trace { 0% { transform: scaleX(0); opacity: 1; } 65% { transform: scaleX(1); opacity: 1; } 100% { transform: scaleX(1); opacity: 0; } }
  @media (prefers-reduced-motion: no-preference) {
    .tracing .stage::before { animation: trace 1.2s ease-out both; }
    .tracing .stage-two::before { animation-delay: .9s; }
    .tracing .stage-three::before { animation-delay: 1.8s; }
    .tracing .context::before { animation: trace 1.5s 2.7s ease-out both; }
    button { transition: background-color 150ms, color 150ms; }
  }
  @media(max-width:720px) {
    header { grid-template-columns: 1fr; gap: var(--space-performance-md); }
    h2 { font-size: clamp(2.2rem,8vw,3rem); }
    .intro { max-width: 45ch; }
    figcaption { align-items: flex-start; flex-direction: column; gap: 1rem; }
    figcaption br { display: none; }
    ol { grid-template-columns: 1fr; gap: 0; margin-top: .5rem; }
    .stage { padding: 0 0 1.75rem 3.5rem; }
    .stage:not(:last-child) { border-left: 1px solid transparent; }
    .stage::after { content: ''; position: absolute; left: 19px; top: 40px; bottom: 0; border-left: 1px solid var(--color-performance-shell-border-strong); }
    .stage:last-child::after { bottom: 1.25rem; }
    .step { min-height: 40px; }
    .step-number { position: absolute; left: -3.5rem; }
    .stage h3 { margin-top: .5rem; }
    .stage::before { inset: 40px auto 0 19px; width: 2px; height: auto; transform: scaleY(0); transform-origin: top; z-index: 1; }
    .stage:last-child::before { bottom: 1.25rem; }
    .stage .artifact { padding-top: .5rem; }
    .connector { display: none; }
    .context { grid-template-columns: 1fr; gap: 1rem; }
    .context-title { grid-row: auto; }
    .context-title h3 { max-width: none; font-size: 1.5rem; }
    .context-items, .next-task { margin-left: 3rem; }
    @keyframes trace-down { 0% { transform: scaleY(0); opacity: 1; } 65% { transform: scaleY(1); opacity: 1; } 100% { transform: scaleY(1); opacity: 0; } }
    @media (prefers-reduced-motion: no-preference) { .tracing .stage::before { animation-name: trace-down; } }
  }
</style>
