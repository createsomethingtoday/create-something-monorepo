<script lang="ts">
  import { onMount } from 'svelte';
  import { IsometricIllustration, type IsometricKind } from '@create-something/canon';
  const storyKinds: IsometricKind[] = ['diagnose', 'approve', 'handoff', 'learn'];
  let { onExplore }: { onExplore?: (scene: number | null) => void } = $props();
  import { reducedFilmMotion } from '$lib/motion/filmPlayback';

  const scenes = [
    { title: 'A problem surfaces.', detail: 'A form stops reaching the team. We trace the broken handoff.' },
    { title: 'You approve the change.', detail: 'We agree on the scope and how to check the result before building.' },
    { title: 'The handoff works.', detail: 'Engineering implements the agreed change and tests the result.' },
    { title: 'The lesson stays with your team.', detail: 'A checked handoff, instructions, and recovery checks preserve the context.' }
  ];
  let scene = $state(3);
  let manuallySelected = $state(false);
  let running = $state(false);
  let ready = $state(false);
  let mobile = $state(true);
  let systemReduced = $state(true);
  let complete = $state(true);
  let root = $state<HTMLElement>();
  let frame = 0;
  let elapsed = 0;
  let previous = 0;
  let visible = false;
  const eligible = $derived(ready && !mobile && !systemReduced && !$reducedFilmMotion);

  function explore(index: number) {
    pause(); manuallySelected = true; scene = index; elapsed = index * 3400; complete = index === 3;
    onExplore?.(index);
  }
  function pause() { running = false; cancelAnimationFrame(frame); }
  function advance(time: number) {
    if (!running) return;
    elapsed += Math.max(0, Math.min(time - previous, 100));
    previous = time;
    scene = Math.min(3, Math.floor(elapsed / 3400));
    if (elapsed >= 13600) { complete = true; pause(); return; }
    frame = requestAnimationFrame(advance);
  }
  function play() {
    if (!eligible || !visible || document.hidden) return;
    manuallySelected = false; onExplore?.(null);
    if (complete) { elapsed = 0; scene = 0; complete = false; }
    running = true; previous = performance.now(); frame = requestAnimationFrame(advance);
  }
  onMount(() => {
    const narrow = matchMedia('(max-width: 900px)');
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      mobile = narrow.matches; systemReduced = preference.matches;
      if (mobile || systemReduced) { pause(); if (!manuallySelected) { scene = 3; complete = true; } }
    };
    sync(); ready = true;
    narrow.addEventListener('change', sync); preference.addEventListener('change', sync);
    const unsubscribe = reducedFilmMotion.subscribe(value => {
      if (value) { pause(); if (!manuallySelected) { scene = 3; complete = true; } }
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= .3;
      if (!visible) pause();
    }, { threshold: [0, .3] });
    if (root) observer.observe(root);
    const visibility = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      pause(); observer.disconnect(); unsubscribe();
      narrow.removeEventListener('change', sync); preference.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', visibility);
    };
  });
</script>

