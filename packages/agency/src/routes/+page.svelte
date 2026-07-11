<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceContrastChapter,
    PerformanceConversionHandoff,
    PerformanceFieldSequence,
    PerformancePageSection,
    PerformanceThesisConditions,
    PerformanceWorkflowMiniArtifact,
    SEO,
    type PerformanceCampaignProof,
    type PerformanceCondition,
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

  const labReadinessItems: PerformanceCondition[] = [
    {
      label: 'Mapped',
      title: '7/7 coverage',
      detail: 'Actor, AI task, human task, system, artifact, constraint, touchpoint',
      tone: 'signal'
    },
    {
      label: 'Decision pressure',
      title: 'Run / Wait / Stop',
      detail: 'Every action has an owner, approval pause, or stop condition',
      tone: 'pressure'
    },
    {
      label: 'Proof attached',
      title: '3 receipts',
      detail: 'Workflow map, owner approval, proof record before build commitment',
      tone: 'growth'
    }
  ];

  const flowStudyMetrics: PerformanceFieldStudyMetric[] = [
    { label: 'Flow boundary', value: '1 controlled path', detail: 'Scope the first lane before adding authority.' },
    { label: 'Decision gates', value: 'Run / Wait / Stop', detail: 'Every branch names who decides.' },
    { label: 'Proof condition', value: 'Receipt required', detail: 'Every action leaves an inspectable wake.' }
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
      detail: 'Safe work moves, exceptions reach a named owner, and unsafe actions stop with a reason.'
    }
  ] as const;
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
    lede="CREATE SOMETHING turns a handoff your team still watches by hand into a controlled operating path. Routine work can move, judgment reaches the right owner, unsafe actions stop, and every consequential step leaves proof."
    media={controlledFlowMedia}
    proof={heroProofItems}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>Map one workflow</Button>
      <Button href="/proof/marketplace-workflow" variant="secondary">See one complete workflow</Button>
    {/snippet}
  </PerformanceCampaignOpening>

  <PerformancePageSection
    variant="white"
    eyebrow="Business outcome"
    title="Stop watching the workflow. Keep the judgment."
    description="The goal is not more autonomous activity. It is less manual monitoring without giving away consequential authority."
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
    {/snippet}
  </PerformancePageSection>

  <PerformanceFieldSequence
    eyebrow="Performance principle"
    title="Train the workflow under pressure."
    description="One ordered field sequence keeps the operating principle, measured conditions, and receipt together."
    studies={[{
      image: '/images/performance-lab/pressure-boundary-natural.webp',
      mobileImage: '/images/performance-lab/pressure-boundary-natural-mobile.webp',
      alt: 'Black-and-white field study of water meeting a designed boundary.',
      title: 'Train the system before it runs.',
      description: 'Work moves. Governance gives it a channel: map the signal, route the decision, define the stop, and preserve the trace before authority expands.',
      principle: 'Governance directs flow.',
      metrics: flowStudyMetrics,
      proof: flowStudyProof,
      stage: 'metrics-moved'
    }]}
  />

  <PerformanceThesisConditions
    title="Train the workflow before it runs."
    description="A workflow earns delegation through explicit coverage, decision pressure, and attached proof."
    conditions={labReadinessItems}
  />

  <PerformanceContrastChapter
    eyebrow="Workflow plan"
    title="Map the work before AI runs it."
    description="Atlas turns the current process into a clear map: which signals matter, where work moves, what AI can handle, where people approve, and what proof records the outcome."
    intervention={{ label: 'Intervention 01', title: 'Atlas workflow map', detail: 'A shared canvas makes systems, authority, risk, and proof inspectable before implementation.' }}
	artifactPlacement="full-width"
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
    {/snippet}
  </PerformancePageSection>

  <PerformancePageSection
    variant="soft"
    eyebrow="Current agent environment"
    title="Built primarily with OpenAI Codex. Designed to outlast any model."
    description="We choose OpenAI deliberately for Codex and agent reasoning. The durable client system remains yours: workflow data, MCP contracts, harnesses, skills, prompts, policy, evals, receipts, routing, fallback, and recovery."
  >
    {#snippet actions()}
      <Button href="/stack">See the stack boundary</Button>
      <Button
        href="https://createsomething.ltd/canon/concepts/conviction-without-dependence"
        variant="secondary">Read the Canon</Button
      >
    {/snippet}
  </PerformancePageSection>

  <PerformanceConversionHandoff
    eyebrow="Fixed-scope first step"
    title={agencyCoreMessaging.workflowCtaHeading}
    description="Start with a workflow map and proof plan. If the map does not show a useful controlled pilot, the work stops there; if it does, the first build has a clear delegation boundary."
    handoff={{ owner: 'CREATE SOMETHING', authority: 'Operator approval', proof: 'Workflow map + proof plan', state: 'ready' }}
    artifactPlacement="full-width"
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
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: var(--font-semibold);
    text-transform: uppercase;
  }

  .operator-outcome h3,
  .operator-outcome p {
    margin: 0;
  }

  .operator-outcome h3 {
    max-width: 22ch;
    font-size: clamp(1.45rem, 2.5vw, 2.15rem);
    font-weight: var(--font-medium);
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
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: var(--font-semibold);
    line-height: 1.32;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .service-flow-artifact__copy h3 {
    margin: 0;
    color: var(--color-performance-ink, #090909);
    font-size: 1.12rem;
    font-weight: var(--font-medium);
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

  @media (max-width: 640px) {
    .operator-outcomes {
      grid-template-columns: 1fr;
    }

    .operator-outcome + .operator-outcome {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }

    .service-flow-artifacts {
      grid-template-columns: 1fr;
      border-bottom: 0;
    }

    .service-flow-artifact {
      grid-template-rows: 5.9rem minmax(0, 1fr);
      min-height: 0;
      padding: 1rem 0;
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
