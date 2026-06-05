<script lang="ts">
  import { Button, HeroSignalField, SEO } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';
  import ArtifactSystemStrip from '$lib/components/ArtifactSystemStrip.svelte';
  import BrandLogo from '$lib/components/BrandLogo.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const statusItems = [
    {
      label: 'Primary track',
      value: 'PowerUP Consult',
      detail: 'Architecture, implementation, controls, optimization, and delivery support.'
    },
    {
      label: 'Account lane',
      value: 'Self-Serve Agency',
      detail: 'Client account management, tenant administration, and centralized billing when needed.'
    },
    {
      label: 'Later lane',
      value: 'Technology Alliance',
      detail: 'Only after a public integration, docs, demo, support path, and usage proof exist.'
    }
  ];

  const proofCards = [
    {
      title: 'Cloudflare Runtime Stack',
      label: 'Operating model',
      detail:
        'Workers, Pages, D1, queues, routes, and durable primitives carry the deployable workflow substrate.'
    },
    {
      title: 'Remote MCP Fleet',
      label: 'Implementation proof',
      detail:
        'Cloudflare-hosted MCP endpoints expose scoped tools with bearer-token controls and tenant boundaries.'
    },
    {
      title: 'Trust Layer Routes',
      label: 'Trust proof',
      detail:
        'Action previews, approval checks, blocked states, and evidence records sit before risky execution.'
    },
    {
      title: 'Client Review Surfaces',
      label: 'Delivery proof',
      detail:
        'Pages and Workers support review builds, operator consoles, delivery updates, and rollback-ready handoffs.'
    }
  ];

  const runtimeFlow = [
    {
      stage: '01',
      label: 'Route',
      title: 'Cloudflare route',
      detail: 'Expose the workflow as a Worker, Pages route, or review surface with a clear owner.'
    },
    {
      stage: '02',
      label: 'Gate',
      title: 'Trust check',
      detail: 'Classify the action as allowed, approval-needed, blocked, or recoverable before execution.'
    },
    {
      stage: '03',
      label: 'State',
      title: 'Durable record',
      detail: 'Store request state, approvals, retries, and evidence in D1 or another durable primitive.'
    },
    {
      stage: '04',
      label: 'Act',
      title: 'MCP/tool call',
      detail: 'Execute against scoped MCP tools or APIs with tenant, account, and bearer boundaries intact.'
    },
    {
      stage: '05',
      label: 'Prove',
      title: 'Handoff evidence',
      detail: 'Return a reviewable result, rollback note, runbook update, or escalation path.'
    }
  ];

  const partnerArtifacts = [
    {
      displayName: 'cloudflare_runtime.md',
      name: 'cloudflare_runtime.md',
      summary: 'Workers, Pages, D1, KV, R2, queues, Durable Objects, and deployment boundaries.',
      tag: 'Runtime'
    },
    {
      displayName: 'remote_mcp_fleet.json',
      name: 'remote_mcp_fleet.json',
      summary: 'Hosted MCP endpoints with tenant scoping, bearer auth, and operational status.',
      tag: 'MCP'
    },
    {
      displayName: 'trust_layer_routes.md',
      name: 'trust_layer_routes.md',
      summary: 'Action previews, approvals, blocked states, entitlement checks, and evidence logs.',
      tag: 'Trust'
    },
    {
      displayName: 'delivery_runbook.md',
      name: 'delivery_runbook.md',
      summary: 'Build checks, deploy notes, rollback paths, and client-safe handoff evidence.',
      tag: 'Operate'
    }
  ];

  const audienceCards = [
    {
      audience: 'Operators',
      title: 'Run controlled workflows close to the business.',
      detail:
        'Use Cloudflare routes for previews, approvals, status checks, and evidence before actions execute.'
    },
    {
      audience: 'Builders',
      title: 'Deploy MCP and agent surfaces without platform weight.',
      detail:
        'Package Workers, Pages, D1, and durable runtime primitives into portable workflow infrastructure.'
    },
    {
      audience: 'Agencies',
      title: 'Standardize delivery without hiding account ownership.',
      detail:
        'Separate CREATE SOMETHING delivery receipts from client-owned zones, accounts, billing, and data rights.'
    }
  ];

  const routeSteps = [
    {
      step: 'Apply',
      title: 'PowerUP consult first',
      detail:
        'Lead with implementation, architecture, training, runbooks, and controlled workflow outcomes.'
    },
    {
      step: 'Manage',
      title: 'Self-Serve Agency when useful',
      detail:
        'Use the agency lane when account volume, centralized billing, or tenant administration justify it.'
    },
    {
      step: 'Productize',
      title: 'Technology Alliance readiness',
      detail:
        'Wait for a public integration, docs, demo, support path, privacy review, and usage evidence.'
    }
  ];

  const readinessItems = [
    {
      label: 'PowerUP Consult',
      status: 'Ready',
      detail: 'Lead with architecture, implementation, runbooks, training, and optimization.'
    },
    {
      label: 'Self-Serve Agency',
      status: 'Near term',
      detail: 'Use when account volume, centralized billing, and client administration justify it.'
    },
    {
      label: 'Technology Alliance',
      status: 'Later',
      detail: 'Hold until a public integration, documentation, support path, and usage proof exist.'
    },
    {
      label: 'Public proof',
      status: 'Sanitize',
      detail: 'Use runtime diagrams, generated catalogs, and delivery summaries without account data.'
    }
  ];

  const ecosystemLanes = [
    {
      label: 'Agent runtime',
      name: 'Dify',
      href: '/dify',
      detail: 'Client-facing agent workflows and marketplace-ready agent packaging.'
    },
    {
      label: 'Operator workspace',
      name: 'Notion',
      href: '/notion',
      detail: 'Workspace systems, templates, and reviewable operating receipts.'
    },
    {
      label: 'Vendor boundary',
      name: 'Stack',
      href: '/stack',
      detail: 'Ownership boundaries across Cloudflare, Dify, Notion, MCPs, and delivery surfaces.'
    }
  ];

  const complianceItems = [
    'No official Cloudflare Partner or certified provider claim before acceptance.',
    'No Technology Alliance claim until a public integration and Cloudflare approval exist.',
    'No client-private account names, zones, tokens, emails, billing details, or raw traces in public proof.',
    'No Cloudflare brand use that implies endorsement before authorization.'
  ];
