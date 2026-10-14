<script lang="ts">
  import { onMount } from 'svelte';
  import ScopefieldAnatomy from './ScopefieldAnatomy.svelte';
  let root: HTMLElement;
  let active = $state(0);
  let mounted = $state(false);
  let reduced = $state(true);
  let paused = $state(false);
  const steps = [
    {id:'page-first', label:'01 / The page', title:'Give the page the room.', copy:'Our daily work starts on the web: reading, comparing, and understanding what is in front of us. The browser should make space for that.', fact:'In the public beta: browse with the Page workspace hidden. Public browsing requires an explicit opt-in.'},
    {id:'workspace-close', label:'02 / The workspace', title:'Bring the work closer.', copy:'When a detail needs attention, bring the workspace into reach. For client work, keep the page and the review close before deciding what to hand off.', fact:'In the public beta: show or hide the Page workspace while preserving its state.'},
    {id:'visible-control', label:'03 / The decision', title:'Keep the next move yours.', copy:'AI belongs in our daily work. Its permission to act should be visible, specific, and separate from simply opening a page.', fact:'Practice only: agent activity is demonstrated on synthetic pages. Public agent execution is not implemented or qualified.'}
  ];
  onMount(() => {
    mounted = true;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reduced = preference.matches; };
    update(); preference.addEventListener('change', update);
    const targets = [...root.querySelectorAll<HTMLElement>('[data-story-step]')];
    const mobile = matchMedia('(max-width: 850px)');
    let observer: IntersectionObserver;
    const observe = () => {
      observer?.disconnect();
      observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) active = Number((entry.target as HTMLElement).dataset.storyStep);
    }, {rootMargin:mobile.matches ? '-58% 0px -35% 0px' : '-25% 0px -45% 0px',threshold:0});
      targets.forEach(target => observer.observe(target));
    };
    observe(); mobile.addEventListener('change', observe);
    return () => { observer.disconnect(); mobile.removeEventListener('change', observe); preference.removeEventListener('change',update); };
  });
</script>

<div class="story" class:enhanced={mounted} bind:this={root}>
  <div class="stage-column">
    <figure class="stage">
      <div class="stage-top"><span>Scopefield / Anatomy of the idea</span>{#if mounted}<button onclick={() => { paused = !paused; }} aria-pressed={paused} disabled={reduced}>{reduced ? 'Static illustration' : paused ? 'Resume motion' : 'Pause motion'}</button>{/if}</div>
      <ScopefieldAnatomy stage={active} still={!mounted || reduced || paused} />
      <figcaption><span>Conceptual illustration. Not a product recording.</span><span class="state-label" aria-hidden="true">{!mounted || reduced || paused ? 'Page + workspace + control' : steps[active].label}</span></figcaption>
    </figure>
  </div>
  <div class="steps">
    {#each steps as step, i}
      <article id={step.id} data-story-step={i} class:active={active === i}>
        <p class="step-label">{step.label}</p><h3>{step.title}</h3><p class="step-copy">{step.copy}</p><p class="fact">{step.fact}</p>
      </article>
    {/each}
  </div>
</div>

<style>
  .story { display: grid; grid-template-columns: 1.35fr 1fr; gap: 6vw; align-items: start; }
  .stage-column { align-self: stretch; }
  .stage { position: static; top: 120px; margin: 0; border: 1px solid var(--color-performance-line); background: var(--color-performance-panel); }
  .enhanced .stage { position: sticky; }
  .stage-top, figcaption { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.25rem; color: var(--color-performance-muted); font: 0.7rem/1.5 var(--font-performance-mono); }
  .stage-top { min-height: 4.5rem; border-bottom: 1px solid var(--color-performance-line); }
  button { min-height: 44px; padding: 0.5rem 0.75rem; border: 1px solid var(--color-performance-line-strong); border-radius: var(--radius-operator-control); color: var(--color-performance-ink); background: transparent; font: inherit; cursor: pointer; }
  button:disabled { border-color: var(--color-performance-line); cursor: default; color: var(--color-performance-muted); }
  button:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 4px; }
  figcaption { border-top: 1px solid var(--color-performance-line); flex-wrap: wrap; }
  .state-label { color: var(--color-performance-ink); }
  article { min-height: 68svh; padding: 6rem 0; display: flex; flex-direction: column; justify-content: center; scroll-margin-top: 140px; }
  article + article { border-top: 1px solid var(--color-performance-line); }
  .step-label { font: 0.75rem/1.6 var(--font-performance-mono); color: var(--color-performance-muted); margin: 0 0 1.5rem; }
  h3 { font-size: clamp(2.5rem, 4vw, 4.5rem); font-weight: 500; letter-spacing: -0.045em; line-height: 1.05; margin: 0 0 1.5rem; }
  .step-copy { font-size: 1.1rem; line-height: 1.65; margin: 0; max-width: 31rem; }
  .fact { font-size: 0.875rem; line-height: 1.6; color: var(--color-performance-muted); border-left: 2px solid var(--color-performance-line-strong); padding-left: 1rem; margin: 2rem 0 0; }
  @media (max-width: 850px) {
    .story { display: block; }
    .enhanced .stage-column { position: sticky; top: 88px; z-index: 2; }
    .enhanced .stage { position: static; }
    .stage :global(.anatomy) { max-width: 460px; margin: auto; }
    .stage-top { padding: 0.5rem 0.75rem; min-height: 3.5rem; }
    figcaption { padding: 0.65rem 0.75rem; font-size: 0.625rem; }
    .state-label { display: none; }
    article { min-height: 68svh; padding: 2rem 0; scroll-margin-top: 430px; }
  }
  @media (max-width: 850px) and (max-height: 650px) { .enhanced .stage-column { position: static; } }
  @media (prefers-reduced-motion: reduce) { .enhanced .stage-column, .enhanced .stage { position: static; } article { min-height: auto; padding-block: 3rem; } }
</style>
