<script lang="ts">
  import { Button, SEO } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';
  import ArtifactSystemStrip from '$lib/components/ArtifactSystemStrip.svelte';
  import GovernedExecutionFlow from '$lib/components/GovernedExecutionFlow.svelte';
  import MappingSessionBrief from '$lib/components/MappingSessionBrief.svelte';
  import ServiceWedgeBlueprint from '$lib/components/ServiceWedgeBlueprint.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const services = [
    {
      name: 'Workflow Readiness Map',
      description:
        'A paid diagnostic that turns one watched workflow into a clear build, defer, or stop decision.',
      type: 'Paid diagnostic',
      price: 'Custom',
      priceDescription: 'Map, risks, decision states, build recommendation'
    },
    {
      name: 'Governed Workflow Console',
      description:
        'A calm operating surface where AI, agents, data, tools, and approval paths become visible to the team.',
      type: 'Implementation Sprint',
      price: 'Custom',
      priceDescription: 'Scoped build'
    },
    {
      name: 'Agent Operator Layer',
      description:
        'Bounded AI assistance for drafting, matching, routing, summarizing, and preparing work for human approval.',
      type: 'Expansion sprint',
      price: 'Custom',
      priceDescription: 'Scoped agent/tool layer'
    },
    {
      name: 'Governance Review',
      description:
        'A low-touch review loop for live workflows: incidents, approval tuning, tool scopes, and edge cases.',
      type: 'Monthly review',
      price: 'Custom',
      priceDescription: 'Defined governance, not unlimited support'
    }
  ];

  const offerCards = [
    {
      tag: 'Paid front door',
      title: 'Workflow Readiness Map',
      summary: 'Use this when you know a workflow is expensive to watch but do not yet know what is safe to build.',
      points: [
        'Current workflow and handoff map',
        'Data and system boundary',
        'Decision states and risk register',
        'Build, defer, or stop recommendation'
      ]
    },
    {
      tag: 'Start here',
      title: 'Governed Workflow Console',
      summary: 'Fix the first AI-assisted workflow your team still watches by hand and make the handoffs visible, reviewable, and recoverable.',
      points: [
        'Retool-based workflow console',
        'MCP/tool and worker layer',
        'Approval queue and blocked states',
        'Portable runbooks and handoff artifacts'
      ],
      featured: true
    },
    {
      tag: 'Expansion',
      title: 'Agent Operator Layer',
      summary: 'Add bounded AI and agent capacity only after the workflow has a clear console surface and approval owner.',
      points: [
        'Drafting, summarizing, matching, or routing',
        'Scoped tools and action limits',
        'Approval-required actions routed through the console',
        'Audit summaries and failure handling'
      ]
    },
    {
      tag: 'Low-touch support',
      title: 'Governance Review',
      summary: 'A defined review loop for workflows that are live and producing operational edge cases.',
      points: [
        'Workflow health and incident review',
        'Approval-rule tuning',
        'Tool scope and connected-account review',
        'Small improvement queue'
      ]
    }
  ];

  const boundaryPoints = [
    'You bring the workflow, constraints, and approval owner.',
    'CREATE SOMETHING maps the rules, builds the console layer, and ships the operating artifacts.',
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
      label: 'Workflow console',
      title: 'Shows what needs judgment',
      detail:
        'The operating surface shows safe work, approval-needed work, blocked actions, artifacts, and recovery paths before someone has to ask for a status meeting.'
    },
    {
      label: 'Agent layer',
      title: 'Prepares work, not unchecked decisions',
      detail:
        'Agents draft, explain, match, flag missing information, and prepare next steps inside scoped tools and approval boundaries.'
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
        'Governed Workflow Console is the core build. Workflow Readiness Map is the paid front door, Agent Operator Layer is the expansion, and Governance Review is the low-touch support loop after the workflow is live.'
    },
    {
      question: 'Are you joining our team or running internal ops?',
      answer:
        'No. I operate as a solo specialist using CREATE SOMETHING as the delivery toolchain. You get scoped delivery, governed agent capacity, artifact-backed visibility, approval points, and a clean handoff instead of open-ended staffing.'
    },
    {
      question: 'Where do AI and agents fit?',
      answer:
        'They fit after the workflow has a clear job for them, scoped tools, approval boundaries, and evidence. AI and agents can recommend, draft, summarize, match, and route. Humans approve important actions.'
    },
    {
      question: 'Do you build full business systems and run onboarding?',
      answer:
        'When full system development and team onboarding are the primary need, I provide a direct referral path to Half Dozen. .agency is optimized for workflow systems and governed execution, not ongoing admin coverage.'
    },
    {
      question: 'What does .agency own?',
      answer:
        '.agency owns the workflow map, console design, rules, approvals, handoffs, tool boundaries, and operating artifacts around the workflow. Your team keeps business context, approval ownership, and long-term control.'
    },
    {
      question: 'When should we add Governance Review?',
      answer:
        'Add it after the first workflow console is live and real usage starts creating incidents, edge cases, approval-rule changes, or new workflow candidates.'
    },
    {
      question: 'Do you still build MCPs?',
      answer:
        'Yes. MCPs are part of the tool/data layer when agents or workflow consoles need governed access to business systems. They are not the main buyer-facing offer.'
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
      question: 'Is the console the whole product?',
      answer:
        'No. The console is the visible surface. The paid service is the workflow mapping, tool boundaries, artifacts, rules, and escalation behavior that make the surface trustworthy.'
    }
  ];
