<script lang="ts">
  import { Button, SEO } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';
  import ArtifactSystemStrip from '$lib/components/ArtifactSystemStrip.svelte';
  import BrandLogo from '$lib/components/BrandLogo.svelte';
  import ExecutionWorkbench from '$lib/components/ExecutionWorkbench.svelte';
  import HubMcpFlow from '$lib/components/HubMcpFlow.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const services = [
    {
      name: 'Workflow Infrastructure',
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
    { value: '100%', label: 'artifact-backed delivery' },
    { value: '0', label: 'interest in open-ended staff aug' }
  ];

  const operatingSignals = [
    'Model Context Protocol',
    'Cloudflare Workers',
    'Cloudflare D1',
    'Durable Objects',
    'Anthropic Claude',
    'Notion API',
    'SvelteKit',
    'TypeScript'
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
      name: 'Workflow Infrastructure',
      featured: true,
      summary:
        'The first reliable operating path. Fix one workflow your team still protects by hand.',
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
    },
    {
      name: 'Enterprise Extension',
      featured: false,
      summary:
        'Cross-system orchestration for teams that need deterministic recovery and auditability.',
      points: [
        'Cross-system control surfaces',
        'Custom trust boundaries',
        'Deterministic retries',
        'Architecture support for high-stakes rollout'
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
  title={`${agencyCoreMessaging.categoryLabel} | CREATE SOMETHING .agency`}
  description="CREATE SOMETHING .agency helps ops-minded teams make critical workflows safe enough to trust in production."
  keywords="governed workflow infrastructure, production automation, technical operators, enterprise workflow architecture, automation reliability, custom mcp"
  ogImage="/og-image.svg"
  propertyName="agency"
  {services}
/>

<section class="hero-page">
  <div class="shell-inner-pad hero-layout">
    <div class="hero-copy">
      <BlurFade delay={0}>
        <span class="product-kicker">{agencyCoreMessaging.categoryLabel}</span>
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
          <Button href="/services" variant="secondary">See The Engagement Model</Button>
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
        <p class="hero-note">Scoped delivery. Clear controls. Portable artifacts.</p>
      </BlurFade>
    </div>

    <BlurFade delay={0.2}>
      <ExecutionWorkbench />
    </BlurFade>
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
        <span class="product-kicker">Portable stack</span>
        <p>
          CREATE SOMETHING can use commodity connectivity where it makes sense, while keeping the
          delivery, policy, and trust boundary owned by CREATE SOMETHING.
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
    </div>
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
          The hard part is deciding what should run, what should wait, and what should stop. That
          decision layer is what keeps automation from becoming cleanup debt.
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
          The category does not need to change every quarter. Fix the workflow first. Add Policy OS
          when the workflow begins to matter financially, operationally, or reputationally.
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
            <span class="offer-tag">{offer.featured ? 'Primary entry' : 'Expansion path'}</span>
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
        title="How trust stays visible"
        description="Every engagement ships with runbooks, approval boundaries, release evidence, and artifact contracts your team can inspect after launch."
      />
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
          <Button href="/services" variant="secondary">See The Engagement Model</Button>
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

  .hero-layout {
    display: grid;
    gap: clamp(1.5rem, 3vw, 2.5rem);
    align-items: center;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  }

  .hero-copy {
    display: grid;
    gap: 1.15rem;
    max-width: 39rem;
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
  .capability-section,
  .offer-section,
  .governance-section,
  .artifact-section,
  .cta-section {
    padding-top: 1.25rem;
    padding-bottom: clamp(3.5rem, 6vw, 5rem);
  }

  .signal-shell {
    display: grid;
    gap: 1.2rem;
    padding: 1.35rem;
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
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
  }

  .signal-pill {
    display: inline-flex;
    align-items: center;
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
    .hero-layout,
    .governance-grid {
      grid-template-columns: 1fr;
    }

    .hero-copy,
    .governance-copy {
      max-width: none;
    }
  }

  @media (max-width: 768px) {
    .metric-grid,
    .capability-grid,
    .offer-grid {
      grid-template-columns: 1fr;
    }

    .hero-title {
      font-size: clamp(2.6rem, 11vw, 4rem);
    }

    .signal-shell,
    .capability-card,
    .offer-card,
    .cta-panel {
      padding: 1rem;
    }
  }
</style>
