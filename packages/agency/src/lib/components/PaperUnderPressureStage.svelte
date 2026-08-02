<script lang="ts">
  import {
    initialPaperWorkflowStage,
    paperWorkflowStages,
    type PaperWorkflowStageId
  } from '$lib/data/paperWorkflow';
  import PaperPressureCanvas from './PaperPressureCanvas.svelte';

  let activeStageId = $state<PaperWorkflowStageId>(initialPaperWorkflowStage);
  let activeStage = $derived(
    paperWorkflowStages.find((stage) => stage.id === activeStageId) ?? paperWorkflowStages[0]
  );

  function chooseStage(stageId: PaperWorkflowStageId) {
    activeStageId = stageId;
  }

  function handleStageKeydown(event: KeyboardEvent, stageId: PaperWorkflowStageId) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      chooseStage(stageId);
    }
  }
</script>

<section class="paper-pressure" data-paper-under-pressure data-active-stage={activeStageId}>
  <div class="paper-pressure__material">
    <span class="paper-pressure__serial" aria-hidden="true">CS / WF—001</span>

    <div class="paper-pressure__artifact">
      <svg
        class="paper-pressure__sheet"
        viewBox="0 0 760 520"
        role="img"
        aria-labelledby="paper-workflow-title paper-workflow-description"
      >
        <title id="paper-workflow-title">One sheet transformed into a controlled workflow</title>
        <desc id="paper-workflow-description">
          One compressed paper handoff opens into a routed sheet, then settles against a controlled
          edge with proof attached. The selected Map, Build, or Control stage is emphasized.
        </desc>

        <defs>
          <filter id="paper-shadow" x="-40%" y="-40%" width="180%" height="190%">
            <feDropShadow dx="0" dy="22" stdDeviation="20" flood-opacity="0.2" />
          </filter>
          <linearGradient id="paper-face" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="var(--color-performance-panel, #fff)" />
            <stop offset="0.55" stop-color="var(--color-performance-paper, #f3f3f0)" />
            <stop offset="1" stop-color="var(--color-performance-line, #d7d7d2)" />
          </linearGradient>
        </defs>

        <g data-paper-stage="map" class:stage-active={activeStageId === 'map'}>
          <path
            class="paper-pressure__crumple"
            filter="url(#paper-shadow)"
            d="m239 251 30-78 79-52 96 8 69 50 35 87-35 93-72 61-102-9-78-58Z"
          />
          <path class="paper-pressure__crease" d="m239 251 109-130 24 135-111 97m111-97 141-77-64 132-77-55m77 55-8 100m-69-155-33 155m33-155 141 103" />
        </g>

        <g data-paper-stage="build" class:stage-active={activeStageId === 'build'}>
          <path
            class="paper-pressure__opening-sheet"
            filter="url(#paper-shadow)"
            d="m109 157 191-45 151 65 195-43 18 257-194 38-153-70-190 44Z"
          />
          <path class="paper-pressure__crease" d="m300 112 17 247m134-182 19 252" />
          <path class="paper-pressure__route" d="M159 270h122l82 64 91-74h135" />
          <path class="paper-pressure__route" d="m572 244 20 16-20 16" />
        </g>

        <g data-paper-stage="control" class:stage-active={activeStageId === 'control'}>
          <path
            class="paper-pressure__settled-sheet"
            filter="url(#paper-shadow)"
            d="M112 111h497v313l-48 43H112Z"
          />
          <path class="paper-pressure__crease" d="m181 112 33 312m134-313-21 313m153-313 27 313" />
          <path class="paper-pressure__perforation" d="M526 143v247" />
          <g class="paper-pressure__stamp" transform="translate(387 302) rotate(-7)">
            <rect width="153" height="78" rx="3" />
            <text x="76.5" y="33" text-anchor="middle">PROOF</text>
            <text x="76.5" y="54" text-anchor="middle">RECEIPT ATTACHED</text>
          </g>
          <path class="paper-pressure__clamp" d="M580 163h69v213h-69" />
          <circle class="paper-pressure__clamp-pin" cx="615" cy="207" r="9" />
          <circle class="paper-pressure__clamp-pin" cx="615" cy="333" r="9" />
        </g>
      </svg>

      <PaperPressureCanvas stage={activeStageId} />
    </div>

    <div class="paper-pressure__annotation" id="paper-stage-readout" aria-live="polite">
      <span>{activeStage.index} / {activeStage.verb} / {activeStage.signal}</span>
      <strong>{activeStage.title}</strong>
      <p>{activeStage.detail}</p>
    </div>
  </div>

  <div class="paper-pressure__controls" role="group" aria-label="Choose a paper workflow stage">
    {#each paperWorkflowStages as stage}
      <button
        type="button"
        aria-pressed={activeStageId === stage.id}
        aria-controls="paper-stage-readout"
        onclick={() => chooseStage(stage.id)}
        onkeydown={(event) => handleStageKeydown(event, stage.id)}
      >
        <span>{stage.index}</span>
        <strong>{stage.verb}</strong>
      </button>
    {/each}
  </div>
</section>

<style>
  .paper-pressure {
    --paper-pressure-ink: var(--color-performance-ink, #090909);
    --paper-pressure-sheet: var(--color-performance-panel, #fff);
    --paper-pressure-signal: var(--color-performance-signal, #3157d5);
    --paper-pressure-review: var(--color-performance-review, #7255c8);
    --paper-pressure-stop: var(--color-performance-stop, #b4312f);
    --paper-stage-accent: var(--paper-pressure-signal);
    position: absolute;
    top: clamp(1.5rem, 4vh, 3rem);
    right: max(var(--space-performance-page-gutter, 1.25rem), calc((100vw - 85rem) / 2));
    bottom: 7.15rem;
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    width: min(47vw, 44rem);
    color: var(--paper-pressure-ink);
    pointer-events: none;
  }

  .paper-pressure[data-active-stage='build'] {
    --paper-stage-accent: var(--paper-pressure-review);
  }

  .paper-pressure[data-active-stage='control'] {
    --paper-stage-accent: var(--paper-pressure-stop);
  }

  .paper-pressure__material {
    position: relative;
    min-height: 0;
    overflow: hidden;
  }

  .paper-pressure__serial {
    position: absolute;
    top: 0.65rem;
    right: 0.65rem;
    z-index: 4;
    font-family: var(--font-performance-mono);
    font-size: 0.65rem;
    letter-spacing: 0.08em;
  }

  .paper-pressure__artifact {
    position: absolute;
    inset: 3% 0 22%;
    z-index: 1;
    transform: translateY(-2rem);
    pointer-events: none;
  }

  .paper-pressure__sheet {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  [data-paper-stage] {
    opacity: 0;
    transition: opacity var(--duration-performance-standard, 400ms)
      var(--ease-performance-standard, ease);
  }

  [data-paper-stage].stage-active {
    opacity: 0.36;
  }

  .paper-pressure__crumple,
  .paper-pressure__opening-sheet,
  .paper-pressure__settled-sheet {
    fill: url(#paper-face);
    stroke: var(--color-performance-line-strong, #a9aaa5);
    stroke-width: 1.5;
  }

  .paper-pressure__crease,
  .paper-pressure__route,
  .paper-pressure__perforation,
  .paper-pressure__clamp {
    fill: none;
    stroke: currentColor;
  }

  .paper-pressure__crease {
    stroke-width: 1;
    opacity: 0.33;
  }

  .paper-pressure__route {
    stroke: var(--paper-pressure-review);
    stroke-width: 3;
  }

  .paper-pressure__perforation {
    stroke: var(--paper-pressure-stop);
    stroke-width: 2.5;
    stroke-dasharray: 4 8;
  }

  .paper-pressure__stamp rect {
    fill: none;
    stroke: var(--paper-pressure-stop);
    stroke-width: 3;
  }

  .paper-pressure__stamp text {
    fill: var(--paper-pressure-stop);
    font-family: var(--font-performance-mono);
    font-size: 11px;
  }

  .paper-pressure__stamp text:first-of-type {
    font-size: 20px;
    font-weight: 700;
  }

  .paper-pressure__clamp {
    stroke-width: 10;
  }

  .paper-pressure__clamp-pin {
    fill: var(--color-performance-paper, #f3f3f0);
    stroke: currentColor;
    stroke-width: 3;
  }

  .paper-pressure__annotation {
    position: absolute;
    right: 0;
    bottom: 1.15rem;
    left: 0;
    z-index: 4;
    display: grid;
    grid-template-columns: minmax(8rem, 0.65fr) minmax(13rem, 1.35fr);
    column-gap: clamp(1rem, 3vw, 2.5rem);
    align-items: end;
    padding-top: 0.85rem;
    border-top: 1px solid var(--color-performance-line-strong, #a9aaa5);
  }

  .paper-pressure__annotation span {
    font-family: var(--font-performance-mono);
    font-size: 0.65rem;
    text-transform: uppercase;
  }

  .paper-pressure__annotation span {
    color: var(--paper-stage-accent);
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  .paper-pressure__annotation strong {
    font-size: clamp(1.35rem, 2.4vw, 2.15rem);
    font-weight: var(--font-performance-medium, 500);
    line-height: 1;
  }

  .paper-pressure__annotation p {
    grid-column: 2;
    max-width: 37ch;
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.76rem;
    line-height: 1.4;
  }

  .paper-pressure__controls {
    position: relative;
    z-index: 6;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: clamp(1rem, 3vw, 2rem);
    pointer-events: auto;
  }

  .paper-pressure__controls button {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.6rem;
    align-items: center;
    min-height: 3.2rem;
    padding: 0.6rem 0 0.7rem;
    border: 0;
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
    border-bottom: 2px solid transparent;
    background: transparent;
    color: currentColor;
    cursor: pointer;
    text-align: left;
  }

  .paper-pressure__controls button[aria-pressed='true'] {
    border-top-color: var(--paper-pressure-ink);
    border-bottom-color: var(--paper-stage-accent);
    color: var(--paper-pressure-ink);
  }

  .paper-pressure__controls button:focus-visible {
    outline: 3px solid var(--color-performance-signal-soft, #a7b8ff);
    outline-offset: 2px;
  }

  .paper-pressure__controls button span {
    font-family: var(--font-performance-mono);
    font-size: 0.62rem;
  }

  .paper-pressure__controls button strong {
    font-size: 0.8rem;
  }

  @media (max-width: 70rem) {
    .paper-pressure {
      width: 46vw;
    }
  }

  @media (max-width: 47.99rem) {
    .paper-pressure {
      top: 30rem;
      right: var(--space-performance-page-gutter, 0.75rem);
      bottom: 10rem;
      left: var(--space-performance-page-gutter, 0.75rem);
      width: auto;
    }

    .paper-pressure__artifact {
      inset: 0 0 28%;
      transform: translateY(-1rem);
    }

    .paper-pressure__annotation {
      bottom: 0.35rem;
      grid-template-columns: auto 1fr;
      column-gap: 0.85rem;
      padding-top: 0.55rem;
    }

    .paper-pressure__annotation strong {
      font-size: 1.15rem;
    }

    .paper-pressure__annotation p {
      display: none;
    }

    .paper-pressure__controls button {
      min-height: 3rem;
      padding: 0.5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .paper-pressure *,
    .paper-pressure *::before,
    .paper-pressure *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
</style>
