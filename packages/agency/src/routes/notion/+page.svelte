<script lang="ts">
  import { Button, HeroSignalField, SEO } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';
  import ArtifactSystemStrip from '$lib/components/ArtifactSystemStrip.svelte';
  import BrandLogo from '$lib/components/BrandLogo.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const statusItems = [
    {
      label: 'Primary track',
      value: 'Solutions Partner',
      detail: 'Consulting-led implementation, training, optimization, and ongoing support.'
    },
    {
      label: 'Proof lane',
      value: 'Templates + Builders',
      detail: 'Sanitized Agency Ops, eval review, and evidence systems for public reuse.'
    },
    {
      label: 'Later lane',
      value: 'Technology Partner',
      detail: 'Only after a public OAuth integration, docs, demo, support plan, and usage proof.'
    }
  ];

  const proofCards = [
    {
      title: 'Agency Ops PM Cockpit',
      label: 'Operating model',
      detail:
        'Notion is the PM and operator-facing layer while Linear stays the engineering tracker and canonical state stays outside Notion.'
    },
    {
      title: 'Notion Workers Guide',
      label: 'Developer surface',
      detail:
        'A documented decision path for MCPs, Notion Worker Agent Tools, Syncs, hosted MCP, and the Notion CLI.'
    },
    {
      title: 'Client Notion MCP Fleet',
      label: 'Implementation proof',
      detail:
        'Multiple deployed Notion MCP surfaces show the cross-client integration pattern without exposing private records.'
    },
    {
      title: 'Agent Evals And Review',
      label: 'Template candidate',
      detail:
        'A Notion-native human review layer with raw traces, costs, and evaluator output kept in external systems.'
    }
  ];

  const partnerArtifacts = [
    {
      displayName: 'notion_workers.md',
      name: 'notion_workers.md',
      summary: 'Decision guide for Notion Workers, Custom Agent tools, Syncs, hosted MCP, and CLI usage.',
      tag: 'Build'
    },
    {
      displayName: 'agency_ops_pm.md',
      name: 'agency_ops_pm.md',
      summary: 'The conservative PM model: Substrate canonical, Linear tracked work, Notion operator view.',
      tag: 'Ops'
    },
    {
      displayName: 'notion_mcp_fleet.json',
      name: 'notion_mcp_fleet.json',
      summary: 'Deployed Notion MCP surfaces with Infisical-scoped auth and tenant boundaries.',
      tag: 'MCP'
    },
    {
      displayName: 'template_candidates.md',
      name: 'template_candidates.md',
      summary: 'Sanitized templates for Agency Ops, eval review, evidence index, and builder examples.',
      tag: 'Proof'
    }
  ];

  const audienceCards = [
    {
      audience: 'Operators',
      title: 'Turn Notion into the reviewable operating layer.',
      detail:
        'Give PMs and client teams views for timelines, risks, decisions, evidence, and approved next actions.'
    },
    {
      audience: 'Builders',
      title: 'Use Notion Workers only where they fit.',
      detail:
        'Pilot narrow read-only Custom Agent tools before adding approved writes or managed syncs.'
    },
    {
      audience: 'Teams',
      title: 'Keep source-of-truth boundaries legible.',
      detail:
        'Make it explicit what Notion owns, what Linear owns, and what canonical systems own.'
    }
  ];

  const routeSteps = [
    {
      step: 'Apply',
      title: 'Solutions Partner first',
      detail:
        'Lead with consulting, implementation, training, optimization, and measurable operating outcomes.'
    },
    {
      step: 'Publish',
      title: 'Template and builder proof',
      detail:
        'Package sanitized systems for Agency Ops, agent evals, evidence review, and client updates.'
    },
    {
      step: 'Productize',
      title: 'Technology Partner readiness',
      detail:
        'Wait for a public OAuth integration, public docs, a demo video, support plan, and usage evidence.'
    }
  ];

  const ecosystemLanes = [
    {
      label: 'Agent runtime',
      name: 'Dify',
      href: '/dify',
      detail: 'Client-facing agent workflows, eval gates, marketplace proof, and affiliate-ready adoption.'
    },
    {
      label: 'Runtime substrate',
      name: 'Cloudflare',
      href: '/cloudflare',
      detail: 'Workers, Pages, D1, and hosted MCP surfaces for the workflows Notion makes reviewable.'
    },
    {
      label: 'Vendor boundary',
      name: 'Stack',
      href: '/stack',
      detail: 'Ownership boundaries across Notion, Dify, Cloudflare, MCPs, and client systems.'
    }
  ];

  const complianceItems = [
    'No official Notion Partner or certified consultant claim before acceptance.',
    'No Technology Partner claim until a public integration and Notion approval exist.',
    'No client-private records, live page IDs, raw traces, or credential references in public templates.',
    'No Notion brand use that implies endorsement before authorization.'
  ];
