<script lang="ts">
  import AgencyWayfindingSign from '$lib/components/AgencyWayfindingSign.svelte';
  import AgencyWayfindingHero from '$lib/components/AgencyWayfindingHero.svelte';
  import AgencyWayfindingOpening from '$lib/components/AgencyWayfindingOpening.svelte';
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
  import { getPublicProduct } from '$lib/data/productFamily';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';

  const mapProduct = getPublicProduct('map');

  const controlConditions: PerformanceCondition[] = [
    {
      label: 'Pressure',
      title: 'Test before you delegate.',
      detail: 'Work is run against real conditions while a person is still watching it.',
      tone: 'pressure'
    },
    {
      label: 'Boundary',
      title: 'Set clear permissions.',
      detail: 'Agree on the task, permissions, and reasons to stop before the first run.',
      tone: 'signal'
    },
    {
      label: 'Exception',
      title: 'Ambiguity stops the run.',
      detail: 'When the work leaves known conditions, Control waits for a named owner.',
      tone: 'risk'
    },
    {
      label: 'Settlement',
      title: 'See how each task ended.',
      detail: 'See whether it completed, stopped, or recovered, with a record and a person responsible for the next step.',
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
      title: 'Review the action',
      detail: 'Decide whether work can run, must wait for approval, or should stop with a reason.',
      href: '/products/decision',
      points: ['Run / wait / stop', 'Approval state', 'Policy reason']
    },
    {
      eyebrow: 'Proof',
      title: 'Preserve the result',
      detail:
        'See the result, who approved it, and how to undo it or recover if something failed.',
      href: '/products/proof',
      points: ['Audit trail', 'Recovery context', 'Workflow receipt']
    }
  ];

  const cadenceCards: PerformanceCardItem[] = [
    {
      eyebrow: 'Monthly',
      title: `Managed live operations. ${PUBLIC_PRICING.managedControl.longLabel}`,
      detail:
        'For one standard-risk managed production environment. No per-agent fees. Control includes Map.',
      href: agencyCoreMessaging.workflowMappingSessionHref,
      points: ['Agreed runtime oversight', 'Agreed incident response', 'Monthly operating review']
    },
    {
      eyebrow: 'Yearly',
      title: 'Review the operating boundary each year',
      detail:
        'Review changes in risk, workload, and support needs before renewing the service.',
      href: agencyCoreMessaging.workflowMappingSessionHref,
      points: ['Control includes Map', 'Annual boundary review', 'Higher-risk operation is custom']
    }
  ];

  const controlScenes: PerformanceNarrativeScene[] = [
    {
      id: 'inclusion',
      label: 'Boundary',
      summary: 'Control includes Map',
      title: 'The plan stays with the live work.',
      detail:
        'Control includes Map, so the plan stays connected to the work. It adds incoming tasks, approval checks, work history, and recovery records.',
      tone: 'allow',
      evidence: ['Standalone subscription', 'One governed workflow', 'One shared definition'],
      actions: [{ label: 'See Map', href: mapProduct.route }]
    },
    {
      id: 'surfaces',
      label: 'Operate',
      summary: 'Signal → decision → proof',
      title: 'Three views help your team run the work.',
      detail: 'Signal shows incoming work. Decision shows what needs approval. Proof records the outcome. All three views are included in Control.',
      tone: 'review',
      receipts: ['source context', 'policy reason', 'workflow receipt']
    },
    {
      id: 'cadence',
      label: 'Cadence',
      summary: 'Pricing and usage',
      title: 'One management fee, with AI usage reported separately.',
      detail:
        'AI usage stays in your account when practical or is separately metered and reported. At 75% of forecasted monthly coverage, we schedule a capacity review—not an automatic charge. New workflows and integrations are separately scoped through Build.',
      tone: 'neutral'
    },
    {
      id: 'context',
      label: 'System context',
      summary: 'Dependencies, authority, change, and proof',
      title: 'Check access and recent changes.',
      detail:
        'See the connected tools, who has access, and what changed. Missing or outdated information remains marked for review.',
      tone: 'neutral',
      receipts: ['named owner', 'run / wait / stop', 'dated change', 'recovery path']
    }
  ];
</script>

<SEO
  title="CREATE SOMETHING Control | Managed Live Operations"
  description={`Managed live operations. ${PUBLIC_PRICING.managedControl.longLabel}, with no per-agent fees, transparent AI usage, approvals, evidence, and recovery. Supported public source stays ${PUBLIC_PRICING.publicSource.label}; Control includes Map.`}
  keywords="AI workflow control, governed execution, human approval workflow, agent audit trail, workflow recovery"
  propertyName="agency"
/>

