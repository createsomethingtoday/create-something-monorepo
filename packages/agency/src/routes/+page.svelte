<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    PerformanceWorkflowMiniArtifact,
    SEO,
    type PerformanceCampaignProof,
    type PerformanceFieldStudyMetric,
    type PerformanceFieldStudyProof,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import HeroTrustArtifact from '$lib/components/HeroTrustArtifact.svelte';
  import AgencyPerformanceReadback from '$lib/components/AgencyPerformanceReadback.svelte';
  import AdoptionPathChooser from '$lib/components/AdoptionPathChooser.svelte';
  import IntegrationCompatibilityRail from '$lib/components/IntegrationCompatibilityRail.svelte';
  import PublicSubstrateCanvas from '$lib/components/PublicSubstrateCanvas.svelte';
  import { templateReviewFieldReport } from '$lib/data/fieldReports';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { paperFoldedHandoffMedia } from '$lib/data/performanceMedia';

  const services = [
    {
      name: 'Map',
      description:
        'A fixed first map of the workflow, systems, AI tasks, approval path, and first controlled pilot.',
      type: 'First workflow map',
      price: 'Fixed scope',
      priceDescription: 'Map before any build decision'
    },
    {
      name: 'Build',
      description:
        'One painful workflow turned into a reliable operating path with clear rules, clean handoffs, and ownership.',
      type: 'Implementation Sprint',
      price: 'Custom',
      priceDescription: 'Scoped build with optional ongoing support'
    },
    {
      name: 'Ongoing Workflow Control',
      description:
        'Ongoing care for live AI-assisted work: approvals, release checks, blocked states, recovery notes, and review rhythm.',
      type: 'Operating Plan',
      price: 'Custom',
      priceDescription: 'Monthly control plan'
    },
    {
      name: 'Enterprise Extension',
      description:
        'Cross-system control for regulated, high-volume, or multi-team workflows where auditability and recovery matter.',
      type: 'Project + Managed',
      price: 'Custom',
      priceDescription: 'Scoped implementation with optional ongoing support'
    }
  ];

  const faqItems = [
    {
      question: 'What does CREATE SOMETHING build?',
      answer:
        'CREATE SOMETHING builds AI workflow systems that make one business workflow safe to delegate. Signals show what changed. Decisions reach the right person or agent. Proof records what happened.'
    },
    {
      question: 'What makes a workflow reliable?',
      answer:
        'A workflow becomes reliable when the team can see which signals matter, who decides, what can run, what must stop, and what proof stays visible.'
    },
    {
      question: 'Where does CREATE SOMETHING start?',
      answer:
        'The work starts with one messy handoff your team wants to delegate, then maps the first controlled pilot before expanding automation.'
    },
    {
      question: 'What do clients leave with?',
      answer:
        'Clients leave with a visible workflow map, connected-system plan, approval path, run/wait/stop states, and an audit trail the team can inspect.'
    }
  ];

  const heroProofItems: PerformanceCampaignProof[] = [
    {
      label: 'Signal',
      value: 'One queue'
    },
    {
      label: 'Decision',
      value: 'Named owner'
    },
    {
      label: 'Control',
      value: 'Run / Wait / Stop'
    },
    {
      label: 'Proof',
      value: 'Attached receipt'
    }
  ];

  const serviceFlowSteps = [
    {
      id: 'signal',
      eyebrow: '01 Notice',
      title: 'Spot the change',
      detail:
        'Choose the support, revenue, production, API, or access changes your team still has to notice by hand.',
      proof: 'source · workflow · owner · system · risk'
    },
    {
      id: 'decision',
      eyebrow: '02 Decide',
      title: 'Send it to the right owner',
      detail:
        'Give the owner the context, allowed actions, approval options, and stop reason in one place.',
      proof: 'decision queue · allowed actions · runbook · release record'
    },
    {
      id: 'proof',
      eyebrow: '03 Record',
      title: 'Keep the result',
      detail:
        'Record what started the work, which rule applied, who decided, what happened next, and how to recover.',
      proof: 'source · rule · decision · result · recovery'
    }
  ] as const;

  const flowStudyMetrics: PerformanceFieldStudyMetric[] = [
    {
      label: 'Starting scope',
      value: '1 workflow',
      detail: 'Start with one workflow before allowing more actions.'
    },
    {
      label: 'Decision points',
      value: 'Run / Wait / Stop',
      detail: 'Every branch names who decides.'
    },
    {
      label: 'Required record',
      value: 'Receipt required',
      detail: 'Every action leaves a record your team can review.'
    }
  ];

  const flowStudyProof: PerformanceFieldStudyProof = {
    id: 'PL-METHOD-20260710',
    owner: 'CREATE SOMETHING',
    state: 'RECORD ATTACHED',
    verified: '2026-07-10',
    version: 'v1',
    classification: 'Public method'
  };

  const operatorOutcomes = [
    {
      state: 'Before',
      title: 'The operator watches the handoff.',
      detail: 'Routine work waits across tools, and exceptions arrive without enough context.'
    },
    {
      state: 'After',
      title: 'The operator returns when a decision matters.',
      detail:
        'Safe work moves, exceptions reach a named owner, and unsafe actions stop with a reason.'
    }
  ] as const;

  const agencyScenes: PerformanceNarrativeScene[] = [
    {
      id: 'boundary',
      label: 'Boundary',
      summary: 'Limits set',
      title: 'Stop watching every handoff. Step in when a decision matters.',
      detail:
        'Your team decides what can run, what needs approval, and what must stop before the workflow starts.',
      tone: 'review',
      actions: [{ label: agencyCoreMessaging.selfMapLabel, href: agencyCoreMessaging.selfMapHref }]
    },
    {
      id: 'map',
      label: 'Map',
      summary: 'Workflow mapped',
      title: 'Map the handoff before AI runs it.',
      detail:
        'CREATE SOMETHING Map shows where work starts, what the agent may do, and where a person must approve. It also shows when the workflow stops and what record proves the result.',
      tone: 'allow',
      evidence: [
        'One view shows systems, owners, and handoffs',
        'Agent actions and human approvals have clear limits',
        'Your team can inspect the first test before deciding to build'
      ],
      receipts: ['workflow map', 'owner list', 'record plan'],
      actions: [{ label: 'Map one workflow', href: agencyCoreMessaging.selfMapHref }]
    },
    {
      id: 'operate',
      label: 'Operate',
      summary: 'Run → record',
      title: 'Notice the change. Route the decision. Record the result.',
      detail: 'Start with one workflow. Add rules only when real work shows where they are needed.',
      tone: 'neutral',
      evidence: [
        'Each request stays connected to its decision and record',
        'The system cannot make the final decision; the field report names what passed and remains blocked',
        'Your team keeps the data, rules, tests, history, and recovery path'
      ],
      receipts: ['workflow map', templateReviewFieldReport.id, 'recovery path']
    }
  ];
