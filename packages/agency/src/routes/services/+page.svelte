<script lang="ts">
  import { Button, SEO } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';
  import ArtifactSystemStrip from '$lib/components/ArtifactSystemStrip.svelte';
  import GovernedExecutionFlow from '$lib/components/GovernedExecutionFlow.svelte';
  import MappingSessionBrief from '$lib/components/MappingSessionBrief.svelte';
  import ServiceWedgeBlueprint from '$lib/components/ServiceWedgeBlueprint.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const deliveryVector = {
    canonicalPhrase: 'Skills on MCP',
    clientFacingLabel: 'Skills + MCP',
    technicalLabel: 'MCP + Skills'
  };

  const services = [
    {
      name: 'MCP Wedge',
      description:
        'A narrow discovery or compliance wedge when the client needs trusted connectivity before the operating layer.',
      type: 'Entry wedge',
      price: 'Custom',
      priceDescription: 'Scoped host setup'
    },
    {
      name: 'Workflow System',
      description:
        'A single workflow rebuilt with clear rules, clean handoffs, and production-safe behavior.',
      type: 'Implementation Sprint',
      price: 'Custom',
      priceDescription: 'Scoped build'
    },
    {
      name: 'Policy OS',
      description:
        'Approvals, policy artifacts, release checks, blocked states, and incident loops for workflows already in motion.',
      type: 'Governed Execution Retainer',
      price: 'Custom',
      priceDescription: 'Monthly'
    },
    {
      name: 'Enterprise Extension',
      description:
        'Audit-ready orchestration for regulated, high-volume, or multi-system workflows that need deterministic recovery.',
      type: 'Project + Managed',
      price: 'Custom',
      priceDescription: 'Scoped implementation'
    }
  ];

  const offerCards = [
    {
      tag: 'Entry wedge',
      title: 'MCP Wedge',
      summary: 'Use this when the connection is the job and your team will operate the workflow directly.',
      points: [
        'Connectivity validation',
        'Scoped host setup',
        'Read-only or constrained rollout'
      ]
    },
    {
      tag: 'Start here',
      title: 'Workflow System',
      summary: 'Fix the first workflow your team still does by hand and make the handoffs reliable.',
      points: [
        'Business-rule mapping',
        'Workflow implementation',
        'Auth and access setup',
        'Portable runbooks and handoff artifacts'
      ],
      featured: true
    },
    {
      tag: 'Default paid offer',
      title: 'Policy OS',
      summary: `The governed execution layer that makes ${deliveryVector.clientFacingLabel} safe to run faster in production.`,
      points: [
        'Approval and block boundaries',
        'Reason-coded access decisions',
        'Operator brief and escalation surface',
        'Release checks and incident loops',
        'Evals tied to real workflow behavior'
      ]
    },
    {
      tag: 'High-stakes scale',
      title: 'Enterprise Extension',
      summary: 'Add this when several systems, teams, or compliance requirements must stay aligned.',
      points: [
        'Cross-system orchestration',
        'Custom trust boundaries',
        'Deterministic retries and recovery',
        'Auditability for multi-team operations'
      ]
    }
  ];

  const boundaryPoints = [
    'You bring the workflow, constraints, and approval owner.',
    'CREATE SOMETHING maps the rules, builds the control layer, and ships the operating artifacts.',
    'Your team gets visibility through runbooks, approvals, release evidence, operator briefs, and working software.'
  ];

  const trustBoundaries = [
    {
      label: 'No hidden vendor lock-in',
      detail:
        'Vendor services are named because they help explain the system. The workflow map, contracts, policy, and runbooks stay portable.'
    },
    {
      label: 'No secret sprawl',
      detail:
        'Tokens, API keys, and client credentials belong in the approved vault or runtime environment, not in prompts or handoff docs.'
    },
    {
      label: 'No fake autonomy',
      detail:
        'Agents only act inside named permissions. The system shows what can run, what needs approval, and what stops.'
    }
  ];

  const heroSignals = [
    {
      label: 'Map',
      value: '1 workflow',
      detail: 'The handoff your team needs done without constant human coverage.'
    },
    {
      label: 'Govern',
      value: '3 states',
      detail: 'Auto-allow, approval-needed, or blocked with reason.'
    },
    {
      label: 'Surface',
      value: 'Quiet brief',
      detail: 'The operator sees only what needs judgment.'
    }
  ];

  const surfacePoints = [
    {
      label: 'Policy OS',
      title: 'Decides what needs judgment',
      detail:
        'The operating layer classifies safe work, approval-needed work, and blocked actions before the operator is interrupted.'
    },
    {
      label: 'Ink',
      title: 'Makes the decision visible',
      detail:
        'The physical surface is optional, but useful when the buyer needs to see and feel the operator promise.'
    },
    {
      label: 'Operator',
      title: 'Acts only when needed',
      detail:
        'The service is designed so the human returns to the dashboard for evidence and action, not for constant monitoring.'
    }
  ];

  const faqItems = [
    {
      question: 'What is your primary service?',
      answer:
        'Workflow System fixes the first painful workflow. Policy OS becomes the core engagement once speed needs approvals, release controls, and ongoing oversight. Enterprise Extension covers the highest-stakes environments.'
    },
    {
      question: 'Are you joining our team or running internal ops?',
      answer:
        'No. I operate as a solo specialist using CREATE SOMETHING as the delivery toolchain. You get scoped delivery, governed agent capacity, artifact-backed visibility, approval points, and a clean handoff instead of open-ended staffing.'
    },
    {
      question: 'Are agents part of the workforce?',
      answer:
        'They can be, but connection is only the starting point. Agents belong in the workflow when they have a clear job, scoped tools, approval boundaries, and evidence. MCPs are the toolkits; Policy OS decides what agents can do, what needs a person, and what must stop.'
    },
    {
      question: 'Do you build full business systems and run onboarding?',
      answer:
        'When full system development and team onboarding are the primary need, I provide a direct referral path to Half Dozen. .agency is optimized for workflow systems and governed execution, not ongoing admin coverage.'
    },
    {
      question: 'What does .agency own?',
      answer:
        '.agency owns the rules, approvals, handoffs, release controls, and operating artifacts around the workflow. Your team keeps business context, approval ownership, and long-term control.'
    },
    {
      question: 'When should we add Policy OS?',
      answer:
        'Add it when failures become expensive or the workflow touches revenue, customer trust, compliance, or several systems that must stay in sync.'
    },
    {
      question: 'Do you still offer MCP Wedge?',
      answer:
        'Yes. MCP Wedge still works for discovery, compliance-constrained pilots, or teams that need the connection before the operating layer.'
    },
    {
      question: 'Do we need to understand MCP or the vendor stack first?',
      answer:
        'No. Bring the workflow and the accounts involved. I translate the technical choices into a stack boundary, decision states, and implementation path your team can explain.'
    },
    {
      question: 'Do clients own the implementation?',
      answer:
        'Yes. Clients retain ownership of code, workflows, and operating documentation. The delivery is meant to stay portable after launch.'
    },
    {
      question: 'Is Ink the product?',
      answer:
        'Ink is the visible operator surface. The paid service is the workflow mapping, policy layer, artifacts, and escalation behavior that make the surface trustworthy.'
    },
    {
      question: 'Why the phrase Skills + MCP?',
      answer: `Client-facing delivery is ${deliveryVector.clientFacingLabel}. MCP handles connectivity. Skills carry behavior and workflow intent. Policy OS turns both into a trusted workflow.`
    }
  ];
