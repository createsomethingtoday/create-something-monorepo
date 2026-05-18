<script lang="ts">
  import { Button, HeroSignalField, SEO } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';
  import ArtifactSystemStrip from '$lib/components/ArtifactSystemStrip.svelte';
  import BrandLogo from '$lib/components/BrandLogo.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const statusItems = [
    {
      label: 'Application track',
      value: 'Service Partner',
      detail: 'Implementation, training, support, governance, and enterprise adoption.'
    },
    {
      label: 'Distribution track',
      value: 'Marketplace Partner',
      detail: 'Templates, plugins, and repeatable Dify plus MCP solutions.'
    },
    {
      label: 'Acquisition target',
      value: '20 paid conversions',
      detail: 'The first affiliate economics milestone after Dify accepts the application.'
    }
  ];

  const proofCards = [
    {
      title: 'Public Guide Agent',
      label: 'Sanitized proof',
      detail:
        'A public Dify guide agent backed by read-only MCP cards and trust catalog evidence instead of private traces.'
    },
    {
      title: 'Abundance Delivery',
      label: 'Client system',
      detail:
        'A Dify-backed delivery surface with agent inventory, eval coverage, and production-oriented evidence controls.'
    },
    {
      title: 'Transcript To Notion',
      label: 'Workflow template',
      detail:
        'A repeatable Dify plus MCP workflow pattern for turning media intake into structured operating records.'
    },
    {
      title: 'Marketplace Creator Pipeline',
      label: 'Review system',
      detail:
        'A Dify-supported marketplace workflow that keeps review context, tool access, and policy boundaries inspectable.'
    }
  ];

  const audienceCards = [
    {
      audience: 'Builders',
      title: 'Ship Dify apps with real tool contracts.',
      detail:
        'Start with MCP server cards, Dify DSL snapshots, smoke checks, and setup steps that a new user can run.'
    },
    {
      audience: 'Operators',
      title: 'Run agents with approval states attached.',
      detail:
        'Policy OS defines what can run, what needs a human, what stops, and what evidence gets recorded.'
    },
    {
      audience: 'Agencies',
      title: 'Package repeatable Dify delivery.',
      detail:
        'Turn proven workflows into templates, plugin candidates, client-safe case studies, and affiliate-ready content.'
    }
  ];

  const funnelSteps = [
    {
      step: 'Learn',
      title: 'Dify plus MCP control plane',
      detail:
        'Explain how Dify becomes the visible agent surface while MCPs carry tool access and Policy OS carries boundaries.',
      href: '/dify/mcp-control-plane'
    },
    {
      step: 'Validate',
      title: 'Agent eval gates',
      detail:
        'Show API health, expected tool use, forbidden tool use, secret refusal, latency, and write confirmation checks.',
      href: '/dify/mcp-control-plane#evals'
    },
    {
      step: 'Publish',
      title: 'Custom-domain content engine',
      detail:
        'Keep canonical Dify articles, disclosures, analytics, and partner handoff on the agency domain while Substack distributes the dispatch.',
      href: '/dify/content-engine'
    },
    {
      step: 'Adopt',
      title: 'Client-safe delivery evidence',
      detail:
        'Route self-serve buyers through disclosed affiliate surfaces after acceptance and route implementation buyers through the partner lane.',
      href: '/dify/mcp-control-plane#adoption'
    }
  ];

  const contentChannelCards = [
    {
      label: 'Canonical',
      title: 'Custom-domain blog and guide pages',
      detail:
        'Own the searchable Dify content cluster, affiliate disclosures, internal links, and lead routing from the CREATE SOMETHING site.',
      href: '/dify/content-engine'
    },
    {
      label: 'Distribution',
      title: 'Substack weekly dispatch',
      detail:
        'Send one short note per canonical piece with one argument, one artifact, and one link back to the agency domain.',
      href: '/dify/content-engine'
    },
    {
      label: 'Milestone',
      title: '20 paid affiliate conversions',
      detail:
        'Use the first 20 paid conversions as the upgrade target while keeping service, reseller, and enterprise leads in the partner lane.',
      href: '/dify/content-engine'
    }
  ];

  const complianceItems = [
    'No official Dify partner or certified provider claim before approval.',
    'No affiliate link replacement until the affiliate application is accepted.',
    'No raw Braintrust traces, private hub records, broad connector surfaces, or credentials in public proof.',
    'No Dify commercial brand asset use in sales collateral without explicit authorization.'
  ];

  const partnerArtifacts = [
    {
      displayName: 'dify_inventory.md',
      name: 'dify_inventory.md',
      summary: 'Codified Dify agents, server cards, manifests, DSL snapshots, and eval references.',
      tag: 'Runtime'
    },
    {
      displayName: 'mcp_coverage.md',
      name: 'mcp_coverage.md',
      summary:
        'Coverage states for ready, intake-ready, brokered, dormant, and missing Dify MCP cards.',
      tag: 'MCP'
    },
    {
      displayName: 'trust_catalog.md',
      name: 'trust_catalog.md',
      summary:
        'Public proof that intentionally excludes raw traces, private hubs, and credential references.',
      tag: 'Proof'
    },
    {
      displayName: 'policy_os.md',
      name: 'policy_os.md',
      summary:
        'The package definition for approvals, runbooks, golden tasks, tuning, and escalation.',
      tag: 'Policy'
    }
  ];

  const ecosystemLanes = [
    {
      name: 'Dify',
      label: 'Agent runtime',
      status: 'Primary live lane',
      detail:
        'Service Partner first, Marketplace Partner as proof, Affiliate as the self-serve acquisition lane.',
      href: '/dify'
    },
    {
      name: 'Cloudflare',
      label: 'Infrastructure runtime',
      status: 'Infrastructure proof lane',
      detail:
        'Workers, Pages, D1, and edge delivery are the substrate for governed MCPs and client review surfaces.',
      href: '/cloudflare'
    },
    {
      name: 'Notion',
      label: 'Operator workspace',
      status: 'Solutions Partner target',
      detail:
        'Consulting Partner first, templates and builders as proof, Technology Partner after a public integration exists.',
      href: '/notion'
    }
  ];