</script>

<SEO
  title="Cloudflare Partner Lane | CREATE SOMETHING .agency"
  description="CREATE SOMETHING builds Cloudflare-native workflow systems with Workers, Pages, D1, remote MCP surfaces, and trust-layer controls."
  keywords="Cloudflare partner, Cloudflare PowerUP, Cloudflare Workers, remote MCP, D1, trust layer, AI workflow infrastructure"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<section class="hero-page cloudflare-hero">
  <div class="hero-stage">
    <HeroSignalField variant="agency" focus="right" />

    <div class="shell-inner-pad cloudflare-shell hero-layout">
      <div class="hero-copy">
        <BlurFade>
          <span class="product-kicker">Cloudflare Partner Lane</span>
        </BlurFade>

        <BlurFade delay={0.05}>
          <h1 class="hero-title">Cloudflare runtime with controlled workflows.</h1>
        </BlurFade>

        <BlurFade delay={0.1}>
          <p class="hero-detail">
            CREATE SOMETHING uses Workers, Pages, D1, remote MCP surfaces, and trust-layer approval
            boundaries as the runtime substrate. The partner path is consult first, agency
            management second, and Technology Alliance later.
          </p>
        </BlurFade>

        <BlurFade delay={0.15}>
          <div class="hero-actions">
            <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
            <Button href="/partners" variant="secondary">See Partner Stack</Button>
          </div>
        </BlurFade>

        <BlurFade delay={0.18}>
          <p class="hero-note">Route. Gate. State. Prove.</p>
        </BlurFade>
      </div>

      <BlurFade delay={0.2}>
        <aside
          class="cloudflare-brief product-surface product-surface--soft"
          aria-label="Cloudflare partner summary"
        >
          <div class="cloudflare-brief-header">
            <span class="logo-mark" aria-hidden="true">
              <BrandLogo name="Cloudflare" size={25} />
            </span>
            <div>
              <span>Cloudflare track</span>
              <strong>PowerUP consult plus agency account readiness</strong>
            </div>
          </div>
          <dl>
            <div>
              <dt>Primary offer</dt>
              <dd>Cloudflare-native workflow systems with Trust Layer</dd>
            </div>
            <div>
              <dt>Primary proof</dt>
              <dd>Workers, D1, remote MCPs, delivery runbooks</dd>
            </div>
            <div>
              <dt>Public claim</dt>
              <dd>Implementation lane, not official partner</dd>
            </div>
          </dl>
        </aside>
      </BlurFade>
    </div>
  </div>
