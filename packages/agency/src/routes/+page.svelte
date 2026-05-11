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
      summary: 'The first reliable operating path. Fix one workflow your team still does by hand.',
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
      summary: 'The governed execution layer once speed touches revenue, trust, or compliance.',
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
  title={`${agencyCoreMessaging.categoryLabel} | CREATE SOMETHING .agency`}
  description="CREATE SOMETHING .agency builds calm, transparent, reliable AI workflow systems for business operators: one workflow, clear vendor boundaries, portable artifacts, and escalation only when judgment is required."
  keywords="calm transparent reliable AI workflow systems, Policy OS, MCP wedge, transparent AI stack, workflow system, production automation, technical operators"
  ogImage="/og-image.svg"
  propertyName="agency"
  {services}
/>

<section class="property-hero-page">
  <div class="property-hero-stage">
    <HeroSignalField variant="agency" focus="right" />

    <div class="shell-inner-pad property-hero-layout">
      <div class="property-hero-copy">
        <BlurFade delay={0}>
          <span class="product-kicker">{agencyCoreMessaging.categoryLabel}</span>
        </BlurFade>

        <BlurFade delay={0.05}>
          <h1 class="property-hero-title">
            Calm, transparent AI systems for the operator who has to own the outcome.
          </h1>
        </BlurFade>

        <BlurFade delay={0.1}>
          <p class="property-hero-detail">
            CREATE SOMETHING is the operating toolchain I use as a solo operator to complete the
            outcome. Reputable services make the work transparent; the moat is the calm, reliable
            workflow built around your business.
          </p>
        </BlurFade>

        <BlurFade delay={0.15}>
          <div class="property-hero-actions">
            <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
            <Button href="/stack" variant="secondary">See The Stack</Button>
          </div>
        </BlurFade>

        <BlurFade delay={0.2}>
          <p class="property-hero-note">Connect. Automate. Govern. Operate.</p>
        </BlurFade>
      </div>
    </div>
  </div>

  <div class="shell-inner-pad">
    <div class="property-metric-grid">
      {#each proofMetrics as metric, index}
        <BlurFade delay={0.25 + index * 0.05}>
          <article class="product-surface product-surface--soft property-metric-card">
            <span class="property-metric-value">{metric.value}</span>
            <span class="property-metric-label">{metric.label}</span>
          </article>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="property-section">
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

      <a class="stack-link" href="/stack">Review stack boundaries</a>
    </div>
  </div>
</section>

<section id="ink" class="property-section">
  <div class="shell-inner-pad">
    <BlurFade>
      <InkOperatorSurface />
    </BlurFade>
  </div>
</section>

<section class="property-section">
  <div class="shell-inner-pad showcase-stack">
    <div class="property-section-lead">
      <BlurFade>
        <span class="product-kicker">Inspect the full control room</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>The detailed decision surface belongs below the fold.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          Once the hero establishes the workflow boundaries, the full surface can show tabs, checks,
          artifacts, and release logic without crushing the copy.
        </p>
      </BlurFade>
    </div>

    <BlurFade delay={0.15}>
      <ExecutionWorkbench />
    </BlurFade>
  </div>
</section>

<section id="how" class="property-section">
  <div class="shell-inner-pad">
    <div class="property-section-lead">
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

    <div class="property-card-grid property-card-grid--2">
      {#each capabilityCards as card, index}
        <BlurFade delay={0.15 + index * 0.05}>
          <article class="product-surface property-content-card">
            <span class="property-content-meta">{card.id}</span>
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

<section class="property-section">
  <div class="shell-inner-pad">
    <div class="property-section-lead property-section-lead--center">
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

    <div class="property-card-grid property-card-grid--3">
      {#each offerCards as offer, index}
        <BlurFade delay={0.15 + index * 0.08}>
          <article
            class="product-surface property-content-card {offer.featured
              ? 'property-content-card--featured'
              : ''}"
          >
            <span class="property-content-meta"
              >{offer.featured ? 'Primary build' : 'Entry or expansion'}</span
            >
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

<section class="property-section">
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

<section class="property-section">
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

<section class="property-section">
  <div class="shell-inner-pad">
    <BlurFade>
      <MappingSessionBrief />
    </BlurFade>
  </div>
</section>

<section class="property-section">
  <div class="shell-inner-pad">
    <div class="product-surface product-surface--accent property-cta-panel">
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
        <div class="property-hero-actions property-hero-actions--center">
          <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
          <Button href="/stack" variant="secondary">See The Stack</Button>
        </div>
      </BlurFade>
    </div>
  </div>
</section>

<style>
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

  .governance-copy h2 {
    margin: 0;
    line-height: 1.02;
    text-wrap: balance;
  }

  .governance-copy p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.72;
  }

  .governance-points {
    margin-top: 0.25rem;
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
    .signal-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .signal-shell {
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