</script>

<SEO
  title="Dify Implementation Lane | CREATE SOMETHING .agency"
  description="CREATE SOMETHING builds Dify-first agent systems with MCP connectivity, Policy OS governance, eval gates, and client-safe evidence."
  keywords="Dify implementation, Dify MCP, Dify partner application, Dify affiliate, Policy OS, AI agent governance"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<section class="hero-page dify-hero">
  <div class="hero-stage">
    <HeroSignalField variant="agency" focus="right" />

    <div class="shell-inner-pad dify-shell hero-layout">
      <div class="hero-copy">
        <BlurFade>
          <span class="product-kicker">Dify Implementation Lane</span>
        </BlurFade>

        <BlurFade delay={0.05}>
          <h1 class="hero-title">Dify-ready agent systems with the policy layer attached.</h1>
        </BlurFade>

        <BlurFade delay={0.1}>
          <p class="hero-detail">
            CREATE SOMETHING packages Dify as the visible agent runtime, MCP as the tool boundary,
            and Policy OS as the approval, runbook, and evidence layer. The current track is to
            apply for Dify Service Partner, Marketplace Partner, and Affiliate participation without
            claiming approval before it exists.
          </p>
        </BlurFade>

        <BlurFade delay={0.15}>
          <div class="hero-actions">
            <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
            <Button href="/partners" variant="secondary">See Partner Stack</Button>
          </div>
        </BlurFade>

        <BlurFade delay={0.18}>
          <p class="hero-note">Build. Validate. Disclose. Convert.</p>
        </BlurFade>
      </div>

      <BlurFade delay={0.2}>
        <aside
          class="dify-brief product-surface product-surface--soft"
          aria-label="Dify implementation summary"
        >
          <div class="dify-brief-header">
            <span class="logo-mark" aria-hidden="true">
              <BrandLogo name="Dify" size={25} />
            </span>
            <div>
              <span>Dify track</span>
              <strong>Partner application plus affiliate funnel</strong>
            </div>
          </div>
          <dl>
            <div>
              <dt>Primary offer</dt>
              <dd>Policy OS</dd>
            </div>
            <div>
              <dt>Primary proof</dt>
              <dd>Inventory, evals, trust catalog</dd>
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
  <div class="shell-inner-pad dify-shell">
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
  <div class="shell-inner-pad dify-shell section-grid">
    <div class="section-copy">
      <span class="product-kicker">Proof Packet</span>
      <h2>Dify is already part of the operating model.</h2>
      <p>
        The partner packet is grounded in repo-owned artifacts: Dify inventory, MCP coverage, public
        trust evidence, DSL snapshots, Infisical references, and Braintrust eval coverage. Public
        materials use sanitized evidence only.
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
  <div class="shell-inner-pad dify-shell">
    <ArtifactSystemStrip
      eyebrow="Partner Evidence"
      title="The proof is artifact-backed, not a pitch deck."
      description="The Dify application can reference generated inventory, coverage, trust, and Policy OS records without exposing private traces or credentials."
      items={partnerArtifacts}
    />
  </div>
</section>

