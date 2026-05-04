<script lang="ts">
  import { Button, SEO } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';
  import ArtifactSystemStrip from '$lib/components/ArtifactSystemStrip.svelte';
  import ExecutionWorkbench from '$lib/components/ExecutionWorkbench.svelte';
  import GovernedExecutionFlow from '$lib/components/GovernedExecutionFlow.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const deliveryVector = {
    canonicalPhrase: 'Skills on MCP',
    clientFacingLabel: 'Skills + MCP',
    technicalLabel: 'MCP + Skills'
  };

  const services = [
    {
      name: 'MCP-only',
      description:
        'A narrow discovery or compliance wedge when the client needs trusted connectivity before the operating layer.',
      type: 'Entry wedge',
      price: 'Free or scoped',
      priceDescription: 'Bounded setup; no standing support'
    },
    {
      name: 'Workflow Infrastructure',
      description:
        'A single workflow rebuilt with clear rules, clean handoffs, and production-safe behavior.',
      type: 'Implementation Sprint',
      price: '$25K-$75K',
      priceDescription: 'Fixed-scope build after mapping'
    },
    {
      name: 'Policy OS',
      description:
        'Approvals, policy artifacts, release checks, blocked states, and incident loops for workflows already in motion.',
      type: 'Governed Execution Retainer',
      price: '$12.5K-$30K/mo',
      priceDescription: 'Trial/Core retainer'
    },
    {
      name: 'Enterprise Extension',
      description:
        'Audit-ready orchestration for regulated, high-volume, or multi-system workflows that need deterministic recovery.',
      type: 'Project + Managed',
      price: '$30K+/mo',
      priceDescription: 'Expansion retainer'
    }
  ];

  const offerCards = [
    {
      tag: 'Entry wedge',
      title: 'MCP-only',
      price: 'Free or scoped setup',
      cadence: 'Bounded access, explicit graduation trigger',
      summary: 'Use this when the connection is the job and your team will operate the workflow directly.',
      points: [
        'Connectivity validation',
        'Scoped host setup',
        'Read-only or constrained rollout'
      ]
    },
    {
      tag: 'Start here',
      title: 'Workflow Infrastructure',
      price: '$25K-$75K project',
      cadence: 'Mapping first; fixed scope before implementation',
      summary: 'Fix the first workflow your team still protects by hand and make the handoffs reliable.',
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
      price: '$12.5K-$30K/month',
      cadence: 'Trial starts at $12.5K; Core starts at $18K',
      summary: `The governed execution layer that makes ${deliveryVector.clientFacingLabel} safe to run faster in production.`,
      points: [
        'Approval and block boundaries',
        'Reason-coded access decisions',
        'Release checks and incident loops',
        'Evals tied to real workflow behavior',
        'Operator-load budget and priced expansion triggers'
      ]
    },
    {
      tag: 'High-stakes scale',
      title: 'Enterprise Extension',
      price: '$30K+/month',
      cadence: 'Multiple workflows, custom UI, or high-touch governance',
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
    'Your team gets visibility through runbooks, approvals, release evidence, and working software.'
  ];

  const faqItems = [
    {
      question: 'What is your primary service?',
      answer:
        'Workflow Infrastructure fixes the first painful workflow. Policy OS becomes the core engagement once speed needs approvals, release controls, and ongoing oversight. Enterprise Extension covers the highest-stakes environments.'
    },
    {
      question: 'Are you joining our team or running internal ops?',
      answer:
        'No. I operate as an external specialist. You get scoped delivery, artifact-backed visibility, approval points, and a clean handoff instead of open-ended staff augmentation.'
    },
    {
      question: 'Do you build full business systems and run onboarding?',
      answer:
        'When full system development and team onboarding are the primary need, I provide a direct referral path to Half Dozen. .agency is optimized for workflow infrastructure and governed execution, not ongoing admin coverage.'
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
      question: 'What should we budget for Policy OS?',
      answer:
        'Policy OS Trial is $12.5K-$15K/month for one governed workflow. Policy OS Core is $18K-$30K/month, with $22K/month as the default planning anchor when recurring governance, review, and tuning are owned by CREATE SOMETHING.'
    },
    {
      question: 'Do you still offer MCP-only?',
      answer:
        'Yes. MCP-only still works for discovery, compliance-constrained pilots, or teams that need the connection before the operating layer.'
    },
    {
      question: 'Do clients own the implementation?',
      answer:
        'Yes. Clients retain ownership of code, workflows, and operating documentation. The delivery is meant to stay portable after launch.'
    },
    {
      question: 'Why the phrase Skills + MCP?',
      answer: `Client-facing delivery is ${deliveryVector.clientFacingLabel}. MCP handles trust and connectivity. Skills carry behavior and workflow intent.`
    }
  ];
</script>

<SEO
  title="How I Work | Governed Workflow Infrastructure"
  description="CREATE SOMETHING .agency offers scoped specialist engagements that fix one workflow first, then add governed execution as operational risk rises."
  keywords="workflow infrastructure, production automation, technical operators, agent reliability, enterprise automation architecture, custom mcp"
  ogImage="/og-image.svg"
  propertyName="agency"
  {services}
  {faqItems}
/>

<section class="hero-page">
  <div class="shell-inner-pad hero-layout">
    <div class="hero-copy">
      <BlurFade delay={0}>
        <span class="product-kicker">How I Work</span>
      </BlurFade>

      <BlurFade delay={0.05}>
        <h1 class="hero-title">Start with the workflow creating the most drag.</h1>
      </BlurFade>

      <BlurFade delay={0.1}>
        <p class="hero-detail">
          This is a specialist engagement: scoped, artifact-backed, and designed to give your team
          a safer operating path, not another person to manage. Fix the first workflow, add
          oversight when the risk rises, and extend only when several systems must stay in sync.
        </p>
      </BlurFade>

      <BlurFade delay={0.15}>
        <div class="hero-actions">
          <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
          <Button href="/products" variant="secondary">See What I've Built</Button>
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
        <p class="hero-note">External specialist. Scoped delivery. Production boundaries.</p>
      </BlurFade>
    </div>

    <BlurFade delay={0.2}>
      <ExecutionWorkbench
        eyebrow="Offer logic"
        title="What the engagement actually controls"
        description="The same workflow can move through different commercial shapes. The question is whether you need connectivity, implementation, or governed execution."
      />
    </BlurFade>
  </div>
</section>

<section class="boundary-section">
  <div class="shell-inner-pad">
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
            You are bringing in a specialist to diagnose, rebuild, and govern one critical
            operating path. The work is scoped, visible, and designed for your team to inherit.
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

<section class="offer-section">
  <div class="shell-inner-pad">
    <div class="section-lead section-lead--center">
      <BlurFade>
        <span class="product-kicker">Offer ladder</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>From connection wedge to governed execution.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          Start with the narrowest offer that proves value. Add Policy OS when the workflow starts
          touching revenue, compliance, or customer trust.
        </p>
      </BlurFade>
    </div>

    <div class="offer-grid">
      {#each offerCards as offer, index}
        <BlurFade delay={0.15 + index * 0.06}>
          <article class="product-surface offer-card" class:offerFeatured={offer.featured}>
            <span class="offer-tag">{offer.tag}</span>
            <h3>{offer.title}</h3>
            <div class="offer-commercial">
              <span>{offer.price}</span>
              <span>{offer.cadence}</span>
            </div>
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
  <div class="shell-inner-pad flow-layout">
    <div class="section-lead">
      <BlurFade>
        <span class="product-kicker">Governed execution</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Where Policy OS fits.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          Workflow Infrastructure gets the first handoff working. Policy OS decides what runs
          automatically, what needs review, and what stops. That is the point where speed stops
          being a demo and becomes an operating path.
        </p>
      </BlurFade>
    </div>

    <BlurFade delay={0.15}>
      <GovernedExecutionFlow
        title="Policy OS"
        description="Hub MCP routes the request, and Policy OS decides what can run automatically, what waits for approval, and what stops with a reason."
      />
    </BlurFade>
  </div>
</section>

<section class="artifact-section">
  <div class="shell-inner-pad">
    <BlurFade>
      <ArtifactSystemStrip
        title="What ships with every governed engagement"
        description="Every governed engagement ships as artifacts your team can inspect, run, inherit, and operate."
      />
    </BlurFade>
  </div>
</section>

<section class="faq-section">
  <div class="shell-inner-pad">
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
  <div class="shell-inner-pad">
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
          <Button href="/book">Book Mapping Session</Button>
          <Button href="/products" variant="secondary">See What I've Built</Button>
        </div>
      </BlurFade>
    </div>
  </div>
</section>

<style>
  .hero-page,
  .boundary-section,
  .offer-section,
  .flow-section,
  .artifact-section,
  .faq-section,
  .cta-section {
    padding-top: clamp(1.25rem, 3vw, 2rem);
    padding-bottom: clamp(3.5rem, 6vw, 5rem);
  }

  .hero-page {
    padding-top: clamp(6rem, 10vw, 8rem);
  }

  .hero-layout,
  .flow-layout {
    display: grid;
    gap: clamp(1.5rem, 3vw, 2.5rem);
    align-items: center;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  }

  .hero-copy {
    display: grid;
    gap: 1.1rem;
    max-width: 38rem;
  }

  .hero-title {
    margin: 0;
    font-size: clamp(3rem, 4vw + 1.2rem, 5.2rem);
    line-height: 0.98;
    letter-spacing: -0.045em;
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

  .hero-note {
    margin: 0;
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .boundary-panel,
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

  .offer-grid,
  .faq-grid {
    display: grid;
    gap: 1rem;
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

  .offer-commercial {
    display: grid;
    gap: 0.2rem;
    color: var(--color-fg-secondary);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    line-height: 1.45;
  }

  .offer-commercial span:first-child {
    color: var(--color-fg-primary);
    font-weight: 700;
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
  }

  @media (max-width: 768px) {
    .offer-grid,
    .faq-grid {
      grid-template-columns: 1fr;
    }

    .hero-title {
      font-size: clamp(2.6rem, 10vw, 4rem);
    }

    .offer-card,
    .faq-card,
    .boundary-panel,
    .cta-panel {
      padding: 1rem;
    }
  }
</style>
