<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceContrastChapter,
    PerformanceConversionHandoff,
    PerformancePageSection,
    PerformanceWorkflowMiniArtifact,
    SEO,
    type PerformanceCampaignProof,
    type PerformanceFieldStudyMetric,
    type PerformanceFieldStudyProof
  } from '@create-something/canon';
  import { controlledFlowMedia } from '@create-something/canon/components/performance/media/controlled-flow';
  import HeroTrustArtifact from '$lib/components/HeroTrustArtifact.svelte';
  import PublicSubstrateCanvas from '$lib/components/PublicSubstrateCanvas.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const services = [
    {
      name: 'Workflow Map',
      description:
        'A fixed first map of the workflow, systems, AI tasks, approval path, and first controlled pilot.',
      type: 'First workflow map',
      price: 'Fixed scope',
      priceDescription: 'Map before any build decision'
    },
    {
      name: 'Workflow Pilot',
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
        'CREATE SOMETHING builds AI workflow systems that make one business workflow safe to delegate: Signals from your tools, Decisions routed to the right human or agent, and Proof that records what happened.'
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
      label: 'Map',
      value: 'Visible boundary'
    },
    {
      label: 'Proof',
      value: 'Attached receipt'
    }
  ];

  const serviceFlowSteps = [
    {
      id: 'signal',
      eyebrow: '01 Signal',
      title: 'Watch the signals',
      detail:
        'Pick the support, revenue, production, API, or credential-touching changes the team still has to notice by hand.',
      proof: 'signal sources · workflow map · owner · systems · risk'
    },
    {
      id: 'decision',
      eyebrow: '02 Decision',
      title: 'Route the decision',
      detail:
        'Turn that map into an operator inbox with scoped actions, approval pauses, blocked states, and clear owners.',
      proof: 'decision queue · working path · runbook · release evidence'
    },
    {
      id: 'proof',
      eyebrow: '03 Proof',
      title: 'Leave proof behind',
      detail:
        'Record source evidence, policy, decision, downstream action, receipt, and recovery path when the lane goes live.',
      proof: 'Proof Graph · receipt trail · recovery path'
    }
  ] as const;

  const flowStudyMetrics: PerformanceFieldStudyMetric[] = [
    {
      label: 'Flow boundary',
      value: '1 controlled path',
      detail: 'Scope the first lane before adding authority.'
    },
    {
      label: 'Decision gates',
      value: 'Run / Wait / Stop',
      detail: 'Every branch names who decides.'
    },
    {
      label: 'Proof condition',
      value: 'Receipt required',
      detail: 'Every action leaves an inspectable wake.'
    }
  ];

  const flowStudyProof: PerformanceFieldStudyProof = {
    id: 'PL-METHOD-20260710',
    owner: 'CREATE SOMETHING',
    state: 'PROVENANCE ATTACHED',
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
      title: 'The operator returns when judgment matters.',
      detail:
        'Safe work moves, exceptions reach a named owner, and unsafe actions stop with a reason.'
    }
  ] as const;

  const fieldReportProof = [
    {
      id: '#FR-2026-01',
      kind: 'Review operations',
      title: 'Automation prepared the evidence. Human judgment still decided.',
      detail:
        'Evidence collection completed for 49 of 50 selected cases. Automated judgment remains blocked, and reviewer time savings are not yet measured.',
      state: 'verified',
      date: 'May–June 2026',
      href: '/field-reports/template-review'
    }
  ];
</script>

<SEO
  title="AI Workflow Systems | CREATE SOMETHING .agency"
  description="CREATE SOMETHING builds AI workflow systems for business operations: one messy handoff becomes Signals, Decisions, Proof, connected tools, approvals, stop conditions, and an audit trail."
  keywords="AI workflow systems, workflow automation consultant, governed AI workflows, workflow control layer, workflow mapping, workflow pilot, production automation, technical operators"
  ogImage="/og-image.png"
  propertyName="agency"
  {services}
  {faqItems}
/>