</script>

<SEO
  title="AI Workflow Systems | CREATE SOMETHING .agency"
  description="CREATE SOMETHING builds AI workflow systems for business operations. One messy handoff becomes a workflow with named approvals, clear stop conditions, and an audit trail."
  keywords="AI workflow systems, workflow automation consultant, governed AI workflows, workflow control layer, workflow mapping, workflow pilot, production automation, technical operators"
  ogImage="/og-image.png"
  propertyName="agency"
  {services}
  {faqItems}
/>

<div class="home-pilot property-performance">
  <PerformanceCampaignOpening
    eyebrow={agencyCoreMessaging.categoryLabel}
    title="Make one workflow ready to delegate."
    lede="Choose a handoff your team still checks by hand. We map what can run, when a person steps in, what must stop, and what record proves the result."
    media={paperFoldedHandoffMedia}
    proof={heroProofItems}
    mode="paper"
    density="compact"
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>Map one workflow</Button>
      <Button href="/proof/marketplace-workflow" variant="secondary"
        >See the Marketplace workflow</Button
      >
    {/snippet}
  </PerformanceCampaignOpening>

  <AgencyPerformanceReadback />

  <PerformanceNarrativeStage
    id="agency-operating-story"
    eyebrow="One workflow, step by step"
    title="Keep the judgment. Delegate the rest."
    description="Your team sets the limits before work moves. We map the handoff, test one workflow, and keep a record of every run."
    scenes={agencyScenes}
    ariaLabel="Agency operating story"
    density="compact"
  >
    {#snippet artifact(scene: PerformanceNarrativeScene)}
      {#if scene.id === 'boundary'}
        <article class="boundary-study" aria-label="Boundary study: run, wait, stop">
          <figure class="boundary-study__media">
            <picture>
              <source
                media="(max-width: 640px)"
                srcset="/images/performance-lab/paper-boundary-authority-mobile.webp?v=cre-1592"
              />
              <img
                src="/images/performance-lab/paper-boundary-authority.webp?v=cre-1592"
                alt="A porcelain paper decision path held at a black authority spine, where open, clamped, and stopped edges remain attached to a blank receipt."
                loading="lazy"
                width="1024"
                height="1536"
              />
            </picture>
            <figcaption>Paper pressure study · Run / Wait / Stop</figcaption>
          </figure>
          <div class="boundary-study__body">
            <div
              class="boundary-study__outcomes"
              aria-label="Workflow before and after controlled delegation"
            >
              {#each operatorOutcomes as outcome}
                <article class="operator-outcome operator-outcome--{outcome.state.toLowerCase()}">
                  <span>{outcome.state}</span>
                  <h3>{outcome.title}</h3>
                  <p>{outcome.detail}</p>
                </article>
              {/each}
            </div>
            <dl class="boundary-study__metrics">
              {#each flowStudyMetrics as metric}
                <div>
                  <dt>{metric.label}</dt>
                  <dd><strong>{metric.value}</strong><span>{metric.detail}</span></dd>
                </div>
              {/each}
            </dl>
            <dl class="boundary-study__receipt" aria-label="Boundary study receipt">
              <div>
                <dt>Receipt</dt>
                <dd>{flowStudyProof.id}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{flowStudyProof.owner}</dd>
              </div>
              <div>
                <dt>State</dt>
                <dd>{flowStudyProof.state}</dd>
              </div>
              <div>
                <dt>Verified</dt>
                <dd>{flowStudyProof.verified}</dd>
              </div>
            </dl>
          </div>
        </article>
      {:else if scene.id === 'map'}
        <div class="agency-stage-map" aria-label="Map workflow definition">
          <PublicSubstrateCanvas />
        </div>
      {:else}
        <div class="service-flow-artifacts" aria-label="CREATE SOMETHING service flow">
          {#each serviceFlowSteps as step}
            <article class="service-flow-artifact service-flow-artifact--{step.id}">
              <div class="service-flow-artifact__visual">
                <PerformanceWorkflowMiniArtifact kind={step.id} />
              </div>
              <div class="service-flow-artifact__copy">
                <span>{step.eyebrow}</span>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
                <small>{step.proof}</small>
              </div>
            </article>
          {/each}
        </div>
        <div class="service-flow-action">
          <Button href={agencyCoreMessaging.selfMapHref}>{agencyCoreMessaging.selfMapLabel}</Button>
          <p>
            See the <a href="/services">service path</a>, the <a href="/partners">tools we use</a>,
            or the <a href="/products">evidence</a>.
          </p>
        </div>
        <aside class="ownership-callout">
          <span>How we build</span>
          <h3>Built with OpenAI Codex. Designed to remain yours.</h3>
          <p>
            We use Codex to map, build, and maintain the workflow. Your team keeps the data,
            connections, approval rules, tests, operating history, and recovery path. If the model
            or agent environment changes, the system does not have to start over.
          </p>
          <div>
            <a href="/stack">See what you keep</a>
            <a href="https://createsomething.ltd/canon/concepts/conviction-without-dependence"
              >Why we build this way</a
            >
          </div>
        </aside>
      {/if}
    {/snippet}
  </PerformanceNarrativeStage>

  <AdoptionPathChooser />

  <IntegrationCompatibilityRail surface="homepage" />

  <PerformanceConversionHandoff
    eyebrow="Fixed-scope first step"
    title={agencyCoreMessaging.workflowCtaHeading}
    description="Start with a workflow map and proof plan. If the map does not show a useful controlled pilot, the work stops there; if it does, the first build has a clear delegation boundary."
    handoff={{
      owner: 'CREATE SOMETHING',
      authority: 'Operator approval',
      proof: 'Workflow map + proof plan',
      state: 'ready'
    }}
    artifactPlacement="sidecar"
    density="concise"
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>
        {agencyCoreMessaging.selfMapLabel}
      </Button>
      <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
    {/snippet}
    {#snippet aside()}<HeroTrustArtifact />{/snippet}
  </PerformanceConversionHandoff>
</div>

<style>
  .home-pilot {
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
  }

  .boundary-study {
    display: grid;
    grid-template-columns: minmax(15rem, 0.68fr) minmax(0, 1.32fr);
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-paper, #f3f3f0);
  }

  .boundary-study__media {
    position: relative;
    margin: 0;
    min-height: 31rem;
    border-right: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-ink, #090909);
    overflow: hidden;
  }

  .boundary-study__media picture {
    display: block;
    width: 100%;
    height: 100%;
  }

  .boundary-study__media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }

  .boundary-study__media figcaption {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    padding: 0.65rem 0.8rem;
    border-top: 1px solid var(--color-performance-line-strong, #a9aaa5);
    background: color-mix(in srgb, var(--color-performance-ink, #090909) 88%, transparent);
    color: var(--color-performance-panel, #ffffff);
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
  }

  .boundary-study__body {
    display: grid;
    align-content: start;
    min-width: 0;
  }

  .boundary-study__outcomes,
  .boundary-study__metrics,
  .boundary-study__receipt {
    margin: 0;
  }

  .boundary-study :is(dt, small) {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
  }

  .ownership-callout :is(h3, p) {
    margin: 0;
  }

  .boundary-study__metrics span {
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.45;
  }

  .boundary-study__metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .boundary-study__metrics > div {
    display: grid;
    gap: 0.4rem;
    padding: 0.85rem;
  }

  .boundary-study__metrics > div + div {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .boundary-study__metrics dd {
    display: grid;
    gap: 0.25rem;
    margin: 0;
  }

  .boundary-study__receipt {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .boundary-study__receipt div {
    display: grid;
    gap: 0.3rem;
    padding: 0.7rem 0.85rem;
  }

  .boundary-study__receipt div + div {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .boundary-study__receipt dd {
    margin: 0;
    font-size: 0.82rem;
    overflow-wrap: anywhere;
  }

  .boundary-study__outcomes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .operator-outcome {
    display: grid;
    align-content: start;
    gap: 0.45rem;
    padding: 0.9rem;
  }

  .operator-outcome + .operator-outcome {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .operator-outcome span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    font-weight: var(--font-performance-semibold);
    text-transform: uppercase;
  }

  .operator-outcome h3,
  .operator-outcome p {
    margin: 0;
  }

  .operator-outcome h3 {
    max-width: 22ch;
    font-size: clamp(1.05rem, 1.8vw, 1.35rem);
    font-weight: var(--font-performance-medium);
    line-height: 1.1;
  }

  .operator-outcome p {
    max-width: 34rem;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.82rem;
    line-height: 1.42;
  }

  .service-flow-artifacts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .service-flow-artifact {
    display: grid;
    grid-template-rows: 5.5rem minmax(0, 1fr);
    gap: 0.9rem;
    min-height: 17rem;
    padding: 1rem;
  }

  .service-flow-artifact + .service-flow-artifact {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .service-flow-artifact__visual {
    display: grid;
    align-items: center;
    justify-items: center;
    min-width: 0;
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .service-flow-artifact__copy {
    display: grid;
    align-content: start;
    gap: 0.58rem;
    max-width: 31rem;
  }

  .service-flow-artifact__copy span,
  .service-flow-artifact__copy small {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold);
    line-height: 1.32;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .service-flow-artifact__copy h3 {
    margin: 0;
    color: var(--color-performance-ink, #090909);
    font-size: 1.12rem;
    font-weight: var(--font-performance-medium);
    line-height: 1.18;
  }

  .service-flow-artifact__copy p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.95rem;
    line-height: 1.45;
  }

  .service-flow-artifact__copy small {
    display: block;
    margin-top: 0.32rem;
    color: var(--color-performance-ink, #090909);
    text-transform: none;
  }

  .service-flow-action {
    display: flex;
    flex-wrap: wrap;
    gap: 0.9rem 1.1rem;
    align-items: center;
    justify-content: space-between;
    margin-top: 1.4rem;
    padding-top: 1.2rem;
  }

  .service-flow-action p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.88rem;
    line-height: 1.45;
  }

  .service-flow-action a {
    color: var(--color-performance-ink, #090909);
    text-underline-offset: 0.18em;
  }

  .ownership-callout {
    display: grid;
    align-content: start;
    gap: 0.65rem;
    margin-top: 1.25rem;
    padding: 1.25rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    color: var(--color-performance-ink, #090909);
  }

  .ownership-callout > span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
  }

  .ownership-callout h3 {
    font-size: 1.2rem;
    font-weight: var(--font-performance-medium);
    line-height: 1.15;
  }

  .ownership-callout p {
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.92rem;
    line-height: 1.45;
  }

  .ownership-callout div {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .ownership-callout a {
    color: var(--color-performance-ink, #090909);
    font-size: 0.88rem;
    font-weight: var(--font-performance-semibold);
    text-underline-offset: 0.18em;
  }

  @media (max-width: 980px) {
    .boundary-study {
      grid-template-columns: minmax(12rem, 0.58fr) minmax(0, 1.42fr);
    }

    .boundary-study__media {
      min-height: 34rem;
    }
  }

  @media (max-width: 640px) {
    .boundary-study__outcomes {
      grid-template-columns: 1fr;
    }

    .operator-outcome + .operator-outcome {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }

    .operator-outcome {
      min-height: 0;
    }

    .boundary-study {
      grid-template-columns: 1fr;
    }

    .boundary-study__media {
      display: block;
      grid-row: auto;
      height: 9.5rem;
      min-height: 9.5rem;
      border-right: 0;
      border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
      overflow: hidden;
    }

    .boundary-study__media img {
      object-position: center 54%;
    }

    .boundary-study__metrics {
      grid-template-columns: 1fr;
    }

    .boundary-study__metrics > div + div {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }

    .boundary-study__metrics > div {
      grid-template-columns: 6.5rem minmax(0, 1fr);
      gap: 0.75rem;
      padding: 0.7rem 0.9rem;
    }

    .boundary-study__receipt {
      grid-template-columns: 1fr 1fr;
    }

    .boundary-study__receipt div:nth-child(3) {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }

    .boundary-study__receipt div:nth-child(4) {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
    }

    .service-flow-artifacts {
      grid-template-columns: 1fr;
      border-bottom: 0;
    }

    .service-flow-artifact {
      grid-template-columns: 1fr;
      grid-template-rows: none;
      gap: 0;
      min-height: 0;
      padding: 1rem 0;
    }

    .service-flow-artifact__visual {
      display: none;
    }

    .service-flow-artifact + .service-flow-artifact {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }

    .service-flow-action {
      align-items: stretch;
    }

    .service-flow-action :global(.btn) {
      width: 100%;
      justify-content: center;
    }
  }
</style>
