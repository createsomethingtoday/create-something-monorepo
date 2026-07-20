<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceCardGrid,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    SEO,
    type PerformanceCardItem,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { getPublicProduct } from '$lib/data/productFamily';

  const mapProduct = getPublicProduct('map');

  const operatorSurfaces: PerformanceCardItem[] = [
    {
      eyebrow: 'Signal',
      title: 'Watch the change',
      detail: 'Capture the source, owner, affected system, and reason the work needs attention.',
      href: '/products/signal',
      points: ['Operator Inbox', 'Source context', 'Named ownership']
    },
    {
      eyebrow: 'Decision',
      title: 'Route the judgment',
      detail: 'Decide whether work can run, must wait for approval, or should stop with a reason.',
      href: '/products/decision',
      points: ['Run / wait / stop', 'Approval state', 'Policy reason']
    },
    {
      eyebrow: 'Proof',
      title: 'Preserve the result',
      detail:
        'Keep the evidence, decision, outcome, receipt, rollback note, and next owner together.',
      href: '/products/proof',
      points: ['Audit trail', 'Recovery context', 'Workflow receipt']
    }
  ];

  const cadenceCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Monthly',
      title: 'Operate and review month to month',
      detail:
        'A standalone Control subscription with Map included. Exact pricing activates only after the approved Stripe price exists.',
      href: agencyCoreMessaging.workflowMappingSessionHref,
      points: ['Control includes Map', 'Recurring review', 'Launch pricing pending']
    },
    {
      eyebrow: 'Yearly',
      title: 'Keep one governed operating year',
      detail:
        'The same product boundary on a yearly cadence. Exact pricing activates only after the approved Stripe price exists.',
      href: agencyCoreMessaging.workflowMappingSessionHref,
      points: ['Control includes Map', 'Annual commitment', 'Launch pricing pending']
    }
  ];

  const controlScenes: PerformanceNarrativeScene[] = [
    {
      id: 'inclusion',
      label: 'Boundary',
      summary: 'Control includes Map',
      title: 'One governed workflow keeps one shared definition.',
      detail:
        'Map supplies the approved workflow definition. Control adds live Signal intake, Decision routing, Proof, policy, approvals, runs, blocked states, receipts, and recovery without creating a second system of record.',
      tone: 'allow',
      evidence: ['Standalone subscription', 'One governed workflow', 'One shared definition'],
      actions: [{ label: 'See Map', href: mapProduct.route }]
    },
    {
      id: 'surfaces',
      label: 'Operate',
      summary: 'Signal → decision → proof',
      title: 'Three operator surfaces form one governed product.',
      detail: 'Signal, Decision, and Proof are included operating surfaces, not separate licenses.',
      tone: 'review',
      receipts: ['source context', 'policy reason', 'workflow receipt']
    },
    {
      id: 'cadence',
      label: 'Cadence',
      summary: 'Monthly or yearly',
      title: 'Choose the review rhythm, not a different product.',
      detail:
        'The product boundary is fixed. Exact pricing activates only after the approved Stripe products and price IDs exist and are verified.',
      tone: 'neutral'
    },
    {
      id: 'foundation',
      label: 'Foundation',
      summary: 'One owned system',
      title: 'Map and Control use the same operating foundation.',
      detail:
        'Substrate keeps the records, and Topology supplies system context. The shared canvas carries the workflow definition. The governed runtime preserves approvals, runs, receipts, and recovery.',
      tone: 'neutral',
      receipts: ['Substrate', 'Topology', 'shared canvas', 'governed runtime']
    }
  ];
</script>

<SEO
  title="CREATE SOMETHING Control | Governed Workflow Operation"
  description="CREATE SOMETHING Control is a standalone subscription for approvals, policy, runs, evidence, and recovery. Control includes Map."
  keywords="AI workflow control, governed execution, human approval workflow, agent audit trail, workflow recovery"
  propertyName="agency"
/>

