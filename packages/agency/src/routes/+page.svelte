<script lang="ts">
  import { Button, HeroSignalField, SEO } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';
  import ArtifactSystemStrip from '$lib/components/ArtifactSystemStrip.svelte';
  import BrandLogo from '$lib/components/BrandLogo.svelte';
  import ExecutionWorkbench from '$lib/components/ExecutionWorkbench.svelte';
  import HubMcpFlow from '$lib/components/HubMcpFlow.svelte';
  import InkOperatorSurface from '$lib/components/InkOperatorSurface.svelte';
  import MappingSessionBrief from '$lib/components/MappingSessionBrief.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const services = [
    {
      name: 'Workflow System',
      description:
        'One painful workflow turned into a reliable operating path with clear rules, clean handoffs, and ownership.',
      type: 'Implementation Sprint',
      price: 'Custom',
      priceDescription: 'Scoped build with optional ongoing support'
    },
    {
      name: 'Policy OS',
      description:
        'The oversight layer: policy artifacts, approvals, blocked states, release checks, and incident loops once the workflow touches revenue, trust, or compliance.',
      type: 'Governed Execution Retainer',
      price: 'Custom',
      priceDescription: 'Monthly governed execution layer'
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

  const proofMetrics = [
    { value: '1', label: 'workflow fixed first' },
    { value: '3', label: 'decision states' },
    { value: '4', label: 'delivery layers' },
    { value: '100%', label: 'artifact-backed delivery' }
  ];

  const operatingSignals = [
    'Model Context Protocol',
    'Cloudflare Workers',
    'Composio',
    'Dify',
    'Notion',
    'OpenAI',
    'Webflow',
    'Linear',
    'TRMNL'
  ];

  const deliveryArtifacts = [
    {
      displayName: 'Workflow map',
      name: 'workflow-map',
      summary: 'The first path, handoffs, source systems, owners, and known failure points.',
      tag: 'Map'
    },
    {
      displayName: 'Stack boundary',
      name: 'stack-boundary',
      summary: 'What the client owns, what CREATE SOMETHING owns, and what vendors provide.',
      tag: 'Boundary'
    },
    {
      displayName: 'MCP/API contract',
      name: 'mcp-api-contract',
      summary: 'Tools, resources, auth scope, allowed actions, and integration limits.',
      tag: 'Contract'
    },
    {
      displayName: 'Policy rules',
      name: 'policy-rules',
      summary: 'Auto-allowed, approval-needed, and blocked states with reasons.',
      tag: 'Govern'
    },
    {
      displayName: 'Runbook',
      name: 'runbook',
      summary: 'Recovery path, release notes, rollback steps, and operator handoff.',
      tag: 'Operate'
    },
    {
      displayName: 'Operator brief',
      name: 'operator-brief',
      summary: 'What the buyer sees in Webflow, Linear, TRMNL, Dify, or a custom surface.',
      tag: 'Surface'
    }
  ];

  const capabilityCards = [
    {
      id: '01',
      title: 'Governed actions',
      body: 'Decide which actions can run automatically, which need a person in the loop, and which must stop.',
      points: [
        'Reason-coded approvals instead of hidden heuristics',
        'Policy packs attached to the workflow, not buried in chat history',
        'Blocked states your team can actually understand'
      ]
    },
    {
      id: '02',
      title: 'Portable delivery',
      body: 'The client keeps the code, workflow documentation, and operating artifacts after launch.',
      points: [
        'Runbooks, contracts, and release evidence ship with the build',
        'No proprietary black box required to keep the workflow alive',
        'The implementation stays legible after the kickoff call'
      ]
    },
    {
      id: '03',
      title: 'Recovery by design',
      body: 'A workflow is not production-ready until it can fail cleanly, escalate cleanly, and recover cleanly.',
      points: [
        'Rollback notes and operator handoffs are part of the package',
        'Failures become incidents with owners, not mystery states',
        'Edge cases get routed before they become cleanup'
      ]
    },
    {
      id: '04',
      title: 'Commodity plumbing, custom judgment',
      body: 'Commodity connectivity should stay commodity. The value is in workflow design, policy, and delivery.',
      points: [
        'Use the best available connector layer where it saves time',
        'Wrap it in CREATE SOMETHING trust boundaries and artifacts',
        'Customize only where the workflow actually becomes strategic'
      ]
    }
  ];

  const offerCards = [
    {
      name: 'MCP Wedge',
      featured: false,
      summary:
        'A narrow connection proof when the buyer needs to see the first safe tool boundary.',
      points: [
        'Connector and account boundary',
        'Read/write scope definition',
        'First MCP/API contract',
        'Replaceability notes'
      ]
    },
    {
      name: 'Workflow System',
      featured: true,
      summary:
        'The first reliable operating path. Fix one workflow your team still does by hand.',
      points: [
        'Business-rule mapping',
        'Workflow implementation',
        'Auth and access setup',
        'Runbook and handoff artifacts'
      ]
    },
    {
      name: 'Policy OS',
      featured: false,
      summary:
        'The governed execution layer once speed touches revenue, trust, or compliance.',
      points: [
        'Approval and block boundaries',
        'Release checks and eval gates',
        'Incident and review loops',
        'Monthly tuning against real usage'
      ]
    }
  ];

  const governancePoints = [
    'Safe actions run automatically when the workflow is healthy.',
    'Risky actions pause for review before they turn into cleanup.',
    'Disallowed actions stop with a reason, an owner, and an artifact trail.'
  ];
</script>

<SEO
  title="Calm AI Workflow Systems | CREATE SOMETHING .agency"
  description="CREATE SOMETHING .agency builds calm AI workflow systems for operators: one workflow, clear vendor boundaries, portable artifacts, and governed escalation."
  keywords="calm transparent reliable AI workflow systems, Policy OS, MCP wedge, transparent AI stack, workflow system, production automation, technical operators"
  ogImage="/og-image.svg"
  propertyName="agency"
  {services}
/>

<section class="hero-page">
  <div class="hero-stage">
    <HeroSignalField variant="agency" focus="right" />

    <div class="shell-inner-pad hero-layout">
      <div class="hero-copy">
        <BlurFade delay={0}>
          <span class="product-kicker hero-kicker">
            <span class="hero-kicker__desktop">{agencyCoreMessaging.categoryLabel}</span>
            <span class="hero-kicker__mobile">Reliable AI Workflow Systems</span>
          </span>
        </BlurFade>

        <BlurFade delay={0.05}>
          <h1 class="hero-title">Make the workflow safe enough to trust.</h1>
        </BlurFade>

        <BlurFade delay={0.1}>
          <p class="hero-detail">
            For the operator who has to answer for what happens next. CREATE SOMETHING fixes the
            workflow creating the most drag, then adds approvals, visibility, and recovery paths as
            the stakes rise.
          </p>
        </BlurFade>

        <BlurFade delay={0.15}>
          <div class="hero-actions">
            <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
            <Button href="/services" variant="secondary">See The Operating Model</Button>
          </div>
        </BlurFade>

        <BlurFade delay={0.2}>
          <p class="hero-note">Scoped delivery. Clear controls. Portable artifacts.</p>
        </BlurFade>
      </div>
    </div>
  </div>

  <div class="shell-inner-pad">
    <div class="metric-grid">
      {#each proofMetrics as metric, index}
        <BlurFade delay={0.25 + index * 0.05}>
          <article class="product-surface product-surface--soft metric-card">
            <span class="metric-value">{metric.value}</span>
            <span class="metric-label">{metric.label}</span>
          </article>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="signal-section">
  <div class="shell-inner-pad">
    <div class="product-surface product-surface--soft signal-shell">
      <div class="signal-header">
        <span class="product-kicker">Calm, transparent stack</span>
        <p>
          Vendor names are not the product. They make the stack easier to explain, while CREATE
          SOMETHING owns the specialized workflow: the map, policy layer, delivery artifacts, and
          operator handoff. When agents join the workflow, MCPs define their toolkits and Policy OS
          keeps the work governable.
        </p>
      </div>

      <div class="signal-strip">
        {#each operatingSignals as signal}
          <div class="signal-pill">
            <BrandLogo name={signal} size={16} className="signal-pill__icon" />
            <span>{signal}</span>
          </div>
        {/each}
      </div>

      <div class="signal-actions">
        <a class="stack-link" href="/stack">Review stack boundaries</a>
        <a class="stack-link" href="/partners">Review partner stack</a>
      </div>
    </div>
  </div>
</section>

<section id="ink" class="ink-section">
  <div class="shell-inner-pad">
    <BlurFade>
      <InkOperatorSurface />
    </BlurFade>
  </div>
</section>

<section class="control-section">
  <div class="shell-inner-pad showcase-stack">
    <div class="section-lead">
      <BlurFade>
        <span class="product-kicker control-kicker">
          <span class="control-kicker__desktop">Inspect the full control room</span>
          <span class="control-kicker__mobile">Full Control Room</span>
        </span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>The detailed decision surface belongs below the fold.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          Once the hero establishes the workflow boundaries, the full surface can show tabs,
          checks, artifacts, and release logic without crushing the copy.
        </p>
      </BlurFade>
    </div>

    <BlurFade delay={0.15}>
      <ExecutionWorkbench />
    </BlurFade>
  </div>
</section>

<section id="how" class="capability-section">
  <div class="shell-inner-pad">
    <div class="section-lead">
      <BlurFade>
        <span class="product-kicker">Why teams buy this</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Connecting tools is easy. Trust is the product.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          The buyer does not need every implementation detail, but they do need to know how the
          system works, where data moves, and who owns the handoff when the workflow matters.
        </p>
      </BlurFade>
    </div>

    <div class="capability-grid">
      {#each capabilityCards as card, index}
        <BlurFade delay={0.15 + index * 0.05}>
          <article class="product-surface capability-card">
            <span class="capability-id">{card.id}</span>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
            <ul class="product-list">
              {#each card.points as point}
                <li>{point}</li>
              {/each}
            </ul>
          </article>
        </BlurFade>
      {/each}
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
        <h2>Start with one operating path. Add governance when risk rises.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          The ladder is buyer-readable: prove the wedge, turn it into one operating workflow, then
          add Policy OS when the workflow touches money, trust, or compliance.
        </p>
      </BlurFade>
    </div>

    <div class="offer-grid">
      {#each offerCards as offer, index}
        <BlurFade delay={0.15 + index * 0.08}>
          <article
            class="product-surface offer-card"
            class:offerFeatured={offer.featured}
          >
            <span class="offer-tag">{offer.featured ? 'Primary build' : 'Entry or expansion'}</span>
            <h3>{offer.name}</h3>
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

<section class="governance-section">
  <div class="shell-inner-pad governance-grid">
    <div class="governance-copy">
      <BlurFade>
        <span class="product-kicker">Policy before speed</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>The control layer is the difference between a demo and an operating path.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          CREATE SOMETHING can use best-of-breed plumbing under the hood, but the thing clients are
          actually buying is the judgment layer around the workflow: approvals, blocked states,
          auditability, and recovery.
        </p>
      </BlurFade>
      <BlurFade delay={0.15}>
        <ul class="product-list governance-points">
          {#each governancePoints as point}
            <li>{point}</li>
          {/each}
        </ul>
      </BlurFade>
    </div>

    <BlurFade delay={0.2}>
      <HubMcpFlow />
    </BlurFade>
  </div>
</section>

<section class="artifact-section">
  <div class="shell-inner-pad">
    <BlurFade>
      <ArtifactSystemStrip
        eyebrow="What you get"
        title="The deliverables make the work explainable."
        description="The offer is not a pile of vendor accounts. It is a set of artifacts your team can inspect, inherit, and use to explain how the system works."
        items={deliveryArtifacts}
      />
    </BlurFade>
  </div>
</section>

<section class="mapping-section">
  <div class="shell-inner-pad">
    <BlurFade>
      <MappingSessionBrief />
    </BlurFade>
  </div>
</section>

<section class="cta-section">
  <div class="shell-inner-pad">
    <div class="product-surface product-surface--accent cta-panel">
      <BlurFade>
        <span class="product-kicker">Start with one workflow</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>{agencyCoreMessaging.workflowCtaHeading}</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>{agencyCoreMessaging.workflowCtaDetail}</p>
      </BlurFade>
      <BlurFade delay={0.15}>
        <div class="hero-actions hero-actions--center">
          <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
          <Button href="/services" variant="secondary">See The Operating Model</Button>
        </div>
      </BlurFade>
    </div>
  </div>
</section>

<style>
  .hero-page {
    padding-top: clamp(6rem, 10vw, 8rem);
    padding-bottom: clamp(2.5rem, 6vw, 4rem);
  }

  .hero-stage {
    position: relative;
    min-height: clamp(34rem, 58vw, 43rem);
    overflow: clip;
    isolation: isolate;
  }

  .hero-stage::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background:
      linear-gradient(
        180deg,
        rgba(3, 3, 4, 1) 0%,
        rgba(3, 3, 4, 0.86) 8%,
        rgba(3, 3, 4, 0.28) 20%,
        rgba(3, 3, 4, 0) 34%,
        rgba(3, 3, 4, 0) 66%,
        rgba(3, 3, 4, 0.32) 80%,
        rgba(3, 3, 4, 0.82) 92%,
        rgba(3, 3, 4, 1) 100%
      ),
      linear-gradient(
        90deg,
        rgba(3, 3, 4, 1) 0%,
        rgba(3, 3, 4, 0.965) 28%,
        rgba(3, 3, 4, 0.68) 52%,
        rgba(3, 3, 4, 0.18) 72%,
        rgba(3, 3, 4, 0.34) 88%,
        rgba(3, 3, 4, 0.52) 100%
      ),
      radial-gradient(
        circle at 74% 54%,
        rgba(3, 3, 4, 0) 0%,
        rgba(3, 3, 4, 0.08) 22%,
        rgba(3, 3, 4, 0.24) 58%,
        rgba(3, 3, 4, 0.46) 100%
      ),
      radial-gradient(circle at 16% 52%, rgba(3, 3, 4, 0.18) 0%, transparent 38%);
  }

  .hero-stage :global(.hero-signal-field) {
    inset: -2rem -4rem -3rem -2rem;
  }

  .hero-layout {
    position: relative;
    z-index: 2;
    display: block;
    width: 100%;
    padding-top: clamp(2rem, 4vw, 3rem);
    padding-bottom: clamp(3rem, 6vw, 4.5rem);
  }

  .hero-copy {
    display: grid;
    gap: 1.15rem;
    max-width: 47rem;
  }

  .hero-copy .product-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    width: fit-content;
    max-width: 100%;
    padding: 0.38rem 0.7rem 0.4rem;
    border: 1px solid rgba(91, 125, 255, 0.16);
    border-radius: 999px;
    background: rgba(8, 10, 14, 0.62);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.02),
      0 10px 30px rgba(0, 0, 0, 0.18);
    backdrop-filter: blur(12px);
    letter-spacing: 0;
    line-height: 1.15;
    white-space: nowrap;
  }

  .hero-copy .product-kicker::before {
    content: '';
    width: 0.38rem;
    height: 0.38rem;
    border-radius: 999px;
    background: rgba(59, 109, 255, 0.96);
    box-shadow: 0 0 14px rgba(70, 154, 255, 0.38);
  }

  .hero-kicker__mobile {
    display: none;
  }

  .control-kicker__mobile {
    display: none;
  }

  .hero-title {
    margin: 0;
    font-size: clamp(3rem, 5vw + 1rem, 5.6rem);
    line-height: 0.96;
    letter-spacing: -0.045em;
    text-wrap: balance;
  }

  .hero-detail {
    margin: 0;
    max-width: 34rem;
    color: var(--color-fg-secondary);
    font-size: clamp(1.05rem, 1vw + 0.9rem, 1.2rem);
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

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.9rem;
    margin-top: 1.1rem;
  }

  .metric-card {
    display: grid;
    gap: 0.35rem;
    padding: 1rem 1.05rem;
  }

  .metric-value {
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: 1.45rem;
    letter-spacing: -0.05em;
  }

  .metric-label {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    line-height: 1.45;
  }

  .signal-section,
  .control-section,
  .ink-section,
  .capability-section,
  .offer-section,
  .governance-section,
  .artifact-section,
  .mapping-section,
  .cta-section {
    padding-top: 1.25rem;
    padding-bottom: clamp(3.5rem, 6vw, 5rem);
  }

  .signal-shell {
    display: grid;
    gap: 1.2rem;
    padding: 1.35rem;
  }

  .showcase-stack {
    display: grid;
    gap: 1rem;
  }

  .signal-header {
    display: grid;
    gap: 0.75rem;
    max-width: 46rem;
  }

  .signal-header p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.7;
  }

  .signal-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.7rem;
  }

  .signal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
  }

  .stack-link {
    width: fit-content;
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-decoration: none;
  }

  .signal-pill {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    min-height: 2.35rem;
    padding: 0.55rem 0.8rem;
    border-radius: 999px;
    border: 1px solid var(--color-shell-border-default);
    background: rgba(255, 255, 255, 0.03);
    color: var(--color-fg-secondary);
    font-family: var(--font-mono);
    font-size: 0.74rem;
    letter-spacing: 0.04em;
    text-align: center;
    white-space: nowrap;
  }

  .signal-pill :global(.signal-pill__icon) {
    color: var(--color-brand-ink);
  }

  .section-lead {
    display: grid;
    gap: 0.85rem;
    max-width: 42rem;
    margin-bottom: 1.5rem;
  }

  .section-lead--center {
    margin-left: auto;
    margin-right: auto;
    text-align: center;
  }

  .section-lead h2 {
    margin: 0;
    line-height: 1;
    text-wrap: balance;
  }

  .section-lead p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.72;
  }

  .capability-grid,
  .offer-grid {
    display: grid;
    gap: 1rem;
  }

  .capability-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .capability-card,
  .offer-card {
    display: grid;
    gap: 0.9rem;
    padding: 1.2rem;
  }

  .capability-id,
  .offer-tag {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.74rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .capability-card h3,
  .offer-card h3 {
    margin: 0;
    font-size: 1.25rem;
    line-height: 1.15;
  }

  .capability-card p,
  .offer-card p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.7;
  }

  .offer-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .offer-card.offerFeatured {
    border-color: var(--color-brand-primary-border);
    box-shadow:
      0 18px 38px rgba(0, 0, 0, 0.42),
      0 0 0 1px rgba(49, 92, 255, 0.14),
      0 0 44px rgba(49, 92, 255, 0.12);
  }

  .governance-grid {
    display: grid;
    gap: clamp(1.25rem, 3vw, 2rem);
    align-items: center;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  }

  .governance-copy {
    display: grid;
    gap: 0.9rem;
    max-width: 36rem;
  }

  .governance-copy h2,
  .cta-panel h2 {
    margin: 0;
    line-height: 1.02;
    text-wrap: balance;
  }

  .governance-copy p,
  .cta-panel p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.72;
  }

  .governance-points {
    margin-top: 0.25rem;
  }

  .cta-panel {
    display: grid;
    gap: 0.95rem;
    padding: clamp(1.4rem, 3vw, 2rem);
    text-align: center;
  }

  @media (max-width: 1100px) {
    .governance-grid {
      grid-template-columns: 1fr;
    }

    .governance-copy {
      max-width: none;
    }
  }

  @media (max-width: 768px) {
    .hero-page {
      padding-top: clamp(2.25rem, 9vw, 3.25rem);
      padding-bottom: clamp(1.75rem, 8vw, 3rem);
    }

    .hero-stage {
      min-height: clamp(28rem, 104vw, 37rem);
    }

    .hero-stage::after {
      background:
        linear-gradient(
          180deg,
          rgba(3, 3, 4, 1) 0%,
          rgba(3, 3, 4, 0.9) 10%,
          rgba(3, 3, 4, 0.38) 22%,
          rgba(3, 3, 4, 0) 34%,
          rgba(3, 3, 4, 0) 68%,
          rgba(3, 3, 4, 0.4) 82%,
          rgba(3, 3, 4, 0.9) 94%,
          rgba(3, 3, 4, 1) 100%
        ),
        linear-gradient(
          90deg,
          rgba(3, 3, 4, 1) 0%,
          rgba(3, 3, 4, 0.972) 42%,
          rgba(3, 3, 4, 0.7) 66%,
          rgba(3, 3, 4, 0.26) 82%,
          rgba(3, 3, 4, 0.46) 100%
        ),
        radial-gradient(
          circle at 76% 56%,
          rgba(3, 3, 4, 0) 0%,
          rgba(3, 3, 4, 0.12) 24%,
          rgba(3, 3, 4, 0.34) 64%,
          rgba(3, 3, 4, 0.58) 100%
        ),
        radial-gradient(circle at 18% 42%, rgba(3, 3, 4, 0.2) 0%, transparent 36%);
    }

    .hero-stage :global(.hero-signal-field) {
      inset: 0 -2.5rem -2rem -1rem;
    }

    .hero-layout {
      padding-top: 1rem;
      padding-bottom: 2.75rem;
    }

    .metric-grid,
    .capability-grid,
    .offer-grid {
      grid-template-columns: 1fr;
    }

    .hero-title {
      font-size: clamp(2.6rem, 11vw, 4rem);
    }

    .hero-copy .product-kicker {
      gap: 0.38rem;
      padding: 0.34rem 0.58rem 0.36rem;
      min-height: 2rem;
      font-size: 0.72rem;
    }

    .hero-kicker__desktop {
      display: none;
    }

    .hero-kicker__mobile {
      display: inline;
    }

    .control-kicker {
      max-width: 100%;
      letter-spacing: 0.08em;
      line-height: 1.15;
      white-space: nowrap;
    }

    .control-kicker__desktop {
      display: none;
    }

    .control-kicker__mobile {
      display: inline;
    }

    .signal-shell,
    .capability-card,
    .offer-card,
    .cta-panel {
      padding: 1rem;
    }

    .signal-pill {
      white-space: normal;
    }
  }

  @media (max-width: 520px) {
    .signal-strip {
      grid-template-columns: 1fr;
    }
  }
</style>