</script>

<SEO
  title="How I Work | Trusted Workflow Infrastructure"
  description="A connected agent is not a trusted workflow. CREATE SOMETHING .agency maps one workflow, defines action boundaries, and installs governed execution before production risk rises."
  keywords="trusted workflow infrastructure, Policy OS, workflow system, MCP wedge, production automation, agent governance"
  ogImage="/og-image.svg"
  propertyName="agency"
  {services}
  {faqItems}
/>

<section class="hero-page">
  <div class="shell-inner-pad services-shell hero-layout">
    <div class="hero-copy">
      <BlurFade delay={0}>
        <span class="product-kicker">How I Work</span>
      </BlurFade>

      <BlurFade delay={0.05}>
        <h1 class="hero-title">Start with one workflow, not a connected agent.</h1>
      </BlurFade>

      <BlurFade delay={0.1}>
        <p class="hero-detail">
          Bring the workflow where the agent can connect but your team still babysits the outcome. I
          map what it may do, where a human approves, how it recovers, and what evidence proves it
          worked.
        </p>
      </BlurFade>

      <BlurFade delay={0.15}>
        <div class="hero-actions">
          <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
          <Button href="#offer-ladder" variant="secondary">See Offer Ladder</Button>
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
        <p class="hero-note">Connected agent → trusted workflow.</p>
      </BlurFade>
    </div>

    <BlurFade delay={0.2}>
      <aside class="product-surface product-surface--soft hero-brief" aria-label="Calm transparent workflow service brief">
        <span class="product-kicker">Trusted workflow delivery</span>
        <h2>CREATE SOMETHING turns agent capacity into one governed operating path.</h2>
        <div class="hero-brief__grid" role="list">
          {#each heroSignals as signal}
            <div class="hero-brief__item" role="listitem">
              <span>{signal.label}</span>
              <strong>{signal.value}</strong>
              <p>{signal.detail}</p>
            </div>
          {/each}
        </div>
      </aside>
    </BlurFade>
  </div>
</section>

<section class="boundary-section">
  <div class="shell-inner-pad services-shell">
    <div class="product-surface product-surface--soft boundary-panel">
      <div class="section-lead">
        <BlurFade>
          <span class="product-kicker">Relationship boundary</span>
        </BlurFade>
        <BlurFade delay={0.05}>
          <h2>You are not hiring an internal admin.</h2>
        </BlurFade>
        <BlurFade delay={0.1}>
          <p>
            You are bringing in a solo operator with a purpose-built toolchain to diagnose,
            rebuild, and govern one critical operating path. The work is scoped, visible, and
            designed for your team to inherit.
          </p>
        </BlurFade>
      </div>

      <BlurFade delay={0.15}>
        <ul class="product-list boundary-list">
          {#each boundaryPoints as point}
            <li>{point}</li>
          {/each}
        </ul>
      </BlurFade>
    </div>
  </div>
</section>

<section class="trust-section">
  <div class="shell-inner-pad services-shell">
    <div class="product-surface product-surface--soft trust-panel">
      <div class="section-lead">
        <BlurFade>
          <span class="product-kicker">Trust boundaries</span>
        </BlurFade>
        <BlurFade delay={0.05}>
          <h2>Transparency creates calm when the workflow has clear boundaries.</h2>
        </BlurFade>
        <BlurFade delay={0.1}>
          <p>
            The buyer sees enough to trust and inherit the system. Sensitive credentials,
            private data, and platform-specific complexity stay behind the right operational
            boundary, so the experience feels calm instead of obscure.
          </p>
        </BlurFade>
      </div>

      <div class="trust-grid" role="list">
        {#each trustBoundaries as boundary, index}
          <BlurFade delay={0.14 + index * 0.05}>
            <article class="trust-item" role="listitem">
              <span>{boundary.label}</span>
              <p>{boundary.detail}</p>
            </article>
          </BlurFade>
        {/each}
      </div>
    </div>
  </div>
</section>

<section class="offer-section" id="offer-ladder">
  <div class="shell-inner-pad services-shell">
    <div class="section-lead section-lead--center">
      <BlurFade>
        <span class="product-kicker">Offer ladder</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>From connected agent to governed execution.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          Start with the narrowest offer that proves value. Add Policy OS when the workflow starts
          touching revenue, compliance, or customer trust.
        </p>
      </BlurFade>
    </div>

    <BlurFade delay={0.14}>
      <ServiceWedgeBlueprint />
    </BlurFade>

    <div class="offer-grid">
      {#each offerCards as offer, index}
        <BlurFade delay={0.15 + index * 0.06}>
          <article class="product-surface offer-card" class:offerFeatured={offer.featured}>
            <span class="offer-tag">{offer.tag}</span>
            <h3>{offer.title}</h3>
            <p>{offer.summary}</p>
            <ul class="product-list">
              {#each offer.points as point}
                <li>{point}</li>
              {/each}
            </ul>
          </article>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="flow-section">
  <div class="shell-inner-pad services-shell flow-layout">
    <div class="section-lead">
      <BlurFade>
        <span class="product-kicker">Governed execution</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Where Policy OS fits.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          Workflow System gets the first handoff working. Policy OS turns connected agent capacity
          into a trusted workflow by deciding what runs automatically, what needs review, and what
          stops with a reason.
        </p>
      </BlurFade>
    </div>

    <BlurFade delay={0.15}>
      <GovernedExecutionFlow
        title="Policy OS"
        description="Hub MCP routes the request. Policy OS turns the connected agent into a trusted workflow by deciding what runs, what waits, and what stops with a reason."
      />
    </BlurFade>
  </div>
</section>

<section class="surface-section">
  <div class="shell-inner-pad services-shell">
    <div class="product-surface product-surface--soft surface-panel">
      <div class="section-lead">
        <BlurFade>
          <span class="product-kicker">Where Ink fits</span>
        </BlurFade>
        <BlurFade delay={0.05}>
          <h2>Ink is the visible surface. The engagement is the operating layer behind it.</h2>
        </BlurFade>
        <BlurFade delay={0.1}>
          <p>
            The device makes the promise tangible, but it only works if the workflow has mapped
            owners, approval rules, blocked states, and evidence. That is what the service installs.
          </p>
        </BlurFade>
      </div>

      <div class="surface-grid" role="list">
        {#each surfacePoints as point, index}
          <BlurFade delay={0.15 + index * 0.05}>
            <article class="surface-card" role="listitem">
              <span>{point.label}</span>
              <h3>{point.title}</h3>
              <p>{point.detail}</p>
            </article>
          </BlurFade>
        {/each}
      </div>
    </div>
  </div>
</section>

<section class="artifact-section">
  <div class="shell-inner-pad services-shell">
    <BlurFade>
      <ArtifactSystemStrip
        title="What ships with every governed engagement"
        description="Every governed engagement ships as artifacts your team can inspect, run, inherit, and operate."
      />
    </BlurFade>
  </div>
</section>

<section class="mapping-section">
  <div class="shell-inner-pad services-shell">
    <BlurFade>
      <MappingSessionBrief
        eyebrow="First call"
        title="The mapping session is where the buyer stops guessing."
        description="We turn the messy workflow into an inspectable plan: what connects, what runs, what pauses, what stops, and what artifact proves the first build."
      />
    </BlurFade>
  </div>
</section>

<section class="faq-section">
  <div class="shell-inner-pad services-shell">
    <div class="section-lead section-lead--center">
      <BlurFade>
        <span class="product-kicker">Questions</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>What buyers usually need clarified before the first call.</h2>
      </BlurFade>
    </div>

    <div class="faq-grid">
      {#each faqItems as faq, index}
        <BlurFade delay={0.1 + index * 0.04}>
          <article class="product-surface product-surface--soft faq-card">
            <h3>{faq.question}</h3>
            <p>{faq.answer}</p>
          </article>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="cta-section">
  <div class="shell-inner-pad services-shell">
    <div class="product-surface product-surface--accent cta-panel">
      <BlurFade>
        <span class="product-kicker">Map the workflow</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Map the workflow that's creating the most drag.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          We will define the handoffs, approvals, failure modes, and escalation path before any
          implementation work starts.
        </p>
      </BlurFade>
      <BlurFade delay={0.15}>
        <div class="hero-actions hero-actions--center">
          <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
          <Button href="/products" variant="secondary">See Proof Surfaces</Button>
        </div>
      </BlurFade>
    </div>
  </div>
</section>

<style>
  :global(.shell-inner-pad),
  .services-shell {
    box-sizing: border-box;
  }

  .services-shell {
    max-width: min(var(--content-width-xl, 80rem), 100vw);
  }

  .hero-page,
  .boundary-section,
  .trust-section,
  .offer-section,
  .flow-section,
  .surface-section,
  .artifact-section,
  .mapping-section,
  .faq-section,
  .cta-section {
    padding-top: clamp(1.25rem, 3vw, 2rem);
    padding-bottom: clamp(3.5rem, 6vw, 5rem);
  }

  .hero-page {
    padding-top: var(--agency-hero-padding-top);
    padding-bottom: var(--agency-hero-padding-bottom);
  }

  .hero-layout,
  .flow-layout {
    display: grid;
    gap: clamp(1.5rem, 3vw, 2.5rem);
    align-items: center;
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.72fr);
  }

  .hero-copy {
    display: grid;
    gap: 1.1rem;
    max-width: 38rem;
  }

  .hero-title {
    margin: 0;
    font-size: clamp(3rem, 3.2vw + 1rem, 4.35rem);
    line-height: 1;
    letter-spacing: -0.04em;
    text-wrap: balance;
  }

  .hero-detail,
  .section-lead p,
  .faq-card p,
  .cta-panel p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.72;
    text-wrap: pretty;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
    align-items: center;
  }

  .hero-actions--center {
    justify-content: center;
  }

  .hero-brief {
    display: grid;
    gap: 1.15rem;
    justify-self: end;
    width: min(100%, 25rem);
    padding: clamp(1rem, 2.4vw, 1.35rem);
  }

  .hero-brief h2 {
    margin: 0;
    max-width: 18rem;
    color: var(--color-fg-primary);
    font-size: clamp(1.35rem, 1.6vw, 1.8rem);
    line-height: 1.08;
    text-wrap: balance;
  }

  .hero-brief__grid {
    display: grid;
    gap: 0.75rem;
  }

  .hero-brief__item {
    display: grid;
    gap: 0.35rem;
    padding: 0.85rem 0.9rem;
    border-radius: 1rem;
    border: 1px solid color-mix(in srgb, var(--color-shell-border-default) 82%, transparent);
    background: color-mix(in srgb, var(--color-shell-surface-secondary) 72%, transparent);
  }

  .hero-brief__item span,
  .surface-card span {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .hero-brief__item strong {
    color: var(--color-fg-primary);
    font-size: 1.05rem;
    line-height: 1.2;
  }

  .hero-brief__item p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: 0.9rem;
    line-height: 1.55;
  }

  .hero-note {
    margin: 0;
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .boundary-panel,
  .trust-panel,
  .surface-panel,
  .cta-panel {
    display: grid;
    gap: 1rem;
    padding: clamp(1.1rem, 3vw, 1.7rem);
  }

  .section-lead {
    display: grid;
    gap: 0.85rem;
    max-width: 44rem;
  }

  .section-lead--center {
    margin-left: auto;
    margin-right: auto;
    text-align: center;
  }

  .section-lead h2,
  .cta-panel h2 {
    margin: 0;
    line-height: 1.02;
    text-wrap: balance;
  }

  .boundary-list {
    max-width: 46rem;
  }

  .trust-panel {
    gap: clamp(1.1rem, 3vw, 1.7rem);
  }

  .trust-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .trust-item {
    display: grid;
    gap: 0.5rem;
    padding-top: 0.85rem;
    border-top: 1px solid color-mix(in srgb, var(--color-shell-border-default) 84%, transparent);
  }

  .trust-item span {
    color: var(--color-fg-primary);
    font-size: 1rem;
    font-weight: var(--font-semibold);
    line-height: 1.25;
  }

  .trust-item p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: 0.94rem;
    line-height: 1.64;
    text-wrap: pretty;
  }

  .offer-grid,
  .faq-grid {
    display: grid;
    gap: clamp(1.1rem, 2.4vw, 1.6rem);
  }

  .offer-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .offer-card,
  .faq-card {
    display: grid;
    gap: 0.9rem;
    padding: 1.15rem;
  }

  .offer-tag {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.74rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .offer-card h3,
  .faq-card h3 {
    margin: 0;
    font-size: 1.2rem;
    line-height: 1.18;
  }

  .offer-card p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.68;
  }

  .offer-card.offerFeatured {
    border-color: var(--color-brand-primary-border);
    box-shadow:
      0 18px 38px rgba(0, 0, 0, 0.42),
      0 0 0 1px rgba(49, 92, 255, 0.14),
      0 0 44px rgba(49, 92, 255, 0.12);
  }

  .faq-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .surface-panel {
    gap: clamp(1.15rem, 3vw, 1.8rem);
  }

  .surface-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .surface-card {
    display: grid;
    gap: 0.65rem;
    padding: 1rem;
    border-radius: 1.1rem;
    border: 1px solid color-mix(in srgb, var(--color-shell-border-default) 84%, transparent);
    background: color-mix(in srgb, var(--color-shell-surface-secondary) 74%, transparent);
  }

  .surface-card h3 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: 1.05rem;
    line-height: 1.2;
  }

  .surface-card p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: 0.94rem;
    line-height: 1.65;
  }

  .cta-panel {
    text-align: center;
  }

  @media (max-width: 1080px) {
    .hero-layout,
    .flow-layout {
      grid-template-columns: 1fr;
    }

    .hero-copy,
    .section-lead {
      max-width: none;
    }

    .hero-brief {
      justify-self: stretch;
      width: 100%;
    }
  }

  @media (max-width: 768px) {
    .hero-page {
      padding-top: var(--agency-hero-padding-top-mobile);
      padding-bottom: var(--agency-hero-padding-bottom-mobile);
    }

    .offer-grid,
    .faq-grid,
    .trust-grid,
    .surface-grid {
      grid-template-columns: 1fr;
    }

    .hero-title {
      font-size: clamp(2.65rem, 10vw, 3.75rem);
    }

    .offer-card,
    .faq-card,
    .boundary-panel,
    .trust-panel,
    .surface-panel,
    .cta-panel {
      padding: 1rem;
    }
  }

  @media (max-width: 520px) {
    .hero-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .hero-actions :global(.btn) {
      box-sizing: border-box;
      width: 100%;
    }
  }
</style>