<main class="control-page">
  <PerformanceCampaignOpening
    eyebrow="CREATE SOMETHING Control"
    title="Run delegated work with a boundary."
    lede="Control is the standalone operating product for live human-agent workflows. It watches changes, routes judgment, records proof, and preserves recovery context. Control includes Map, so every governed workflow stays legible."
    media={{
      src: '/images/performance-lab/product-system-natural.webp',
      mobileSrc: '/images/performance-lab/product-system-natural-mobile.webp',
      alt: 'Aerial black-and-white view of a water-control structure routing flow through bounded channels'
    }}
    proof={[
      { label: 'Signal', value: 'Watch' },
      { label: 'Decision', value: 'Route' },
      { label: 'Proof', value: 'Record' }
    ]}
  >
    {#snippet actions()}
      <Button href={mapProduct.route}>See Map</Button>
      <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <PerformanceNarrativeStage
    id="control-operating-story"
    eyebrow="One governed product"
    title="Boundary. Operate. Cadence. Foundation."
    description="Control shows one operating decision at a time. Set the workflow boundary, see where judgment moves, choose a review rhythm, and keep every state in one owned system."
    scenes={controlScenes}
    ariaLabel="Control operating story"
  >
    {#snippet artifact(scene: PerformanceNarrativeScene)}
      {#if scene.id === 'inclusion'}
        <aside class="control-loop" aria-label="CREATE SOMETHING Control operating loop">
          <div>
            <span>01</span><strong>Signal</strong>
            <p>Watch the source.</p>
          </div>
          <div>
            <span>02</span><strong>Decision</strong>
            <p>Route run, wait, or stop.</p>
          </div>
          <div>
            <span>03</span><strong>Proof</strong>
            <p>Record the outcome.</p>
          </div>
          <footer><span>Shared context</span><strong>{mapProduct.name}</strong></footer>
        </aside>
      {:else if scene.id === 'surfaces'}
        <PerformanceCardGrid
          items={operatorSurfaces}
          columns={3}
          ariaLabel="Control operator surfaces"
        />
      {:else if scene.id === 'cadence'}
        <PerformanceCardGrid
          items={cadenceCards}
          columns={2}
          ariaLabel="Control subscription cadences"
        />
      {:else}
        <aside class="foundation-receipt" aria-label="Map and Control shared foundation">
          <span>Database</span><strong>Substrate records</strong>
          <span>Context</span><strong>Topology derives</strong>
          <span>Definition</span><strong>Shared canvas</strong>
          <span>Operation</span><strong>Runs + receipts</strong>
        </aside>
      {/if}
    {/snippet}
  </PerformanceNarrativeStage>

  <PerformanceConversionHandoff
    eyebrow="Choose the next boundary"
    title="Define the workflow or bring the one already running."
    description="Use Map when the system still needs a shared definition. Bring an existing workflow directly to Control when approvals, evidence, or recovery are the missing layer."
    handoff={{
      owner: 'Workflow operator',
      authority: 'Named approval boundary',
      proof: 'Map + run + receipt',
      state: 'ready'
    }}
  >
    {#snippet actions()}
      <Button href="/products">Compare Map and Control</Button>
      <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
    {/snippet}
  </PerformanceConversionHandoff>
</main>

<style>
  .control-loop {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #fff);
    overflow: hidden;
  }

  .control-loop > div {
    display: grid;
    gap: 0.45rem;
    min-height: 9rem;
    padding: 1rem;
    border-right: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .control-loop > div:nth-child(3) {
    border-right: 0;
  }

  .control-loop span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
  }

  .control-loop strong {
    font-size: 1.05rem;
  }

  .control-loop p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
  }

  .control-loop footer {
    display: flex;
    grid-column: 1 / -1;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.85rem 1rem;
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-paper, #f3f3f0);
  }

  .foundation-receipt {
    display: grid;
    grid-template-columns: minmax(7rem, 0.35fr) minmax(0, 1fr);
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    overflow: hidden;
    background: var(--color-performance-panel, #fff);
  }

  .foundation-receipt span,
  .foundation-receipt strong {
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .foundation-receipt span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    text-transform: uppercase;
  }

  .foundation-receipt > :nth-last-child(-n + 2) {
    border-bottom: 0;
  }

  @media (max-width: 640px) {
    .control-loop {
      grid-template-columns: 1fr;
    }
    .control-loop > div {
      min-height: auto;
      border-right: 0;
      border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    }
    .control-loop > div:nth-child(3) {
      border-bottom: 0;
    }
    .control-loop footer {
      grid-column: auto;
      flex-direction: column;
    }
    .foundation-receipt {
      grid-template-columns: 1fr;
    }
    .foundation-receipt > :nth-last-child(2) {
      border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    }
  }
</style>
