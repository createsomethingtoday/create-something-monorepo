<script lang="ts">
  import { onMount } from 'svelte';
  import { reducedFilmMotion } from '$lib/motion/filmPlayback';

  const scenes = [
    { title: 'A problem surfaces.', detail: 'A form stops reaching the team. We trace the broken handoff.' },
    { title: 'You approve the change.', detail: 'We agree on the scope and how to check the result before building.' },
    { title: 'The handoff works.', detail: 'Engineering implements the agreed change and tests the result.' },
    { title: 'The lesson stays with your team.', detail: 'A checked handoff, instructions, and recovery checks preserve the context.' }
  ];
  let scene = $state(3);
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
    if (complete) { elapsed = 0; scene = 0; complete = false; }
    running = true; previous = performance.now(); frame = requestAnimationFrame(advance);
  }
  onMount(() => {
    const narrow = matchMedia('(max-width: 900px)');
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      mobile = narrow.matches; systemReduced = preference.matches;
      if (mobile || systemReduced) { pause(); scene = 3; complete = true; }
    };
    sync(); ready = true;
    narrow.addEventListener('change', sync); preference.addEventListener('change', sync);
    const unsubscribe = reducedFilmMotion.subscribe(value => {
      if (value) { pause(); scene = 3; complete = true; }
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
    <svg viewBox="0 0 480 210" fill="none">
      <path class="tangle" d="M74 108C120 14 233 182 178 72S310 28 238 130S409 201 400 106M74 108C152 186 214 12 267 74S342 31 400 106" />
      <path class="route" d="M85 106H210M270 106H395" pathLength="100" />
      <path class="packet" d="M85 106H210M270 106H395" pathLength="100" />
      <rect class="node" x="28" y="82" width="58" height="48" rx="4" />
      <path class="form-lines" d="M43 96H70M43 105H65M43 114H59" />
      <path class="gate" d="M240 75L271 106L240 137L209 106Z" />
      <path class="gate-check" d="M227 106L237 115L253 96" />
      <rect class="node team" x="395" y="82" width="58" height="48" rx="4" />
      <path class="team-lines" d="M410 98H438M410 108H438M410 118H427" />
      <path class="lesson-line" d="M424 133V161H296" />
      <rect class="lesson" x="184" y="147" width="112" height="34" rx="3" />
      <path class="lesson-check" d="M195 163L201 169L210 158" />
      <text x="57" y="65" text-anchor="middle">FORM</text>
      <text x="240" y="58" text-anchor="middle">AGREE THE CHANGE</text>
      <text x="424" y="65" text-anchor="middle">TEAM</text>
      <text class="lesson-text" x="219" y="168">INSTRUCTIONS</text>
      <text class="problem-mark" x="149" y="104">?</text>
    </svg>
  </div>
  <figcaption>
    <h2 id="workflow-story-title">{scenes[scene].title}</h2>
    <p class="story-detail">{scenes[scene].detail}</p>
    <ol class="story-sequence" aria-label="The whole service story">
      <li class:current={scene === 0}>Problem</li><li class:current={scene === 1}>Approval</li><li class:current={scene === 2}>Working system</li><li class:current={scene === 3}>Captured lesson</li>
    </ol>
    <div class="story-controls">
      {#if eligible}<button onclick={() => running ? pause() : play()} aria-label={running ? 'Pause workflow story' : complete ? 'Play workflow story' : 'Resume workflow story'}>{running ? 'Pause story' : complete ? 'Play the story' : 'Resume story'} <span aria-hidden="true">{running ? 'Ⅱ' : '▷'}</span></button>
      {:else}<span>Still view / the whole story</span>{/if}
      <span>Silent · {eligible ? '14 seconds' : 'no motion'}</span>
    </div>
  </figcaption>
</figure>

<style>
  .workflow-story { margin: 0; border-top: 1px solid var(--color-performance-shell-border-strong); padding-top: var(--space-performance-sm); }
  .story-meta, .story-controls { display: flex; justify-content: space-between; gap: var(--space-performance-sm); font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); color: var(--color-performance-fg-secondary); }
  .story-meta { text-transform: uppercase; letter-spacing: .04em; }
  .story-picture { position: relative; padding-block: var(--space-performance-sm); }
  svg { display: block; width: 100%; height: auto; overflow: visible; }
  svg path, svg rect { stroke: currentColor; stroke-width: 1.2; vector-effect: non-scaling-stroke; }
  svg text { fill: currentColor; font: 9px var(--font-performance-mono); letter-spacing: .06em; }
  .tangle { opacity: 0; transition: opacity 700ms ease; }
  .route { opacity: .5; transition: opacity 700ms ease; }
  .node { opacity: .8; }
  .gate { opacity: .7; }
  .gate-check { opacity: 1; transition: opacity 700ms ease; }
  .lesson-line, .lesson, .lesson-check, .lesson-text { opacity: .8; transition: opacity 700ms ease; }
  .packet { stroke-width: 2; stroke-dasharray: 4 96; stroke-dashoffset: 0; opacity: 0; }
  .problem-mark { opacity: 0; }
  [data-scene="0"] .tangle { opacity: .65; }
  [data-scene="1"] .tangle { opacity: .2; }
  [data-scene="0"] .route { opacity: .08; }
  [data-scene="0"] .gate-check, [data-scene="0"] .lesson-line, [data-scene="0"] .lesson, [data-scene="0"] .lesson-check, [data-scene="0"] .lesson-text,
  [data-scene="1"] .lesson-line, [data-scene="1"] .lesson, [data-scene="1"] .lesson-check, [data-scene="1"] .lesson-text,
  [data-scene="2"] .lesson-line, [data-scene="2"] .lesson, [data-scene="2"] .lesson-check, [data-scene="2"] .lesson-text { opacity: .06; }
  [data-scene="0"] .problem-mark { opacity: 1; font-size: 18px; }
  [data-scene="1"] .gate { stroke-width: 2; }
  [data-scene="2"].running .packet { opacity: 1; animation: handoff 1700ms linear infinite; }
  [data-scene="2"] .packet { animation-play-state: paused; }
  h2 { font: var(--font-performance-medium) clamp(1.25rem, 1.7vw, 1.6rem)/1.3 var(--font-performance-interface); min-height: 2.6em; margin: 0; letter-spacing: var(--tracking-performance-tight); }
  .story-detail { min-height: 3.3em; font-size: var(--text-performance-caption); line-height: 1.6; max-width: 52ch; color: var(--color-performance-fg-secondary); margin: var(--space-performance-xs) 0 var(--space-performance-sm); }
  .story-sequence { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: .4rem 1rem; font-size: var(--text-performance-caption); color: var(--color-performance-fg-tertiary); }
  .story-sequence li:not(:last-child)::after { content: ' →'; margin-left: .5rem; }
  .story-sequence .current { color: var(--color-performance-fg-primary); font-weight: var(--font-performance-medium); }
  .story-controls { align-items: center; border-bottom: 1px solid var(--color-performance-shell-border-default); min-height: 50px; margin-top: var(--space-performance-sm); }
  figure.workflow-story .story-controls button { min-height: 44px; font: inherit; color: inherit; padding: 0; border: 0; background: transparent; cursor: pointer; }
  .story-controls button:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 4px; }
  .still .tangle { opacity: 0; }
  .still svg path, .still svg rect, .still svg text { transition: none; animation: none !important; }
  @keyframes handoff { to { stroke-dashoffset: -100; } }
  @media(max-width:900px), (prefers-reduced-motion:reduce) { svg path, svg rect, svg text { transition: none; animation: none !important; } }
</style>
