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
      name: 'Trust Map',
      description:
        'A fixed first map of the workflow, object model, action boundary, approval path, and first safe delegation point.',
      type: 'Entry wedge',
      price: 'Custom',
      priceDescription: 'Scoped diagnostic'
    },
    {
      name: 'Workflow Pilot',
      description:
        'A single workflow rebuilt with clear rules, clean handoffs, and production-safe behavior.',
      type: 'Implementation Sprint',
      price: 'Custom',
      priceDescription: 'Scoped build'
    },
    {
      name: 'Trust Layer',
      description:
        'Scoped actions, approval states, release checks, blocked states, and incident loops for workflows already in motion.',
      type: 'Workflow Control Plan',
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
      tag: 'Fixed first step',
      title: 'Trust Map',
      summary: 'Use this when the first job is deciding what would be safe to delegate.',
      points: [
        'Business object map',
        'Action and approval boundary',
        'First safe delegation path'
      ]
    },
    {
      tag: 'Start here',
      title: 'Workflow Pilot',
      summary: 'Fix the first workflow your team still does by hand and make the handoffs reliable.',
      points: [
        'Business-rule mapping',
        'Workflow implementation',
        'Auth and access setup',
        'Portable runbooks and handoff notes'
      ],
      featured: true
    },
    {
      tag: 'Ongoing control',
      title: 'Trust Layer',
      summary: `The control layer that makes ${deliveryVector.clientFacingLabel} safe to run faster in production.`,
      points: [
        'Approval and block boundaries',
        'Reason-coded access decisions',
        'Operator surface and escalation path',
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
    {
      label: 'You bring',
      detail: 'The workflow, constraints, source accounts, and the person who owns approval.'
    },
    {
      label: 'I map and build',
      detail: 'The rules, control layer, safe delegation path, runbooks, and release evidence.'
    },
    {
      label: 'Your team keeps',
      detail: 'The context, approval ownership, operating receipts, code, and handoff notes.'
    }
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
      label: 'Control',
      value: '3 states',
      detail: 'Auto-allow, approval-needed, or blocked with reason.'
    },
    {
      label: 'Surface',
      value: 'Quiet brief',
      detail: 'The operator sees only what needs judgment.'
    }
  ];

  const fitSignals = [
    'One workflow crosses systems, teams, or permissions.',
    'Failures create rework, customer risk, compliance concern, or revenue drag.',
    'Someone owns approval, but they should not watch the workflow all day.'
  ];

  const poorFitSignals = [
    'The need is broad staff augmentation or ongoing internal admin coverage.',
    'No one can name the approval owner or failure mode yet.',
    'The goal is fake autonomy instead of controlled delegation.'
  ];

  const surfacePoints = [
    {
      label: 'Trust Layer',
      title: 'Decides what needs judgment',
      detail:
        'The operating layer classifies safe work, approval-needed work, and blocked actions before the operator is interrupted.'
    },
    {
      label: 'Surface',
      title: 'Makes the decision visible',
      detail:
        'Webflow, Dify, Linear, Notion, or a custom app can show the small amount of state the operator needs.'
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
        'Workflow Pilot fixes the first painful workflow. Trust Layer becomes the ongoing plan once speed needs approvals, release controls, and oversight. Enterprise Extension covers the highest-stakes environments.'
    },
    {
      question: 'Are you joining our team or running internal ops?',
      answer:
        'No. I operate as a solo specialist using CREATE SOMETHING as the delivery toolchain. You get scoped delivery, controlled agent capacity, evidence-backed visibility, approval points, and a clean handoff instead of open-ended staffing.'
    },
    {
      question: 'Are agents part of the workforce?',
      answer:
        'They can be, when the workflow gives them a clear job, scoped tools, approval boundaries, and evidence. MCPs are the toolkits; the trust layer decides what agents can do, what needs a person, and what must stop.'
    },
    {
      question: 'Do you build full business systems and run onboarding?',
      answer:
        'When full system development and team onboarding are the primary need, I provide a direct referral path to Half Dozen. .agency is optimized for workflow systems and controlled delegation, not ongoing admin coverage.'
    },
    {
      question: 'What does .agency own?',
      answer:
        '.agency owns the rules, approvals, handoffs, release controls, and operating receipts around the workflow. Your team keeps business context, approval ownership, and long-term control.'
    },
    {
      question: 'When should we add the Trust Layer?',
      answer:
        'Add it when failures become expensive or the workflow touches revenue, customer trust, compliance, or several systems that must stay in sync.'
    },
    {
      question: 'Do you still offer MCP Wedge?',
      answer:
        'Yes. A narrow MCP wedge still works for discovery, compliance-constrained pilots, or teams that need the connection before the operating layer.'
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
      question: 'Is the dashboard the product?',
      answer:
        'No. The visible surface is where the operator sees state. The paid service is the workflow map, action boundary, evidence, and escalation behavior that make the surface trustworthy.'
    },
    {
      question: 'Why the phrase Skills + MCP?',
      answer: `Client-facing delivery is ${deliveryVector.clientFacingLabel}. MCP handles trust and connectivity. Skills carry behavior and workflow intent.`
    }
  ];
