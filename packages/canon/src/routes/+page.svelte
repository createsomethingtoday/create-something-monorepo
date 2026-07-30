<script lang="ts">
  import '$lib/styles/tokens.css';
  import '$lib/styles/performance.css';
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    type PerformanceCampaignProof,
    type PerformanceNarrativeScene
  } from '$lib/components/index.js';

  const campaignProof: PerformanceCampaignProof[] = [
    { label: 'Mode', value: 'Campaign' },
    { label: 'Type', value: 'System sans' },
    { label: 'Motion', value: 'State only' },
    { label: 'Boundary', value: 'Canon owned' }
  ];

  const proofScenes: PerformanceNarrativeScene[] = [
    {
      id: 'claim',
      label: 'Claim',
      summary: 'Plain language',
      title: 'Say what the system changes.',
      detail: 'A claim names the workflow, the operator, and the bounded result before visual intensity is added.',
      tone: 'neutral',
      evidence: ['One declared outcome', 'One named decision owner'],
      receipts: ['COPY-CONTRACT-v1']
    },
    {
      id: 'measure',
      label: 'Measure',
      summary: 'Proof attached',
      title: 'Put evidence beside the claim.',
      detail: 'Measures retain their source, state, and verification date so visual confidence never outruns evidence.',
      tone: 'allow',
      evidence: ['Source visible', 'Verification state explicit'],
      receipts: ['PERF-READBACK-042']
    },
    {
      id: 'limit',
      label: 'Limit',
      summary: 'Boundary visible',
      title: 'Show what still needs judgment.',
      detail: 'A limitation is part of the proof surface, not a footnote hidden after the conversion.',
      tone: 'review',
      evidence: ['Automation boundary named', 'Recovery remains reachable'],
      receipts: ['OPERATOR-REVIEW']
    }
  ];

  const operatorSteps = [
    { label: 'Signal', title: 'Read the change', detail: 'Keep source and scope attached.' },
    { label: 'Decision', title: 'Route authority', detail: 'Run, wait, or stop with a named owner.' },
    { label: 'Proof', title: 'Record the result', detail: 'Leave a receipt and recovery path.' }
  ];
</script>

<svelte:head>
  <title>Performance System Showroom | CREATE SOMETHING Canon</title>
  <meta
    name="description"
    content="A living Canon showroom for the CREATE SOMETHING Performance design system."
  />
</svelte:head>