<figure class="workflow-story" class:running class:still={!eligible} data-scene={scene} bind:this={root} aria-labelledby="workflow-story-title">
  <div class="story-meta"><span>Illustrative / one form handoff</span><span aria-hidden="true">{String(scene + 1).padStart(2, '0')} / 04</span></div>
  <div class="story-picture" aria-hidden="true">
    <div class="story-assemblies">
      {#each storyKinds as kind, index}
        <div class="story-assembly" class:active={scene === index}>
          <IsometricIllustration {kind} size="100%" />
          <span>{['Trace the break', 'Agree the change', 'Checked handoff', 'Keep the lesson'][index]}</span>
        </div>
      {/each}
    </div>
  </div>
  <figcaption>
    <div aria-live={running ? "off" : "polite"} aria-atomic="true">
      <h2 id="workflow-story-title">{scenes[scene].title}</h2>
      <p class="story-detail">{scenes[scene].detail}</p>
    </div>
    <p class="explore-hint">Choose a moment. Explore at your own pace.</p>
    <ol class="story-sequence" aria-label="The whole service story">
      {#each ['Problem', 'Approval', 'Working system', 'Captured lesson'] as label, index}
        <li class:current={scene === index}>
          {#if ready}<button type="button" class="scene-choice" aria-pressed={scene === index} onclick={() => explore(index)}><span aria-hidden="true">0{index + 1}</span> {label}</button>
          {:else}{label}{/if}
        </li>
      {/each}
    </ol>
    <div class="story-controls">
      {#if eligible}<button onclick={() => running ? pause() : play()} aria-label={running ? 'Pause workflow story' : complete ? 'Play workflow story' : 'Resume workflow story'}>{running ? 'Pause story' : complete ? 'Play the story' : 'Resume story'} <span aria-hidden="true">{running ? 'Ⅱ' : '▷'}</span></button>
      {:else}<span>Explore without motion</span>{/if}
      <span>Silent · {eligible ? '14 seconds' : 'no motion'}</span>
    </div>
  </figcaption>
</figure>

<style>
  .workflow-story { --isometric-surface: var(--color-performance-mode-campaign-surface); margin: 0; border-top: 1px solid var(--color-performance-shell-border-strong); padding-top: var(--space-performance-sm); }
  .story-meta, .story-controls { display: flex; justify-content: space-between; gap: var(--space-performance-sm); font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); color: var(--color-performance-fg-secondary); }
  .story-meta { text-transform: uppercase; letter-spacing: .04em; }
  .story-picture { position: relative; padding-block: var(--space-performance-sm); }
  .story-assemblies { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-performance-xs); }
  .story-assembly { position: relative; min-width: 0; border-bottom: 1px solid var(--color-performance-shell-border-default); }
  .story-assembly:not(:last-child)::after { content: '→'; position: absolute; top: 44%; right: -7px; }
  .story-assembly.active { border-bottom-color: currentColor; }
  .story-assembly span { display: block; min-height: 3em; font: var(--text-performance-operator-label)/1.4 var(--font-performance-mono); }
  h2 { font: var(--font-performance-medium) clamp(1.25rem, 1.7vw, 1.6rem)/1.3 var(--font-performance-interface); min-height: 2.6em; margin: 0; letter-spacing: var(--tracking-performance-tight); }
  .story-detail { min-height: 3.3em; font-size: var(--text-performance-caption); line-height: 1.6; max-width: 52ch; color: var(--color-performance-fg-secondary); margin: var(--space-performance-xs) 0 var(--space-performance-sm); }
  .story-sequence { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: .4rem 1rem; font-size: var(--text-performance-caption); color: var(--color-performance-fg-tertiary); }
  .explore-hint { font-size: var(--text-performance-caption); color: var(--color-performance-fg-secondary); margin-block: var(--space-performance-sm); }
  figure.workflow-story .scene-choice { display: inline-flex; align-items: center; gap: var(--space-performance-xs); min-height: 44px; padding: var(--space-performance-xs); border: 1px solid transparent; border-bottom-color: var(--color-performance-shell-border-strong); background: transparent; color: inherit; font: inherit; cursor: pointer; text-align: left; }
  figure.workflow-story .scene-choice[aria-pressed="true"] { border-color: currentColor; }
  .scene-choice span { font-family: var(--font-performance-mono); }
  .scene-choice:hover { text-decoration: underline; text-underline-offset: .3em; }
  .scene-choice:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 4px; }
  .story-sequence li:not(:last-child)::after { content: none; }
  .story-sequence .current { color: var(--color-performance-fg-primary); font-weight: var(--font-performance-medium); }
  .story-controls { align-items: center; border-bottom: 1px solid var(--color-performance-shell-border-default); min-height: 50px; margin-top: var(--space-performance-sm); }
  figure.workflow-story .story-controls button { min-height: 44px; font: inherit; color: inherit; padding: 0; border: 0; background: transparent; cursor: pointer; }
  .story-controls button:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 4px; }
  @media(max-width:480px) { .story-assemblies { grid-template-columns: repeat(2, minmax(0, 1fr)); } .story-assembly:nth-child(2)::after { content: none; } }
</style>
