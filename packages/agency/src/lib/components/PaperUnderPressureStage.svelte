<script lang="ts">
  import { PerformancePaperStudioCanvas, paperPressureHandoffMedia } from '@create-something/canon';
  import {
    initialPaperWorkflowStage,
    paperWorkflowStages,
    type PaperWorkflowStageId
  } from '$lib/data/paperWorkflow';

  let activeStageId = $state<PaperWorkflowStageId>(initialPaperWorkflowStage);
  let activeStage = $derived(
    paperWorkflowStages.find((stage) => stage.id === activeStageId) ?? paperWorkflowStages[0]
  );
  let studioReady = $state(false);

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
      <picture class:paper-pressure__fallback--hidden={studioReady}>
        {#if paperPressureHandoffMedia.mobileSrc}
          <source media="(max-width: 47.99rem)" srcset={paperPressureHandoffMedia.mobileSrc} />
        {/if}
        <img
          src={paperPressureHandoffMedia.src}
          alt={paperPressureHandoffMedia.alt}
          width={paperPressureHandoffMedia.width}
          height={paperPressureHandoffMedia.height}
        />
      </picture>
      <PerformancePaperStudioCanvas
        shot="agency"
        stage={activeStageId}
        embedded
        onStateChange={(state) => (studioReady = state === 'ready')}
      />
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
    padding: 0;
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
    inset: 3% 0 25%;
    z-index: 1;
    pointer-events: none;
  }

  .paper-pressure__artifact picture,
  .paper-pressure__artifact img {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }

  .paper-pressure__artifact picture {
    transition: opacity var(--duration-performance-standard, 400ms)
      var(--ease-performance-standard, ease);
  }

  .paper-pressure__artifact img {
    object-fit: cover;
  }

  .paper-pressure__fallback--hidden {
    opacity: 0;
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
      top: 34rem;
      right: var(--space-performance-page-gutter, 0.75rem);
      bottom: 10rem;
      left: var(--space-performance-page-gutter, 0.75rem);
      grid-template-rows: minmax(12rem, 1fr) auto;
      width: auto;
    }

    .paper-pressure__artifact {
      inset: 0 0 28%;
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