</script>

<SEO
  title="Workflow Trust Layer | CREATE SOMETHING .agency"
  description="How CREATE SOMETHING makes one workflow safe to delegate: clear stack boundaries, decision states, evidence, and escalation when judgment is required."
  keywords="workflow trust layer, safe to delegate AI workflow, workflow pilot, MCP wedge, production automation, agent reliability"
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
        <h1 class="hero-title">Start with one workflow.</h1>
      </BlurFade>

      <BlurFade delay={0.1}>
        <p class="hero-detail">
          Bring the operating path your team cannot keep covering by hand. I map the inputs,
          owners, approvals, and failure modes; rebuild the handoff; and add controlled agent
          capacity until the operator only hears from the system when judgment changes the outcome.
        </p>
      </BlurFade>

      <BlurFade delay={0.15}>
        <div class="hero-actions">
          <Button href={agencyCoreMessaging.servicesMappingSessionHref}>{agencyCoreMessaging.bookMappingSessionLabel}</Button>
          <Button href="#service-path" variant="secondary">See Service Path</Button>
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
        <p class="hero-note">One workflow. Scoped actions. Evidence attached.</p>
      </BlurFade>
    </div>

    <BlurFade delay={0.2}>
      <aside class="product-surface product-surface--soft hero-brief" aria-label="Calm transparent workflow service brief">
        <span class="product-kicker hero-brief__kicker">
          <span class="hero-brief__kicker-desktop">Calm, transparent delivery</span>
          <span class="hero-brief__kicker-mobile">Calm Delivery</span>
        </span>
        <h2>CREATE SOMETHING turns the workflow into an inspectable control layer.</h2>
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
          <span class="product-kicker">Fit check</span>
        </BlurFade>
        <BlurFade delay={0.05}>
          <h2>Bring one workflow with an owner, risk, and repeatable drag.</h2>
        </BlurFade>
        <BlurFade delay={0.1}>
          <p>
            The work is strongest when the problem is concrete enough to map but important enough
            that a brittle handoff is already costing attention. It is not broad admin coverage or
            a vague automation wishlist.
          </p>
        </BlurFade>
      </div>

      <div class="fit-grid" role="list" aria-label="Workflow fit signals">
        <div class="fit-column" role="listitem">
          <h3>Good fit</h3>
          <ul class="product-list">
            {#each fitSignals as point}
              <li>{point}</li>
            {/each}
          </ul>
        </div>

        <div class="fit-column" role="listitem">
          <h3>Not the right fit</h3>
          <ul class="product-list">
            {#each poorFitSignals as point}
              <li>{point}</li>
            {/each}
          </ul>
        </div>
      </div>

      <div class="handoff-grid" role="list" aria-label="Workflow ownership handoff">
        {#each boundaryPoints as point}
          <article class="handoff-item" role="listitem">
            <span>{point.label}</span>
            <p>{point.detail}</p>
          </article>
        {/each}
      </div>
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
            Your team sees enough to trust and inherit the system. Sensitive credentials,
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

<section class="offer-section" id="service-path">
  <div class="shell-inner-pad services-shell">
    <div class="section-lead section-lead--center">
      <BlurFade>
        <span class="product-kicker">Service path</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Start with the smallest safe delegation point.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          Map what would be safe to delegate, prove the first workflow, then add the trust layer
          when the work starts touching revenue, compliance, or customer trust.
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
        <span class="product-kicker">Trust layer</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Where the trust layer fits.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          Workflow Pilot gets the first handoff working. The trust layer decides what runs
          automatically, what needs review, and what stops. That is the point where speed stops
          being a demo and becomes an operating path.
        </p>
      </BlurFade>
    </div>

    <BlurFade delay={0.15}>
      <GovernedExecutionFlow
        eyebrow="Trust Layer"
        title="Controlled delegation"
        description="Hub MCP routes the request, and the trust layer decides what can run automatically, what waits for approval, and what stops with a reason."
      />
    </BlurFade>
  </div>
</section>

<section class="surface-section">
  <div class="shell-inner-pad services-shell">
    <div class="product-surface product-surface--soft surface-panel">
      <div class="section-lead">
        <BlurFade>
          <span class="product-kicker">Operator surfaces</span>
        </BlurFade>
        <BlurFade delay={0.05}>
          <h2>The visible surface is downstream of the trust layer.</h2>
        </BlurFade>
        <BlurFade delay={0.1}>
          <p>
            Dashboards, Dify apps, Notion views, Linear evidence, and optional quiet displays only
            work when the workflow has mapped owners, approval rules, blocked states, and evidence.
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
        title="What your team keeps after the build"
        description="Every trust-layer project ships with maps, runbooks, and evidence your team can inspect, run, inherit, and operate."
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
        description="We turn the messy workflow into an inspectable plan: what connects, what runs, what pauses, what stops, and what evidence proves the first build."
        ctaHref={agencyCoreMessaging.servicesMappingSessionHref}
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
          <Button href={agencyCoreMessaging.servicesMappingSessionHref}>{agencyCoreMessaging.bookMappingSessionLabel}</Button>
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

  .boundary-section,
  .trust-section,
  .offer-section,
  .flow-section,
  .surface-section,
  .artifact-section,
  .mapping-section,
  .faq-section,
  .cta-section {
    scroll-margin-top: 6.5rem;
  }

  .hero-page {
    padding-top: clamp(4.5rem, 7vw, 6rem);
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

  .hero-brief__kicker-mobile {
    display: none;
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
    margin-bottom: clamp(1.5rem, 3vw, 2.25rem);
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

  .fit-grid,
  .handoff-grid {
    display: grid;
    gap: 1rem;
  }

  .fit-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .fit-column {
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 1rem;
    border: 1px solid color-mix(in srgb, var(--color-shell-border-default) 82%, transparent);
    background: color-mix(in srgb, var(--color-shell-surface-secondary) 70%, transparent);
  }

  .fit-column h3 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: 1rem;
    line-height: 1.2;
  }

  .handoff-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .handoff-item {
    display: grid;
    gap: 0.45rem;
    padding-top: 0.85rem;
    border-top: 1px solid color-mix(in srgb, var(--color-shell-border-default) 84%, transparent);
  }

  .handoff-item span {
    color: var(--color-fg-primary);
    font-weight: var(--font-semibold);
    line-height: 1.25;
  }

  .handoff-item p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: 0.94rem;
    line-height: 1.62;
    text-wrap: pretty;
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
    .hero-brief__kicker {
      max-width: 100%;
      letter-spacing: 0.08em;
      line-height: 1.15;
      white-space: nowrap;
    }

    .hero-brief__kicker-desktop {
      display: none;
    }

    .hero-brief__kicker-mobile {
      display: inline;
    }

    .fit-grid,
    .handoff-grid,
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