<main class="control-page">
  <AgencyWayfindingOpening>
  <PerformanceCampaignOpening
    eyebrow="CREATE SOMETHING Control"
    expression="editorial"
    title="Keep your AI systems working after launch."
    lede={`Control provides ongoing technical support for one agreed live environment. We monitor it, respond to incidents, and keep approvals and recovery records. ${PUBLIC_PRICING.managedControl.longLabel}. Control includes Map. It is separate from Focused technical support at $900/month; new Builds and AI usage are separate.`}
    density="compact"
    artifactMobilePlacement="flow"
    proof={[
      { label: 'Signal', value: 'Watch' },
      { label: 'Decision', value: 'Route' },
      { label: 'Proof', value: 'Record' }
    ]}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
      <Button href={mapProduct.route} variant="secondary">See included Map</Button>
    {/snippet}
    {#snippet artifact()}
      <AgencyWayfindingHero route="control" />
    {/snippet}
  </PerformanceCampaignOpening>
  </AgencyWayfindingOpening>
  <aside class="review-boundary">
    <div class="review-boundary__inner">
      <p><strong>Need help before launch?</strong> A <a href="/technical-review">technical review</a> checks an existing project and identifies what to fix before a pilot. Reviews and implementation are quoted separately. The $900/month starting price for Control covers agreed post-launch operations, not open-ended product development. <a href="/services#membership">Focused and Team support</a> are separate technical support memberships for diagnosis, engineering improvements, and learning.</p>
      <AgencyWayfindingSign kind="control" label="See how Control operates" detail="Watch, hold, record and recover." href="#control-operating-story" direction="down" />
    </div>
  </aside>

  <PerformanceThesisConditions
    eyebrow="Operating principle"
    title="Agree on the rules before the agent acts."
    description="We record what the system may do, who approves exceptions, and how to recover when a task fails."
    conditions={controlConditions}
    ariaLabel="Control operating principle"
  />

  <PerformanceNarrativeStage
    id="control-operating-story"
    eyebrow="One governed product"
    title="See what needs attention and what happened."
    description="Support keeps the operating context between reviews. Review incoming work, approve actions, and check results within the agreed response and scope boundaries."
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

  <aside class="route-handoff" aria-label="Control next steps">
    <div class="route-handoff__inner">
      <p class="route-handoff__current">Current path · Control · post-launch operations</p>
      <p class="route-handoff__context">Next, bring the running workflow to a mapping session. Control includes Map; new workflows and integrations need a separate Build scope.</p>
      <a class="route-handoff__return" href="/products#choose-product"><span aria-hidden="true">←</span> Compare paths</a>
      <div class="route-handoff__links">
        <AgencyWayfindingSign kind="map" label="See the included Map" href="/map" detail="Keep the plan connected to the work." />
        <AgencyWayfindingSign kind="build" label="Explore Agent Foundation" href="/agent-foundation" detail="Explore a separately scoped Build." />
      </div>
    </div>
  </aside>

  <PerformanceConversionHandoff
    expression="editorial"
    eyebrow="Choose the next boundary"
    title="Define the workflow or bring the one already running."
    description="Bring a live workflow that needs monitoring and support. If you need a new workflow or integration, we’ll quote that separately through Build."
    handoff={{
      owner: 'Workflow operator',
      authority: 'Named approval boundary',
      proof: 'Map + run + receipt',
      state: 'ready'
    }}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.workflowMappingSessionHref}>
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
      <Button href="/products" variant="secondary">Compare Map and Control</Button>
    {/snippet}
  </PerformanceConversionHandoff>
</main>

<style>
  .route-handoff {
    padding: var(--space-performance-lg) 0;
    color: var(--color-performance-ink);
    background: var(--color-performance-paper);
    border-block: 1px solid var(--color-performance-line);
  }
  .route-handoff__inner { width: 90%; margin-inline: auto; }
  .route-handoff__current { margin: 0 0 var(--space-performance-sm); font-size: var(--text-performance-caption); font-family: var(--font-performance-mono); }
  .route-handoff__context { max-width: 70ch; margin: 0 0 var(--space-performance-md); line-height: 1.6; }
  .route-handoff__return { display: inline-flex; align-items: center; gap: var(--space-performance-sm); min-height: 44px; margin-bottom: var(--space-performance-sm); color: inherit; text-underline-offset: .25em; }
  .route-handoff__return:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
  .route-handoff__links { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-performance-sm); }
  @media (max-width: 760px) { .route-handoff__links { grid-template-columns: 1fr; } }

  .review-boundary { padding-block: 2rem; color: var(--color-performance-ink); background: var(--color-performance-paper); }
  .review-boundary__inner { width: 90%; margin-inline: auto; }
  .review-boundary p { max-width: 70ch; line-height: 1.65; }
  .review-boundary a { color: inherit; text-decoration: underline; }
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