<main class="performance-showroom property-performance">
  <nav class="showroom-nav" aria-label="Performance showroom modes">
    <a class="showroom-brand" href="#campaign-mode">CREATE SOMETHING <span>Canon</span></a>
    <div>
      <a href="#campaign-mode">Campaign</a>
      <a href="#proof-mode">Proof</a>
      <a href="#operator-mode">Operator</a>
    </div>
  </nav>

  <div id="campaign-mode" data-performance-mode="campaign">
    <div class="showroom-mode-label">
      <span>01 / Campaign</span>
      <p>Decisive hierarchy, original material, one clear next action.</p>
    </div>
    <PerformanceCampaignOpening
      eyebrow="Performance system / live contract"
      title="Train the system before pressure finds it."
      lede="Campaign mode earns attention with a plain claim, a controlled material study, and proof that remains readable without motion."
      media={{
        src: '/performance-showroom-flow.svg',
        alt: 'Monochrome flow apparatus crossing a measured pressure boundary.',
        width: 1600,
        height: 1000,
        objectPosition: 'center'
      }}
      proof={campaignProof}
      density="compact"
    >
      {#snippet actions()}
        <Button href="#proof-mode">Inspect the proof mode</Button>
      {/snippet}
    </PerformanceCampaignOpening>
  </div>

  <div id="proof-mode" data-performance-mode="proof">
    <div class="showroom-mode-label">
      <span>02 / Proof</span>
      <p>Claims, measurements, limitations, and provenance stay adjacent.</p>
    </div>
    <PerformanceNarrativeStage
      id="performance-showroom-proof"
      eyebrow="Executable proof grammar"
      title="Conviction stays attached to evidence."
      description="Use the tabs with pointer or keyboard. Every state keeps its language, shape, source, and receipt when color or motion is unavailable."
      scenes={proofScenes}
      ariaLabel="Performance proof modes"
      density="compact"
    >
      {#snippet artifact(scene: PerformanceNarrativeScene)}
        <div class="showroom-state-matrix" aria-label={`${scene.label} semantic state example`}>
          <article class="performance-control-rail" data-control-state="ready">
            <span>Ready</span><strong>Inside the declared lane</strong>
          </article>
          <article class="performance-control-rail" data-control-state="review">
            <span>Review</span><strong>Named operator required</strong>
          </article>
          <article class="performance-control-rail" data-control-state="stop">
            <span>Stop</span><strong>Reason and recovery attached</strong>
          </article>
          <strong class="performance-receipt-stamp">{scene.receipts?.[0] ?? 'RECEIPT REQUIRED'}</strong>
        </div>
      {/snippet}
    </PerformanceNarrativeStage>
  </div>

  <div id="operator-mode" data-performance-mode="operator">
    <div class="showroom-mode-label">
      <span>03 / Operator</span>
      <p>Policy, ownership, state, receipt, and recovery lead the interface.</p>
    </div>
    <PerformanceConversionHandoff
      eyebrow="Operator handoff"
      title="The interface stops where judgment begins."
      description="Operator mode compresses the system into a readable control surface: what changed, who decides, what may happen, and what proves the result."
      handoff={{
        owner: 'Named operator',
        authority: 'Run / wait / stop',
        proof: 'Receipt + recovery',
        state: 'ready'
      }}
      steps={operatorSteps}
      density="compact"
    >
      {#snippet actions()}
        <Button href="#campaign-mode">Review from the opening</Button>
      {/snippet}
    </PerformanceConversionHandoff>
  </div>

  <section class="showroom-guidance" aria-labelledby="showroom-guidance-title">
    <div>
      <span>Responsive / focus / reduced motion</span>
      <h2 id="showroom-guidance-title">The contract survives the condition.</h2>
    </div>
    <ul>
      <li><strong>Responsive</strong><span>Composition reflows; proof and destinations remain.</span></li>
      <li><strong>Focus</strong><span>Every interactive control exposes a visible three-pixel ring.</span></li>
      <li><strong>Reduced motion</strong><span>Selection settles immediately without losing state.</span></li>
    </ul>
  </section>
</main>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(html) {
    scroll-behavior: smooth;
    background: var(--color-performance-paper, #f3f3f0);
  }

  :global(body) {
    margin: 0;
    font-family: var(--font-performance-sans);
  }

  .performance-showroom {
    min-height: 100vh;
  }

  .showroom-nav {
    position: sticky;
    top: 0;
    z-index: var(--z-performance-sticky, 20);
    display: flex;
    min-height: var(--height-performance-header, 72px);
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem max(1.25rem, calc((100vw - var(--content-width-performance, 85rem)) / 2));
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    background: color-mix(in srgb, var(--color-performance-paper, #f3f3f0) 94%, transparent);
  }

  .showroom-nav a {
    display: inline-flex;
    min-width: var(--height-performance-control-min, 2.75rem);
    min-height: var(--height-performance-control-min, 2.75rem);
    align-items: center;
    justify-content: center;
    color: var(--color-performance-ink, #090909);
    font-weight: var(--font-performance-semibold, 600);
    text-decoration: none;
  }

  .showroom-nav a:focus-visible {
    outline: 3px solid var(--color-performance-signal, #0057b8);
    outline-offset: 2px;
  }

  .showroom-nav > div {
    display: flex;
    gap: 1rem;
  }

  .showroom-brand {
    gap: 0.5rem;
  }

  .showroom-brand span,
  .showroom-mode-label span,
  .showroom-guidance > div > span {
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
  }

  .showroom-brand span {
    color: var(--color-performance-muted, #5e6268);
  }

  .showroom-mode-label {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 1rem;
    align-items: center;
    width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
    min-height: 4rem;
    margin-inline: auto;
  }

  .showroom-mode-label span {
    color: var(--performance-mode-accent);
    font-weight: var(--font-performance-bold, 700);
  }

  .showroom-mode-label p {
    margin: 0;
    color: color-mix(in srgb, currentColor 68%, transparent);
    font-size: 0.9rem;
  }

  .showroom-state-matrix {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .showroom-state-matrix article {
    display: grid;
    gap: 0.4rem;
    min-height: 7rem;
    align-content: center;
    padding: 1rem;
  }

  .showroom-state-matrix article span {
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
  }

  .showroom-state-matrix > .performance-receipt-stamp {
    grid-column: 1 / -1;
  }

  .showroom-guidance {
    display: grid;
    grid-template-columns: minmax(16rem, 0.75fr) minmax(0, 1.25fr);
    gap: 2rem;
    padding: clamp(2rem, 5vw, 5rem) max(1.25rem, calc((100vw - var(--content-width-performance, 85rem)) / 2));
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
  }

  .showroom-guidance h2 {
    max-width: 12ch;
    margin: 0.75rem 0 0;
    font-family: var(--font-performance-display);
    font-size: clamp(2.2rem, 5vw, 4.5rem);
    font-weight: var(--font-performance-display-weight, 500);
    letter-spacing: var(--tracking-performance-display, -0.03em);
    line-height: var(--leading-performance-display, 0.94);
  }

  .showroom-guidance ul {
    display: grid;
    margin: 0;
    padding: 0;
    border-top: 1px solid var(--color-performance-line-strong, #9c9c96);
    list-style: none;
  }

  .showroom-guidance li {
    display: grid;
    grid-template-columns: minmax(7rem, 0.35fr) minmax(0, 1fr);
    gap: 1rem;
    padding: 1rem 0;
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .showroom-guidance li span {
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.5;
  }

  @media (max-width: 47.99rem) {
    .showroom-nav {
      align-items: flex-start;
      padding-inline: 0.75rem;
    }

    .showroom-nav > div {
      gap: 0.6rem;
    }

    .showroom-nav > div a {
      font-size: 0.78rem;
    }

    .showroom-brand span {
      display: none;
    }

    .showroom-mode-label {
      grid-template-columns: 1fr;
      gap: 0.25rem;
      width: calc(100% - 1.5rem);
      padding-block: 0.75rem;
    }

    .showroom-state-matrix,
    .showroom-guidance {
      grid-template-columns: 1fr;
    }

    .showroom-state-matrix article {
      min-height: 5rem;
    }

    .showroom-guidance li {
      grid-template-columns: 1fr;
      gap: 0.35rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(html) {
      scroll-behavior: auto;
    }

    .performance-showroom *,
    .performance-showroom *::before,
    .performance-showroom *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>