<section class="content-section ecosystem-section">
  <div class="shell-inner-pad dify-shell">
    <div class="section-copy wide">
      <span class="product-kicker">Partner Ecosystem</span>
      <h2>Dify is the agent lane inside a broader partner stack.</h2>
      <p>
        The public posture should keep each vendor role precise: Dify carries the agent surface,
        Cloudflare carries the runtime substrate, and Notion carries the operator workspace.
      </p>
    </div>

    <div class="ecosystem-grid">
      {#each ecosystemLanes as lane}
        <a class="ecosystem-card product-surface" href={lane.href}>
          <span>{lane.label}</span>
          <h3>{lane.name}</h3>
          <strong>{lane.status}</strong>
          <p>{lane.detail}</p>
        </a>
      {/each}
    </div>
  </div>
</section>

<section class="content-section audience-section">
  <div class="shell-inner-pad dify-shell">
    <div class="section-copy wide">
      <span class="product-kicker">Funnel Shape</span>
      <h2>One Dify route for three high-intent audiences.</h2>
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

<section class="content-section funnel-section">
  <div class="shell-inner-pad dify-shell section-grid reverse">
    <div class="funnel-list">
      {#each funnelSteps as item}
        <a class="funnel-step product-surface product-surface--soft" href={item.href}>
          <span>{item.step}</span>
          <div>
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
          </div>
        </a>
      {/each}
    </div>

    <div class="section-copy">
      <span class="product-kicker">Affiliate Lane</span>
      <h2>Self-serve adoption stays separate from partner deals.</h2>
      <p>
        Current Dify links are direct reference links. After acceptance, approved affiliate links
        can be added with disclosures on declared domains and channels. Implementation, reseller,
        enterprise, and co-sell opportunities stay in the partner lane.
      </p>
      <div class="external-actions">
        <Button href="https://dify.ai/partner" variant="secondary">Partner Program</Button>
        <Button href="https://dify.ai/affiliate-program" variant="secondary"
          >Affiliate Program</Button
        >
      </div>
    </div>
  </div>
</section>

<section class="content-section channel-section">
  <div class="shell-inner-pad dify-shell">
    <div class="section-copy wide">
      <span class="product-kicker">Content Channel</span>
      <h2>The affiliate funnel starts on the custom domain.</h2>
      <p>
        The recommended channel split is now repo-backed: publish canonical Dify guides on the
        agency domain, use Substack for dispatch, and keep every approved affiliate link tied to a
        declared surface and ledger row.
      </p>
    </div>

    <div class="channel-grid">
      {#each contentChannelCards as card}
        <a class="channel-card product-surface product-surface--soft" href={card.href}>
          <span>{card.label}</span>
          <h3>{card.title}</h3>
          <p>{card.detail}</p>
        </a>
      {/each}
    </div>
  </div>
</section>

<section class="content-section compliance-section">
  <div class="shell-inner-pad dify-shell compliance-layout">
    <div class="section-copy">
      <span class="product-kicker">Compliance</span>
      <h2>The public posture is intentionally conservative.</h2>
      <p>
        The goal is to make CREATE SOMETHING ready for Dify approval without implying endorsement,
        certification, or undisclosed affiliate economics.
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
  <div class="shell-inner-pad dify-shell">
    <div class="product-surface product-surface--accent cta-layout">
      <div>
        <span class="product-kicker">Next Step</span>
        <h2>Map the first Dify plus MCP workflow.</h2>
        <p>
          Bring the workflow, source systems, and approval owner. CREATE SOMETHING will map the Dify
          surface, MCP contracts, policy states, and evidence needed for a partner-grade delivery.
        </p>
      </div>
      <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
    </div>
  </div>
</section>

<style>
  .dify-shell {
    width: min(1180px, 100%);
    margin: 0 auto;
  }

  .dify-hero {
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

  .dify-hero :global(.hero-signal-field) {
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

  .dify-hero .hero-copy {
    display: grid;
    gap: 1.1rem;
    max-width: 47rem;
  }

  .dify-hero .hero-copy .product-kicker {
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

  .dify-hero .hero-copy .product-kicker::before {
    width: 0.38rem;
    height: 0.38rem;
    background: rgba(59, 109, 255, 0.96);
    box-shadow: 0 0 14px rgba(70, 154, 255, 0.38);
  }

  .dify-hero .hero-title {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: clamp(3rem, 5vw + 1rem, 5.35rem);
    line-height: 0.98;
    letter-spacing: 0;
    text-wrap: balance;
  }

  .dify-hero .hero-detail {
    margin: 0;
    max-width: 38rem;
    color: var(--color-fg-secondary);
    font-size: clamp(1.02rem, 1vw + 0.9rem, 1.18rem);
    line-height: 1.72;
    text-wrap: pretty;
  }

  .dify-hero .hero-actions {
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

  .dify-brief {
    display: grid;
    gap: 1.15rem;
    padding: clamp(1.2rem, 3vw, 1.7rem);
  }

  .dify-brief-header {
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

  .dify-brief span,
  .dify-brief dt,
  .status-card span,
  .proof-card span,
  .audience-card span,
  .funnel-step span,
  .ecosystem-card span,
  .channel-card span {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .dify-brief strong {
    display: block;
    margin-top: 0.25rem;
    color: var(--color-fg-primary);
    font-size: 1.08rem;
    line-height: 1.25;
  }

  .dify-brief dl {
    display: grid;
    gap: 0.85rem;
    margin: 0;
  }

  .dify-brief dl div {
    display: grid;
    gap: 0.2rem;
    padding-top: 0.85rem;
    border-top: 1px solid var(--color-shell-border-default);
  }

  .dify-brief dd {
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
  .funnel-step h3,
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
  .funnel-step p,
  .ecosystem-card p,
  .channel-card p,
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
  .ecosystem-grid,
  .channel-grid {
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

  .channel-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .ecosystem-card,
  .channel-card {
    color: inherit;
    text-decoration: none;
    transition:
      border-color 160ms ease,
      background 160ms ease,
      transform 160ms ease;
  }

  .ecosystem-card:hover,
  .channel-card:hover {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.055);
    transform: translateY(-2px);
  }

  .ecosystem-card strong {
    color: var(--color-fg-primary);
    font-size: 0.95rem;
    line-height: 1.35;
  }

  .proof-card h3,
  .audience-card h3,
  .funnel-step h3,
  .ecosystem-card h3,
  .channel-card h3 {
    font-size: clamp(1.05rem, 1.5vw, 1.35rem);
  }

  .channel-card {
    min-height: 13rem;
    display: grid;
    align-content: start;
    gap: 0.7rem;
    padding: clamp(1rem, 2.4vw, 1.3rem);
  }

  .funnel-list {
    display: grid;
    gap: 1rem;
  }

  .funnel-step {
    display: grid;
    grid-template-columns: 6rem minmax(0, 1fr);
    gap: 1rem;
    padding: 1.1rem;
    color: inherit;
    text-decoration: none;
    transition:
      border-color 160ms ease,
      background 160ms ease,
      transform 160ms ease;
  }

  .funnel-step:hover {
    border-color: var(--color-shell-border-strong);
    background: var(--color-shell-surface-hover);
    transform: translateY(-1px);
  }

  .external-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.6rem;
  }

  .compliance-list {
    display: grid;
    gap: 0.85rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .compliance-list li {
    padding: 1rem 1rem 1rem 1.15rem;
    color: var(--color-fg-secondary);
    line-height: 1.58;
  }

  .compliance-list li::before {
    content: '';
    position: absolute;
    top: 1rem;
    bottom: 1rem;
    left: 0;
    width: 3px;
    border-radius: 999px;
    background: var(--color-brand-primary);
  }

  .cta-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: clamp(1.4rem, 4vw, 3rem);
    align-items: center;
    padding: clamp(1.35rem, 3vw, 2rem);
  }

  .cta-layout div {
    display: grid;
    gap: 0.75rem;
    max-width: 44rem;
  }

  @media (max-width: 980px) {
    .hero-layout,
    .section-grid,
    .section-grid.reverse,
    .compliance-layout,
    .cta-layout {
      grid-template-columns: 1fr;
    }

    .status-grid,
    .audience-grid,
    .ecosystem-grid,
    .channel-grid {
      grid-template-columns: 1fr;
    }

    .status-card {
      min-height: auto;
    }

    .cta-layout {
      justify-items: start;
    }
  }

  @media (max-width: 680px) {
    .dify-hero {
      padding-top: clamp(2.25rem, 9vw, 3.25rem);
      padding-bottom: clamp(1.75rem, 8vw, 3rem);
    }

    .hero-stage {
      min-height: clamp(28rem, 104vw, 37rem);
    }

    .dify-hero :global(.hero-signal-field) {
      inset: 0 -2.5rem -2rem -1rem;
    }

    .hero-layout {
      padding-top: 1rem;
      padding-bottom: 2.75rem;
    }

    .dify-hero .hero-copy {
      gap: 0.9rem;
    }

    .dify-hero .hero-title {
      font-size: clamp(2.35rem, 11vw, 3.25rem);
      line-height: 1.02;
    }

    .dify-hero .hero-detail {
      font-size: 0.94rem;
      line-height: 1.58;
    }

    .dify-hero .hero-actions {
      gap: 0.55rem;
    }

    .dify-brief {
      display: none;
    }

    .proof-grid,
    .audience-grid {
      grid-template-columns: 1fr;
    }

    .proof-card,
    .audience-card,
    .channel-card {
      min-height: auto;
    }

    .funnel-step {
      grid-template-columns: 1fr;
    }
  }
</style>
