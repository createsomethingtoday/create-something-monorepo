<script lang="ts">
  import {
    Button,
    ClearActionFooter,
    ClearPageSection,
    ClearPlatformHero,
    ClearWorkflowMiniArtifact,
    SEO,
    type ClearActionFooterItem,
    type ClearPlatformHeroProof
  } from '@create-something/canon';
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

  const heroProofItems: ClearPlatformHeroProof[] = [
    {
      value: 'Signal',
      label: 'Changes and requests\nenter one queue.'
    },
    {
      value: 'Decision',
      label: 'Judgment routes to\nthe right owner.'
    },
    {
      value: 'Map',
      label: 'Context shows systems,\nrisk, and impact.'
    },
    {
      value: 'Proof',
      label: 'Evidence records the\nowner and outcome.'
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

  const actionFooterItems: ClearActionFooterItem[] = [
    { label: 'Signal', value: 'One workflow your team wants to delegate' },
    { label: 'Decision', value: 'Owner, allowed actions, approval pauses, and stops' },
    { label: 'Proof', value: 'A fixed-scope map and proof plan before any build commitment' }
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

<div class="home-pilot">
  <ClearPlatformHero
    eyebrow={agencyCoreMessaging.categoryLabel}
    title="Make one workflow safe to delegate."
    description="CREATE SOMETHING turns one messy handoff into Signals, Decisions, and Proof: the process is mapped, the tools are connected, AI gets a clear lane, and your team keeps approvals, stop conditions, and an audit trail."
    proofItems={heroProofItems}
    hideAsideOnMobile={true}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>Map one workflow</Button>
      <Button href="/products" variant="secondary">See proof</Button>
    {/snippet}

    {#snippet aside()}
      <HeroTrustArtifact />
    {/snippet}
  </ClearPlatformHero>

  <ClearPageSection
    variant="white"
    eyebrow="Workflow plan"
    title="Map the work before AI runs it."
    description="Atlas turns the current process into a clear map: which signals matter, where work moves, what AI can handle, where people approve, and what proof records the outcome."
  >
    {#snippet after()}
      <PublicSubstrateCanvas />
    {/snippet}
  </ClearPageSection>

  <ClearPageSection
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
              <ClearWorkflowMiniArtifact kind={step.id} />
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
  </ClearPageSection>

  <ClearActionFooter
    eyebrow="Fixed-scope first step"
    title={agencyCoreMessaging.workflowCtaHeading}
    description="Start with a workflow map and proof plan. If the map does not show a useful controlled pilot, the work stops there; if it does, the first build has a clear delegation boundary."
    items={actionFooterItems}
  >
    {#snippet actions()}
      <Button href={agencyCoreMessaging.selfMapHref}>
        {agencyCoreMessaging.selfMapLabel}
      </Button>
      <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
        {agencyCoreMessaging.bookMappingSessionLabel}
      </Button>
    {/snippet}
  </ClearActionFooter>
</div>

<style>
  .home-pilot {
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
  }

  .home-pilot :global(.clear-platform-hero) {
    background:
      linear-gradient(90deg, rgba(10, 14, 25, 0.04) 1px, transparent 1px) 0 0 / 4.25rem 4.25rem,
      linear-gradient(180deg, var(--color-clear-panel, #ffffff) 0%, #fbfbfb 100%);
  }

  .home-pilot :global(.clear-platform-hero__kicker),
  .home-pilot :global(.clear-platform-hero__proof article) {
    background: rgba(255, 255, 255, 0.86);
  }

  .home-pilot :global(.clear-platform-hero__proof span) {
    white-space: pre-line;
  }

  .home-pilot :global(.home-process-section) {
    padding-block: 3.35rem;
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
    border-top: 1px solid var(--color-clear-border, #e1e1e1);
    border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
  }

  .service-flow-artifact {
    display: grid;
    grid-template-rows: 7.25rem minmax(0, 1fr);
    gap: 1.18rem;
    min-height: 22rem;
    padding: 1.18rem 1.22rem 1.28rem;
  }

  .service-flow-artifact + .service-flow-artifact {
    border-left: 1px solid var(--color-clear-border, #e1e1e1);
  }

  .service-flow-artifact__visual {
    display: grid;
    align-items: center;
    justify-items: center;
    min-width: 0;
    border-bottom: 1px solid var(--color-clear-border, #e1e1e1);
  }

  .service-flow-artifact__copy {
    display: grid;
    align-content: start;
    gap: 0.58rem;
    max-width: 31rem;
  }

  .service-flow-artifact__copy span,
  .service-flow-artifact__copy small {
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: var(--font-semibold);
    line-height: 1.32;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .service-flow-artifact__copy h3 {
    margin: 0;
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 1.12rem;
    font-weight: var(--font-medium);
    line-height: 1.18;
  }

  .service-flow-artifact__copy p {
    margin: 0;
    color: var(--color-clear-grey, #636363);
    font-size: 0.95rem;
    line-height: 1.45;
  }

  .service-flow-artifact__copy small {
    display: block;
    margin-top: 0.32rem;
    color: var(--color-clear-onyx, #0a0e19);
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
    color: var(--color-clear-grey, #636363);
    font-size: 0.88rem;
    line-height: 1.45;
  }

  .service-flow-action a {
    color: var(--color-clear-onyx, #0a0e19);
    text-underline-offset: 0.18em;
  }

  @media (max-width: 640px) {
    .home-pilot :global(.clear-platform-hero__proof) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.62rem;
      margin-top: 1.4rem;
    }

    .home-pilot :global(.clear-platform-hero__proof article) {
      min-height: 5.45rem;
      padding: 0.72rem;
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
      border-top: 1px solid var(--color-clear-border, #e1e1e1);
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