</script>

<SEO
  title="How I Work | Governed Workflow Consoles"
  description="CREATE SOMETHING .agency builds approachable AI-assisted workflow systems: paid readiness maps, Retool-based workflow consoles, agent/tool boundaries, agent operator layers, and human approval paths."
  keywords="AI-assisted workflows, AI workflows, OpenAI agents, human-approved operations, governed workflow consoles, workflow readiness map, Retool workflow console, AI workflow approvals, MCP tool boundaries, agent operator layer"
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
        <h1 class="hero-title">Make one AI-assisted workflow safe to operate.</h1>
      </BlurFade>

      <BlurFade delay={0.1}>
        <p class="hero-detail">
          Bring the workflow your team still watches by hand. I map the data, boundaries, owners,
          and failure modes; build the operating surface; connect the AI and agent tool layer; and
          route AI recommendations through human approval before anything important moves.
        </p>
      </BlurFade>

      <BlurFade delay={0.15}>
        <div class="hero-actions">
          <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
          <Button href="#offer-ladder" variant="secondary">See Offer Ladder</Button>
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
        <p class="hero-note">AI helps. People approve. The workflow stays visible.</p>
      </BlurFade>
    </div>

    <BlurFade delay={0.2}>
      <aside class="product-surface product-surface--soft hero-brief" aria-label="Calm transparent workflow service brief">
        <span class="product-kicker">Calm, transparent delivery</span>
        <h2>CREATE SOMETHING turns AI, agents, tools, and approvals into one operating surface your team can understand.</h2>
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
            designed for your team to inherit without depending on open-ended access to me.
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
        <h2>From workflow map to governed console.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          Start with the diagnostic map. Build the first console. Add AI and agent capacity where
          the workflow has enough structure, ownership, and evidence to support it.
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
        <h2>Where governance fits.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          The console gets the first handoff visible and reliable. Governance decides what
          AI-assisted work can run automatically, what needs review, and what stops. That is where
          a useful demo becomes an operating path your team can trust.
        </p>
      </BlurFade>
    </div>

    <BlurFade delay={0.15}>
      <GovernedExecutionFlow
        title="Governed Workflow Console"
        description="The tool layer routes the request, and the console shows what AI-assisted work can run automatically, what waits for approval, and what stops with a reason."
      />
    </BlurFade>
  </div>
</section>

<section class="surface-section">
  <div class="shell-inner-pad services-shell">
    <div class="product-surface product-surface--soft surface-panel">
      <div class="section-lead">
        <BlurFade>
        <span class="product-kicker">Where proof surfaces fit</span>
        </BlurFade>
        <BlurFade delay={0.05}>
        <h2>Dashboards and displays are surfaces. The engagement is the operating layer behind them.</h2>
        </BlurFade>
        <BlurFade delay={0.1}>
          <p>
            A dashboard, Retool app, Webflow surface, or display only works if the workflow has
            mapped owners, approval rules, blocked states, and evidence. That is what lets AI help
            without becoming another thing your team has to supervise.
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
        title="The readiness map is where the buyer stops guessing."
        description="We turn the messy workflow into an inspectable plan: what connects, what runs, what pauses, what stops, and what console proves the first build."
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
        <h2>Map the workflow that should stop living in someone's head.</h2>
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
