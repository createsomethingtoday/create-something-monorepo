<script lang="ts">
  import { Button, HeroSignalField, SEO } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';
  import ArtifactSystemStrip from '$lib/components/ArtifactSystemStrip.svelte';
  import BrandLogo from '$lib/components/BrandLogo.svelte';
  import ExecutionWorkbench from '$lib/components/ExecutionWorkbench.svelte';
  import HubMcpFlow from '$lib/components/HubMcpFlow.svelte';
  import MappingSessionBrief from '$lib/components/MappingSessionBrief.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const services = [
    {
      name: 'Workflow Readiness Map',
      description:
        'One high-drag workflow mapped into source systems, decision states, risk boundaries, and a safe first build wedge.',
      type: 'Paid diagnostic',
      price: 'Custom',
      priceDescription: 'Scoped map with build/no-build recommendation'
    },
    {
      name: 'Governed Workflow Console',
      description:
        'A calm operating surface where AI and agents can help prepare work while people keep approval authority.',
      type: 'Implementation sprint',
      price: 'Custom',
      priceDescription: 'Scoped build with optional support'
    },
    {
      name: 'Monthly Governance Review',
      description:
        'A low-touch review loop for workflow health, approval rules, incidents, tool scopes, and edge cases.',
      type: 'Governance retainer',
      price: 'Custom',
      priceDescription: 'Defined review, not open-ended support'
    }
  ];

  const proofMetrics = [
    { value: '1', label: 'workflow fixed first' },
    { value: '3', label: 'decision states' },
    { value: '1', label: 'workflow console' },
    { value: '100%', label: 'artifact-backed delivery' }
  ];

  const operatingSignals = [
    'Retool',
    'Model Context Protocol',
    'Cloudflare Workers',
    'Composio',
    'OpenAI',
    'Webflow',
    'Linear',
    'Dify'
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
      displayName: 'Workflow console brief',
      name: 'workflow-console-brief',
      summary: 'What the buyer sees in Retool: status, approvals, blocked states, artifacts, and handoff.',
      tag: 'Surface'
    }
  ];

  const capabilityCards = [
    {
      id: '01',
      title: 'Console clarity',
      body: 'Give the team one place to see workflow state, AI-prepared work, approvals, risks, artifacts, and recovery paths.',
      points: [
        'Retool is the operating surface, not the durable source of truth',
        'Clients see status and decisions, not raw internal work',
        'The team knows what needs action without watching every step'
      ]
    },
    {
      id: '02',
      title: 'Human-approved operations',
      body: 'Decide which AI-assisted actions can run, which need a person in the loop, and which must stop.',
      points: [
        'Reason-coded approvals instead of hidden heuristics',
        'Policy rules attached to the workflow, not buried in chat history',
        'Blocked states your team can actually understand'
      ]
    },
    {
      id: '03',
      title: 'Matching, intake, and routing',
      body: 'The first repeatable wedge is work where demand, supply, capacity, or requests must be matched and reviewed.',
      points: [
        'Jobs to candidates, requests to operators, leads to owners',
        'Agents recommend, explain, and flag missing information',
        'Humans keep final approval where the decision matters'
      ]
    },
    {
      id: '04',
      title: 'Portable delivery',
      body: 'The client keeps the code, workflow documentation, and operating artifacts after launch.',
      points: [
        'Runbooks, contracts, and release evidence ship with the build',
        'No proprietary black box required to keep the workflow alive',
        'Commodity plumbing stays replaceable behind the trust boundary'
      ]
    }
  ];

  const offerCards = [
    {
      name: 'Workflow Readiness Map',
      featured: false,
      summary:
        'A paid diagnostic for one workflow: what is safe to automate, what needs approval, and what should not move yet.',
      points: [
        'Current-state workflow and handoffs',
        'Decision states and risk register',
        'System and data boundary',
        'Build, defer, or stop recommendation'
      ]
    },
    {
      name: 'Governed Workflow Console',
      featured: true,
      summary:
        'The core build: one AI-assisted operating path with data, tools, agents, approvals, and recovery in one surface.',
      points: [
        'Retool operator surface',
        'MCP/tool and worker layer',
        'Approval queue and blocked states',
        'Runbook, handoff, and evidence'
      ]
    },
    {
      name: 'Governance Review',
      featured: false,
      summary:
        'A low-touch monthly loop once the workflow is live and usage starts creating edge cases.',
      points: [
        'Workflow health review',
        'Approval-rule tuning',
        'Incident and risk notes',
        'Scoped improvement queue'
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
  title="AI-Assisted Workflows Your Team Can Trust | CREATE SOMETHING .agency"
  description="CREATE SOMETHING .agency builds calm workflow consoles for teams bringing AI and agents into real operations: one workflow, clear decision states, visible approvals, tool boundaries, and human approval where it matters."
  keywords="AI-assisted workflows, human-approved operations, governed workflow consoles, Retool workflow console, MCP workflow automation, AI approval workflow, staffing matching workflow, workflow readiness map"
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
          <span class="product-kicker">{agencyCoreMessaging.heroKicker}</span>
        </BlurFade>

        <BlurFade delay={0.05}>
          <h1 class="hero-title">AI-assisted workflows your team can trust.</h1>
        </BlurFade>

        <BlurFade delay={0.1}>
          <p class="hero-detail">
            CREATE SOMETHING builds calm workflow systems for teams bringing AI and agents into
            real operations. I map one high-drag workflow, connect the tools and data behind it,
            and give your team a workflow console where AI can recommend, draft, route, and flag
            work while people keep approval authority.
          </p>
        </BlurFade>

        <BlurFade delay={0.15}>
          <div class="hero-actions">
            <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
            <Button href="/stack" variant="secondary">See The Stack</Button>
          </div>
        </BlurFade>

        <BlurFade delay={0.2}>
          <p class="hero-note">AI helps. People approve. The workflow stays visible.</p>
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
        <span class="product-kicker">Workflow-console stack</span>
        <p>
          AI and agents are becoming part of normal operations, but they are not the product by
          themselves. Retool makes the workflow visible; MCPs and APIs define tool access; workers
          and agents prepare work; policy and artifacts define what can run, what needs approval,
          and what stops. CREATE SOMETHING owns the workflow boundary.
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

      <a class="stack-link" href="/stack">Review stack boundaries</a>
    </div>
  </div>
</section>

<section class="control-section">
  <div class="shell-inner-pad showcase-stack">
    <div class="section-lead">
      <BlurFade>
        <span class="product-kicker">Inspect the workflow console</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>The team should see the workflow state, not the whole machine room.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          The console shows AI-prepared work, decisions, approvals, blocked states, artifacts,
          and recovery paths. The private execution layer stays behind the interface.
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
        <h2>AI can move fast. Trust is the product.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          The buyer does not need to become an AI infrastructure expert. They need to know how the
          system works, where data moves, what the agent is allowed to prepare, and who owns the
          handoff when the workflow matters.
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
          The ladder is buyer-readable: map one workflow, build the first governed console,
          then review and tune it as real usage creates edge cases.
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
        <h2>The console layer is the difference between a demo and an operating path.</h2>
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
          <Button href="/stack" variant="secondary">See The Stack</Button>
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
    padding: 0.38rem 0.7rem 0.4rem;
    border: 1px solid rgba(91, 125, 255, 0.16);
    border-radius: 999px;
    background: rgba(8, 10, 14, 0.62);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.02),
      0 10px 30px rgba(0, 0, 0, 0.18);
    backdrop-filter: blur(12px);
  }

  .hero-copy .product-kicker::before {
    content: '';
    width: 0.38rem;
    height: 0.38rem;
    border-radius: 999px;
    background: rgba(59, 109, 255, 0.96);
    box-shadow: 0 0 14px rgba(70, 154, 255, 0.38);
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
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.7rem;
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

    .signal-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .hero-title {
      font-size: clamp(2.6rem, 11vw, 4rem);
    }

    .hero-copy .product-kicker {
      gap: 0.38rem;
      padding: 0.34rem 0.58rem 0.36rem;
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

  @media (max-width: 420px) {
    .signal-strip {
      grid-template-columns: 1fr;
    }
  }
</style>