</script>

<SEO
  title="Notion Partner Lane | CREATE SOMETHING .agency"
  description="CREATE SOMETHING builds Notion operating systems for AI-enabled teams, with PM views, MCP and Worker automation, and Policy OS governance."
  keywords="Notion partner, Notion Solutions Partner, Notion operating systems, Notion Workers, Notion MCP, Policy OS"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<section class="hero-page notion-hero">
  <div class="hero-stage">
    <HeroSignalField variant="agency" focus="right" />

    <div class="shell-inner-pad notion-shell hero-layout">
      <div class="hero-copy">
        <BlurFade>
          <span class="product-kicker">Notion Partner Lane</span>
        </BlurFade>

        <BlurFade delay={0.05}>
          <h1 class="hero-title">Notion operating systems with governed automation.</h1>
        </BlurFade>

        <BlurFade delay={0.1}>
          <p class="hero-detail">
            CREATE SOMETHING designs Notion as the PM and operator layer for AI-enabled teams. The
            partner path is Solutions Partner first, template and builder proof second, and
            Technology Partner later.
          </p>
        </BlurFade>

        <BlurFade delay={0.15}>
          <div class="hero-actions">
            <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
            <Button href="/partners" variant="secondary">See Partner Stack</Button>
          </div>
        </BlurFade>

        <BlurFade delay={0.18}>
          <p class="hero-note">Plan. Sync. Review. Govern.</p>
        </BlurFade>
      </div>

      <BlurFade delay={0.2}>
        <aside
          class="notion-brief product-surface product-surface--soft"
          aria-label="Notion partner summary"
        >
          <div class="notion-brief-header">
            <span class="logo-mark" aria-hidden="true">
              <BrandLogo name="Notion API" size={24} />
            </span>
            <div>
              <span>Notion track</span>
              <strong>Solutions Partner plus template and builder proof</strong>
            </div>
          </div>
          <dl>
            <div>
              <dt>Primary offer</dt>
              <dd>Notion operating systems with Policy OS</dd>
            </div>
            <div>
              <dt>Primary proof</dt>
              <dd>PM cockpit, Workers guide, Notion MCP fleet</dd>
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
  <div class="shell-inner-pad notion-shell">
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
  <div class="shell-inner-pad notion-shell section-grid">
    <div class="section-copy">
      <span class="product-kicker">Proof Packet</span>
      <h2>The strongest Notion proof is implementation, not a product claim.</h2>
      <p>
        The application should lead with workspace architecture, PM workflow design, Notion MCPs,
        Workers experiments, and sanitized templates. Technology Partner readiness stays separate
        until a public integration is live.
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

<section class="content-section artifact-section">
  <div class="shell-inner-pad notion-shell">
    <ArtifactSystemStrip
      eyebrow="Partner Evidence"
      title="The Notion case is artifact-backed."
      description="The partner packet can reference operating guides, MCP fleet records, PM cockpit design, and sanitized template candidates without exposing private workspace data."
      items={partnerArtifacts}
    />
  </div>
</section>

<section class="content-section audience-section">
  <div class="shell-inner-pad notion-shell">
    <div class="section-copy wide">
      <span class="product-kicker">Delivery Shape</span>
      <h2>One Notion route for operators, builders, and teams.</h2>
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
  <div class="shell-inner-pad notion-shell">
    <div class="section-copy wide">
      <span class="product-kicker">Partner Stack</span>
      <h2>Notion is the operator lane, not the whole offer.</h2>
      <p>
        The public posture should keep each vendor role precise: Notion carries workspace proof,
        Dify carries the agent surface, Cloudflare carries runtime infrastructure, and the stack
        page keeps ownership boundaries legible.
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
  <div class="shell-inner-pad notion-shell section-grid reverse">
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
      <h2>Solutions Partner now. Technology Partner later.</h2>
      <p>
        The current public posture should be conservative: apply for Solutions Partner, publish
        sanitized proof, and treat Technology Partner as a product readiness target instead of a
        current claim.
      </p>
      <div class="external-actions">
        <Button href="https://www.notion.com/partners" variant="secondary">Partner Programs</Button>
        <Button href="https://www.notion.com/templates" variant="secondary">Template Marketplace</Button>
      </div>
    </div>
  </div>