</section>

<section class="status-band">
  <div class="shell-inner-pad cloudflare-shell">
    <div class="status-grid" role="list">
      {#each statusItems as item}
        <article class="status-card product-surface product-surface--soft" role="listitem">
          <span>{item.label}</span>
          <h2>{item.value}</h2>
          <p>{item.detail}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="content-section proof-section">
  <div class="shell-inner-pad cloudflare-shell section-grid">
    <div class="section-copy">
      <span class="product-kicker">Proof Packet</span>
      <h2>The strongest Cloudflare proof is runtime delivery.</h2>
      <p>
        The application should lead with implementation evidence: deployed Workers and Pages,
        D1-backed operating state, remote MCP endpoints, approval routes, runbooks, and client-safe
        review surfaces.
      </p>
    </div>

    <div class="proof-grid" role="list">
      {#each proofCards as card}
        <article class="proof-card product-surface" role="listitem">
          <span>{card.label}</span>
          <h3>{card.title}</h3>
          <p>{card.detail}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="content-section runtime-section">
  <div class="shell-inner-pad cloudflare-shell">
    <div class="section-copy wide">
      <span class="product-kicker">Runtime Pattern</span>
      <h2>The repeatable Cloudflare story is a controlled execution loop.</h2>
      <p>
        The page now names the concrete pattern behind the partner case: a Cloudflare route receives
        the work, the Trust Layer decides what can happen, durable state records the handoff, MCP tools do
        the narrow action, and the result comes back with evidence.
      </p>
    </div>

    <div class="runtime-flow" role="list">
      {#each runtimeFlow as item}
        <article class="runtime-node product-surface" role="listitem">
          <div class="runtime-node-header">
            <span class="runtime-stage">{item.stage}</span>
            <span>{item.label}</span>
          </div>
          <h3>{item.title}</h3>
          <p>{item.detail}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="content-section artifact-section">
  <div class="shell-inner-pad cloudflare-shell">
    <ArtifactSystemStrip
      eyebrow="Partner Evidence"
      title="The Cloudflare case has receipts."
      description="The partner packet can reference runtime architecture, hosted MCP endpoints, trust-layer routes, and delivery runbooks without exposing private account or tenant data."
      items={partnerArtifacts}
    />
  </div>
</section>

<section class="content-section readiness-section">
  <div class="shell-inner-pad cloudflare-shell readiness-layout">
    <div class="section-copy">
      <span class="product-kicker">Application Readiness</span>
      <h2>Make the next action obvious before the application leaves the repo.</h2>
      <p>
        The lead packet should stay operational: what is ready now, what needs volume, what must wait
        for public product proof, and what must be sanitized before it is shared.
      </p>
    </div>

    <div class="readiness-grid" role="list">
      {#each readinessItems as item}
        <article class="readiness-card product-surface product-surface--soft" role="listitem">
          <div>
            <span>{item.label}</span>
            <strong>{item.status}</strong>
          </div>
          <p>{item.detail}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="content-section audience-section">
  <div class="shell-inner-pad cloudflare-shell">
    <div class="section-copy wide">
      <span class="product-kicker">Delivery Shape</span>
      <h2>One Cloudflare route for operators, builders, and agencies.</h2>
    </div>

    <div class="audience-grid" role="list">
      {#each audienceCards as card}
        <article class="audience-card product-surface" role="listitem">
          <span>{card.audience}</span>
          <h3>{card.title}</h3>
          <p>{card.detail}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="content-section ecosystem-section">
  <div class="shell-inner-pad cloudflare-shell">
    <div class="section-copy wide">
      <span class="product-kicker">Partner Stack</span>
      <h2>Cloudflare is the runtime lane, not the whole offer.</h2>
      <p>
        The strongest public posture is precise: Cloudflare carries runtime infrastructure, Dify
        carries the agent surface, Notion carries operator workspace proof, and the stack page keeps
        vendor ownership legible.
      </p>
    </div>

    <div class="ecosystem-grid">
      {#each ecosystemLanes as lane}
        <a class="ecosystem-card product-surface" href={lane.href}>
          <span>{lane.label}</span>
          <h3>{lane.name}</h3>
          <p>{lane.detail}</p>
        </a>
      {/each}
    </div>
  </div>
</section>

<section class="content-section route-section">
  <div class="shell-inner-pad cloudflare-shell section-grid reverse">
    <div class="route-list">
      {#each routeSteps as item}
        <article class="route-step product-surface product-surface--soft">
          <span>{item.step}</span>
          <div>
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
          </div>
        </article>
      {/each}
    </div>

    <div class="section-copy">
      <span class="product-kicker">Partner Order</span>
      <h2>Consult now. Agency management when account volume needs it.</h2>
      <p>
        The public posture should stay precise: Cloudflare carries the runtime substrate. CREATE
        SOMETHING carries workflow design, policy, evidence, and handoff.
      </p>
      <div class="external-actions">
        <Button href="https://www.cloudflare.com/partners/" variant="secondary">Partner Programs</Button>
        <Button href="https://developers.cloudflare.com/" variant="secondary">Developer Docs</Button>
      </div>
    </div>
  </div>
</section>

<section class="content-section compliance-section">
  <div class="shell-inner-pad cloudflare-shell compliance-layout">
    <div class="section-copy">
      <span class="product-kicker">Compliance</span>
      <h2>The public Cloudflare claim stays narrow until approval.</h2>
      <p>
        The goal is partner readiness without implying endorsement, certification, resale authority,
        or public alliance status that does not exist yet.
      </p>
    </div>

    <ul class="compliance-list">
      {#each complianceItems as item}
        <li class="product-surface product-surface--soft">{item}</li>
      {/each}
    </ul>
  </div>
</section>

<section class="content-section cta-section">
  <div class="shell-inner-pad cloudflare-shell">
    <div class="product-surface product-surface--accent cta-layout">
      <div>
        <span class="product-kicker">Next Step</span>
        <h2>Map the first Cloudflare-native workflow.</h2>
        <p>
          Bring the workflow, account boundary, and approval owner. CREATE SOMETHING will map the
          Worker routes, durable state, MCP contracts, policy states, and rollback evidence.
        </p>
      </div>
      <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
    </div>
  </div>
</section>

<style>
  .cloudflare-shell {
    width: min(1180px, 100%);
    margin: 0 auto;
  }

  .cloudflare-hero {
    padding-top: clamp(5.5rem, 9vw, 7.5rem);
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

  .cloudflare-hero :global(.hero-signal-field) {
    inset: -2rem -4rem -3rem -2rem;
  }

  .hero-layout {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: minmax(0, 1.14fr) minmax(18rem, 0.72fr);
    gap: clamp(2rem, 5vw, 5rem);
    align-items: center;
    padding-top: clamp(2rem, 4vw, 3rem);
    padding-bottom: clamp(3rem, 6vw, 4.5rem);
  }

  .cloudflare-hero .hero-copy {
    display: grid;
    gap: 1.1rem;
    max-width: 47rem;
  }

  .cloudflare-hero .hero-copy .product-kicker {
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

  .cloudflare-hero .hero-copy .product-kicker::before {
    width: 0.38rem;
    height: 0.38rem;
    background: rgba(59, 109, 255, 0.96);
    box-shadow: 0 0 14px rgba(70, 154, 255, 0.38);
  }

  .cloudflare-hero .hero-title {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: clamp(3rem, 5vw + 1rem, 5.35rem);
    line-height: 0.98;
    letter-spacing: 0;
    text-wrap: balance;
  }

  .cloudflare-hero .hero-detail {
    margin: 0;
    max-width: 38rem;
    color: var(--color-fg-secondary);
    font-size: clamp(1.02rem, 1vw + 0.9rem, 1.18rem);
    line-height: 1.72;
    text-wrap: pretty;
  }

  .cloudflare-hero .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
    align-items: center;
  }

  .hero-note {
    margin: 0;
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .cloudflare-brief {
    display: grid;
    gap: 1.15rem;
    padding: clamp(1.2rem, 3vw, 1.7rem);
  }

  .cloudflare-brief-header {
    display: flex;
    gap: 0.9rem;
    align-items: center;
  }

  .logo-mark {
    display: inline-grid;
    place-items: center;
    flex: 0 0 auto;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.9rem;
    border: 1px solid var(--color-shell-border-default);
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-fg-primary);
  }

  .cloudflare-brief span,
  .cloudflare-brief dt,
  .status-card span,
  .proof-card span,
  .audience-card span,
  .route-step span,
  .runtime-node span,
  .readiness-card span,
  .ecosystem-card span {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .cloudflare-brief strong {
    display: block;
    margin-top: 0.25rem;
    color: var(--color-fg-primary);
    font-size: 1.08rem;
    line-height: 1.25;
  }

  .cloudflare-brief dl {
    display: grid;
    gap: 0.85rem;
    margin: 0;
  }

  .cloudflare-brief dl div {
    display: grid;
    gap: 0.2rem;
    padding-top: 0.85rem;
    border-top: 1px solid var(--color-shell-border-default);
  }

  .cloudflare-brief dd {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.45;
  }

  .status-band,
  .content-section {
    padding-top: clamp(1.25rem, 3vw, 2rem);
    padding-bottom: clamp(3.5rem, 6vw, 5rem);
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.9rem;
  }

  .status-card,
  .proof-card,
  .audience-card,
  .runtime-node,
  .ecosystem-card {
    min-height: 13rem;
    display: grid;
    align-content: start;
    gap: 0.7rem;
    padding: clamp(1rem, 2.4vw, 1.3rem);
  }

  .status-card h2,
  .proof-card h3,
  .audience-card h3,
  .runtime-node h3,
  .ecosystem-card h3,
  .route-step h3,
  .section-copy h2,
  .cta-layout h2 {
    margin: 0;
    color: var(--color-fg-primary);
    line-height: 1.08;
    letter-spacing: 0;
    text-wrap: balance;
  }

  .status-card h2 {
    font-size: clamp(1.25rem, 2.3vw, 1.8rem);
  }

  .status-card p,
  .proof-card p,
  .audience-card p,
  .runtime-node p,
  .readiness-card p,
  .ecosystem-card p,
  .route-step p,
  .section-copy p,
  .cta-layout p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.68;
    text-wrap: pretty;
  }

  .section-grid,
  .compliance-layout,
  .readiness-layout {
    display: grid;
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
    gap: clamp(2rem, 5vw, 4.5rem);
    align-items: start;
  }

  .section-grid.reverse {
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  }

  .section-copy {
    display: grid;
    gap: 0.85rem;
    max-width: 42rem;
  }

  .section-copy.wide {
    max-width: 56rem;
    margin-bottom: 1.5rem;
  }

  .section-copy h2,
  .cta-layout h2 {
    font-size: clamp(1.65rem, 3vw, 2.65rem);
  }

  .proof-grid,
  .audience-grid,
  .runtime-flow,
  .ecosystem-grid {
    display: grid;
    gap: 1rem;
  }

  .proof-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .audience-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .runtime-flow {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    align-items: stretch;
  }

  .runtime-node {
    position: relative;
    min-height: 16rem;
  }

  .runtime-node:not(:last-child)::after {
    content: '';
    position: absolute;
    top: 2.1rem;
    right: -0.75rem;
    width: 0.5rem;
    height: 1px;
    background: var(--color-shell-border-strong);
  }

  .runtime-node-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .runtime-stage {
    display: inline-grid;
    place-items: center;
    width: 2.2rem;
    height: 2.2rem;
    border-radius: 999px;
    border: 1px solid var(--color-shell-border-default);
    background: rgba(255, 255, 255, 0.045);
    color: var(--color-fg-primary) !important;
  }

  .readiness-grid {
    display: grid;
    gap: 0.85rem;
  }

  .readiness-card {
    display: grid;
    grid-template-columns: minmax(10rem, 0.36fr) minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
    padding: 1rem 1.1rem;
  }

  .readiness-card strong {
    display: block;
    margin-top: 0.35rem;
    color: var(--color-fg-primary);
    font-size: 1rem;
    line-height: 1.2;
  }

  .ecosystem-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .ecosystem-card {
    color: inherit;
    text-decoration: none;
    transition:
      transform var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard),
      background-color var(--duration-micro) var(--ease-standard);
  }

  .ecosystem-card:hover {
    transform: translateY(-2px);
    border-color: var(--color-shell-border-strong);
    background: var(--color-shell-surface-hover);
  }

  .ecosystem-card:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 3px;
  }

  .proof-card h3,
  .audience-card h3,
  .runtime-node h3,
  .ecosystem-card h3,
  .route-step h3 {
    font-size: clamp(1.05rem, 1.5vw, 1.35rem);
  }

  .route-list {
    display: grid;
    gap: 1rem;
  }

  .route-step {
    display: grid;
    grid-template-columns: 6rem minmax(0, 1fr);
    gap: 1rem;
    padding: 1.1rem;
  }

  .external-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }

  .compliance-list {
    display: grid;
    gap: 0.85rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .compliance-list li {
    padding: 1rem 1.1rem;
    color: var(--color-fg-secondary);
    line-height: 1.55;
  }

  .cta-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1.5rem;
    align-items: center;
    padding: clamp(1.4rem, 3vw, 2rem);
  }

  @media (max-width: 1100px) {
    .runtime-flow {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .runtime-node:not(:last-child)::after {
      display: none;
    }
  }

  @media (max-width: 900px) {
    .hero-layout,
    .section-grid,
    .section-grid.reverse,
    .compliance-layout,
    .readiness-layout,
    .cta-layout {
      grid-template-columns: 1fr;
    }

    .status-grid,
    .audience-grid,
    .runtime-flow,
    .ecosystem-grid {
      grid-template-columns: 1fr;
    }

    .runtime-node {
      min-height: auto;
    }

    .runtime-node:not(:last-child)::after {
      top: auto;
      right: auto;
      left: 2.1rem;
      bottom: -0.75rem;
      width: 1px;
      height: 0.5rem;
    }
  }

  @media (max-width: 640px) {
    .cloudflare-hero .hero-title {
      font-size: clamp(2.35rem, 13vw, 3.4rem);
    }

    .proof-grid {
      grid-template-columns: 1fr;
    }

    .route-step {
      grid-template-columns: 1fr;
    }

    .readiness-card {
      grid-template-columns: 1fr;
    }
  }
</style>