<div class="home-pilot property-performance">
  <PerformanceCampaignOpening
    eyebrow={agencyCoreMessaging.categoryLabel}
    title="Make one workflow safe to delegate."
    lede="Choose one handoff your team still checks manually. We map what can run automatically, what must wait for a person, what must stop, and what record proves what happened."
    media={controlledFlowMedia}
    proof={heroProofItems}
    density="compact"
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>Map one workflow</Button>
      <Button href="/proof/marketplace-workflow" variant="secondary">See a worked example</Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <PerformancePageSection
    variant="white"
    eyebrow="Business outcome"
    title="Stop watching the workflow. Keep the judgment."
    description="The goal is not more autonomous activity. It is less manual monitoring without giving away consequential authority."
    density="compact"
  >
    {#snippet after()}
      <div class="operator-outcomes" aria-label="Workflow before and after controlled delegation">
        {#each operatorOutcomes as outcome}
          <article class="operator-outcome operator-outcome--{outcome.state.toLowerCase()}">
            <span>{outcome.state}</span>
            <h3>{outcome.title}</h3>
            <p>{outcome.detail}</p>
          </article>
        {/each}
      </div>
      <article class="boundary-study" aria-labelledby="boundary-study-title">
        <picture class="boundary-study__media">
          <source
            media="(max-width: 47.99rem)"
            srcset="/images/performance-lab/pressure-boundary-natural-mobile.webp"
          />
          <img
            src="/images/performance-lab/pressure-boundary-natural.webp"
            alt="Black-and-white field study of water meeting a designed boundary."
            loading="lazy"
          />
        </picture>
        <div class="boundary-study__copy">
          <span>Performance principle</span>
          <h3 id="boundary-study-title">Test the boundary before work moves.</h3>
          <p>
            <strong>Decide what can move before it runs.</strong> Map the change, route the decision,
            define the stop, and preserve the record before authority expands.
          </p>
          <p class="boundary-study__principle">Governance directs flow.</p>
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
      </article>
    {/snippet}
  </PerformancePageSection>

  <PerformanceContrastChapter
    eyebrow="Workflow plan"
    title="Map the work before AI runs it."
    description="CREATE SOMETHING Map turns the current process into a clear workflow definition: which signals matter, where work moves, what AI can handle, where people approve, and what proof records the outcome."
    intervention={{
      label: 'Intervention 01',
      title: 'Map workflow definition',
      detail:
        'A shared canvas makes systems, authority, risk, and proof inspectable before implementation.'
    }}
    artifactPlacement="full-width"
    density="compact"
  >
    {#snippet artifact()}
      <PublicSubstrateCanvas />
    {/snippet}
  </PerformanceContrastChapter>

  <PerformancePageSection
    id="service-flow"
    variant="white"
    class="home-process-section"
    eyebrow="Service path"
    title="Map signals. Route decisions. Leave proof."
    description="The work stays narrow: first understand the handoff, then build one controlled pilot, then add operating rules only when live work needs them."
    density="compact"
  >
    {#snippet after()}
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
          See the <a href="/services">service path</a>, the <a href="/partners">tool stack</a>, or
          the <a href="/products">proof surfaces</a>.
        </p>
      </div>
      <div class="service-proof-row">
        {#each fieldReportProof as report}
          <a class="field-report" href={report.href}>
            <span>Field result · See what passed—and what did not.</span>
            <h3>{report.title}</h3>
            <p>{report.detail}</p>
            <small>{report.kind} · {report.state} · {report.id} · {report.date}</small>
          </a>
        {/each}
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
      </div>
    {/snippet}
  </PerformancePageSection>

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
    artifactPlacement="full-width"
    density="compact"
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

  .home-pilot :global(.home-process-section) {
    padding-block: 3.35rem;
  }

  .operator-outcomes {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-block: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .operator-outcome {
    display: grid;
    gap: 0.7rem;
    min-height: 13rem;
    padding: clamp(1.25rem, 3vw, 2.2rem);
  }

  .operator-outcome + .operator-outcome {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .operator-outcome span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold);
    text-transform: uppercase;
  }

  .operator-outcome h3,
  .operator-outcome p {
    margin: 0;
  }

  .boundary-study {
    display: grid;
    grid-template-columns: minmax(15rem, 0.72fr) minmax(18rem, 0.9fr) minmax(18rem, 1fr);
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-paper, #f3f3f0);
  }

  .boundary-study__media {
    min-height: 23rem;
  }

  .boundary-study__media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: grayscale(1);
  }

  .boundary-study__copy,
  .boundary-study__metrics,
  .boundary-study__receipt {
    margin: 0;
    padding: 1.25rem;
  }

  .boundary-study__copy {
    display: grid;
    align-content: start;
    gap: 0.75rem;
    border-right: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .boundary-study__copy > span,
  .boundary-study :is(dt, small) {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
  }

  .boundary-study__copy h3,
  .boundary-study__copy p,
  .service-proof-row :is(h3, p) {
    margin: 0;
  }

  .boundary-study__copy h3 {
    font-size: clamp(1.65rem, 3vw, 2.35rem);
    font-weight: var(--font-performance-medium);
    line-height: 1.02;
  }

  .boundary-study__copy p,
  .boundary-study__metrics span {
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.45;
  }

  .boundary-study__principle {
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
    color: var(--color-performance-ink, #090909) !important;
    font-weight: var(--font-performance-medium);
  }

  .boundary-study__metrics {
    display: grid;
    align-content: start;
    gap: 0;
  }

  .boundary-study__metrics > div {
    display: grid;
    gap: 0.4rem;
    padding: 0.85rem 0;
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .boundary-study__metrics dd {
    display: grid;
    gap: 0.25rem;
    margin: 0;
  }

  .boundary-study__receipt {
    grid-column: 2 / -1;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .boundary-study__receipt div {
    display: grid;
    gap: 0.3rem;
  }

  .boundary-study__receipt dd {
    margin: 0;
    font-size: 0.82rem;
    overflow-wrap: anywhere;
  }

  .operator-outcome h3 {
    max-width: 22ch;
    font-size: clamp(1.45rem, 2.5vw, 2.15rem);
    font-weight: var(--font-performance-medium);
    line-height: 1.05;
  }

  .operator-outcome p {
    max-width: 34rem;
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.55;
  }

  .home-pilot :global(.home-process-section .clear-page-section__copy) {
    max-width: 42rem;
    gap: 0.78rem;
  }

  .home-pilot :global(.home-process-section .clear-page-section__title) {
    max-width: 14ch;
    font-size: clamp(2.25rem, 4.5vw, 3.15rem);
    line-height: 1.02;
  }

  .home-pilot :global(.home-process-section .clear-page-section__description) {
    max-width: 38rem;
  }

  .home-pilot :global(.home-process-section .clear-page-section__after) {
    margin-top: 2.4rem;
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
    grid-template-rows: 7.25rem minmax(0, 1fr);
    gap: 1.18rem;
    min-height: 22rem;
    padding: 1.18rem 1.22rem 1.28rem;
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

  .service-proof-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    margin-top: 1.25rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .field-report,
  .ownership-callout {
    display: grid;
    align-content: start;
    gap: 0.65rem;
    padding: 1.25rem;
    color: var(--color-performance-ink, #090909);
    text-decoration: none;
  }

  .field-report {
    border-right: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .field-report:hover {
    background: var(--color-performance-paper, #f3f3f0);
  }

  .service-proof-row span,
  .service-proof-row small {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
  }

  .service-proof-row h3 {
    font-size: 1.2rem;
    font-weight: var(--font-performance-medium);
    line-height: 1.15;
  }

  .service-proof-row p {
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
      grid-template-columns: 1fr 1fr;
    }

    .boundary-study__media {
      grid-row: span 2;
    }

    .boundary-study__copy {
      border-right: 0;
      border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    }

    .boundary-study__receipt {
      grid-column: 1 / -1;
      border-left: 0;
    }
  }

  @media (max-width: 640px) {
    .operator-outcomes {
      grid-template-columns: 1fr;
    }

    .operator-outcome + .operator-outcome {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }

    .operator-outcome {
      min-height: 0;
    }

    .boundary-study,
    .service-proof-row {
      grid-template-columns: 1fr;
    }

    .boundary-study__media {
      display: block;
      grid-row: auto;
      height: 9.5rem;
      min-height: 9.5rem;
      overflow: hidden;
    }

    .boundary-study__copy,
    .field-report {
      border-right: 0;
      border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    }

    .boundary-study__receipt {
      grid-template-columns: 1fr 1fr;
      padding: 0.9rem;
    }

    .boundary-study__metrics > div {
      grid-template-columns: 6.5rem minmax(0, 1fr);
      gap: 0.75rem;
      padding: 0.65rem 0;
    }

    .service-flow-artifacts {
      grid-template-columns: 1fr;
      border-bottom: 0;
    }

    .service-flow-artifact {
      grid-template-columns: 5.5rem minmax(0, 1fr);
      grid-template-rows: none;
      gap: 0.85rem;
      min-height: 0;
      padding: 1rem 0;
    }

    .service-flow-artifact__visual {
      min-height: 7rem;
      border-right: 1px solid var(--color-performance-line, #d7d7d2);
      border-bottom: 0;
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