</section>

<section class="content-section compliance-section">
  <div class="shell-inner-pad notion-shell compliance-layout">
    <div class="section-copy">
      <span class="product-kicker">Compliance</span>
      <h2>The public Notion claim stays narrow until approval.</h2>
      <p>
        The goal is partner readiness without implying endorsement, certification, or public
        integration status that does not exist yet.
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
  <div class="shell-inner-pad notion-shell">
    <div class="product-surface product-surface--accent cta-layout">
      <div>
        <span class="product-kicker">Next Step</span>
        <h2>Map the first Notion operating system.</h2>
        <p>
          Bring the workflow, team responsibilities, and source-of-truth boundaries. CREATE
          SOMETHING will map the Notion views, automation path, policy states, and evidence model.
        </p>
      </div>
      <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
    </div>
  </div>
</section>

<style>
  .notion-shell {
    width: min(1180px, 100%);
    margin: 0 auto;
  }

  .notion-hero {
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

  .notion-hero :global(.hero-signal-field) {
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

  .notion-hero .hero-copy {
    display: grid;
    gap: 1.1rem;
    max-width: 47rem;
  }

  .notion-hero .hero-copy .product-kicker {
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

  .notion-hero .hero-copy .product-kicker::before {
    width: 0.38rem;
    height: 0.38rem;
    background: rgba(59, 109, 255, 0.96);
    box-shadow: 0 0 14px rgba(70, 154, 255, 0.38);
  }

  .notion-hero .hero-title {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: clamp(3rem, 5vw + 1rem, 5.35rem);
    line-height: 0.98;
    letter-spacing: 0;
    text-wrap: balance;
  }

  .notion-hero .hero-detail {
    margin: 0;
    max-width: 38rem;
    color: var(--color-fg-secondary);
    font-size: clamp(1.02rem, 1vw + 0.9rem, 1.18rem);
    line-height: 1.72;
    text-wrap: pretty;
  }

  .notion-hero .hero-actions {
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

  .notion-brief {
    display: grid;
    gap: 1.15rem;
    padding: clamp(1.2rem, 3vw, 1.7rem);
  }

  .notion-brief-header {
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

  .notion-brief span,
  .notion-brief dt,
  .status-card span,
  .proof-card span,
  .audience-card span,
  .route-step span,
  .ecosystem-card span {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .notion-brief strong {
    display: block;
    margin-top: 0.25rem;
    color: var(--color-fg-primary);
    font-size: 1.08rem;
    line-height: 1.25;
  }

  .notion-brief dl {
    display: grid;
    gap: 0.85rem;
    margin: 0;
  }

  .notion-brief dl div {
    display: grid;
    gap: 0.2rem;
    padding-top: 0.85rem;
    border-top: 1px solid var(--color-shell-border-default);
  }

  .notion-brief dd {
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
  .route-step h3,
  .ecosystem-card h3,
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
  .route-step p,
  .ecosystem-card p,
  .section-copy p,
  .cta-layout p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.68;
    text-wrap: pretty;
  }

  .section-grid,
  .compliance-layout {
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

  .ecosystem-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .ecosystem-card {
    color: inherit;
    text-decoration: none;
    transition:
      border-color 160ms ease,
      background 160ms ease,
      transform 160ms ease;
  }

  .ecosystem-card:hover {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.055);
    transform: translateY(-2px);
  }

  .ecosystem-card:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 3px;
  }

  .proof-card h3,
  .audience-card h3,
  .route-step h3,
  .ecosystem-card h3 {
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

  @media (max-width: 900px) {
    .hero-layout,
    .section-grid,
    .section-grid.reverse,
    .compliance-layout,
    .cta-layout {
      grid-template-columns: 1fr;
    }

    .status-grid,
    .audience-grid,
    .ecosystem-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    .notion-hero .hero-title {
      font-size: clamp(2.35rem, 13vw, 3.4rem);
    }

    .proof-grid {
      grid-template-columns: 1fr;
    }

    .route-step {
      grid-template-columns: 1fr;
    }
  }
</style>
