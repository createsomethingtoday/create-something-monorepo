<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceCardGrid,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    PerformanceThesisConditions,
    SEO,
    type PerformanceCardItem,
    type PerformanceCondition,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import SystemContextArtifact from '$lib/components/SystemContextArtifact.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { turbulenceExceptionMedia } from '$lib/data/performanceMedia';
  import { getPublicProduct } from '$lib/data/productFamily';

  const mapProduct = getPublicProduct('map');

  const channelConditions: PerformanceCondition[] = [
    {
      label: 'Pressure',
      title: 'Test before you delegate.',
      detail: 'Work is run against real conditions while a person is still watching it.',
      tone: 'pressure'
    },
    {
      label: 'Boundary',
      title: 'Limits are visible, not implied.',
      detail: 'Scope, authority, and stop conditions are declared before the first run.',
      tone: 'signal'
    },
    {
      label: 'Turbulence',
      title: 'Ambiguity stops the run.',
      detail: 'When the work leaves known conditions, Control waits for a named owner.',
      tone: 'risk'
    },
    {
      label: 'Settlement',
      title: 'Every run reaches a resolved state.',
      detail: 'Shipped, blocked, or recovered — with the receipt and the next owner attached.',
      tone: 'growth'
    }
  ];

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
      title: 'Managed AI Operations from $900 per month after launch',
      detail:
        'For one standard-risk managed production environment. No per-agent fees. Control includes Map.',
      href: agencyCoreMessaging.workflowMappingSessionHref,
      points: ['Runtime oversight', 'Incident response', 'Monthly operating review']
    },
    {
      eyebrow: 'Yearly',
      title: 'Review the operating boundary each year',
      detail:
        'Keep the same governed product while risk, volume, and service expectations are reviewed explicitly.',
      href: agencyCoreMessaging.workflowMappingSessionHref,
      points: ['Control includes Map', 'Annual boundary review', 'Higher-risk operation is custom']
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
      summary: 'One fee for the operating boundary',
      title: 'Pay for accountable operation, not an agent roster.',
      detail:
        'AI usage stays in your account when practical or is separately metered and reported. At 75% of forecasted monthly coverage, we schedule a capacity review—not an automatic charge. New workflows and integrations are separately scoped through Build.',
      tone: 'neutral'
    },
    {
      id: 'context',
      label: 'System context',
      summary: 'Dependencies, authority, change, and proof',
      title: 'See the operating boundary before work runs.',
      detail:
        'Inspect what the workflow depends on, who can act, what changed, and which evidence supports the current state. Unknown and stale claims stay visible instead of becoming implied permission.',
      tone: 'neutral',
      receipts: ['named owner', 'run / wait / stop', 'dated change', 'recovery path']
    }
  ];
</script>

<SEO
  title="CREATE SOMETHING Control | Managed AI Operations"
  description="Managed AI Operations from $900 per month after launch, with no per-agent fees, transparent AI usage, approvals, evidence, and recovery. Control includes Map."
  keywords="AI workflow control, governed execution, human approval workflow, agent audit trail, workflow recovery"
  propertyName="agency"
/>

<main class="control-page">
  <PerformanceCampaignOpening
    eyebrow="CREATE SOMETHING Control"
    title="Managed AI Operations, after launch."
    lede="Control operates one standard-risk production environment from $900 per month after launch. No per-agent fees. You keep a legible workflow boundary, transparent AI usage, named approvals, and recovery context. Control includes Map."
    media={turbulenceExceptionMedia}
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

  <PerformanceThesisConditions
    eyebrow="Operating principle"
    title="Governance is the channel, not the dam."
    description="Control exists to keep delegated work moving. The boundary is what makes speed safe to grant, not a brake applied after the fact."
    conditions={channelConditions}
    ariaLabel="Control operating principle"
  />

  <PerformanceNarrativeStage
    id="control-operating-story"
    eyebrow="One governed product"
    title="Control is one operating decision, made once and kept."
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
        <SystemContextArtifact />
      {/if}
    {/snippet}
  </PerformanceNarrativeStage>

  <PerformanceConversionHandoff
    eyebrow="Choose the next boundary"
    title="Define the workflow or bring the one already running."
    description="Use Map when the system still needs a shared definition. Use Build for new workflows and integrations. Bring a launched workflow to Control when it needs accountable operation, approvals, evidence, and recovery."
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
  }
</style>
