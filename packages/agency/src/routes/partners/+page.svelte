<script lang="ts">
  import { Button, HeroSignalField, SEO } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';
  import ArtifactSystemStrip from '$lib/components/ArtifactSystemStrip.svelte';
  import BrandLogo from '$lib/components/BrandLogo.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const statusItems = [
    {
      label: 'Primary application',
      value: 'Dify Service Partner',
      detail: 'Lead with implementation, training, support, MCP setup, and Policy OS governance.'
    },
    {
      label: 'Runtime application',
      value: 'Cloudflare PowerUP Consult',
      detail: 'Frame Workers, Pages, D1, and remote MCP surfaces as the governed delivery substrate.'
    },
    {
      label: 'Workspace application',
      value: 'Notion Solutions Partner',
      detail: 'Position Notion as the operator workspace, PM layer, and template distribution proof.'
    },
    {
      label: 'Ecosystem readiness',
      value: 'OpenAI readiness lane',
      detail: 'Use OpenAI as reasoning and agent-host proof, not as an unsupported affiliate claim.'
    }
  ];

  const applicationQueue = [
    {
      name: 'Dify',
      track: 'Service Partner first',
      status: 'Primary submission',
      href: '/dify',
      detail:
        'Use the Dify lane as the main proof page for implementation, Marketplace Partner readiness, and the affiliate funnel after acceptance.'
    },
    {
      name: 'Cloudflare',
      track: 'PowerUP Consult first',
      status: 'Runtime submission',
      href: '/cloudflare',
      detail:
        'Use the Cloudflare lane to show Workers, Pages, D1, remote MCPs, runbooks, and governed delivery evidence.'
    },
    {
      name: 'Notion',
      track: 'Solutions Partner first',
      status: 'Workspace submission',
      href: '/notion',
      detail:
        'Use the Notion lane to show PM/operator workspaces, template proof, builder examples, and source-of-truth boundaries.'
    },
    {
      name: 'OpenAI',
      track: 'Readiness lane only',
      status: 'Do not overclaim',
      href: '/stack',
      detail:
        'Use the stack boundary to show OpenAI-ready MCP, Agents SDK, ChatGPT compatibility, evals, and Policy OS proof.'
    }
  ];

  const partnerLanes = [
    {
      name: 'Dify',
      label: 'Agent runtime',
      logo: 'Dify',
      href: '/dify',
      lead: 'Service Partner first',
      support: 'Marketplace Partner and affiliate lane after acceptance',
      detail:
        'Dify carries visible agent workflows, app templates, server cards, eval gates, and self-serve adoption content.'
    },
    {
      name: 'Cloudflare',
      label: 'Runtime substrate',
      logo: 'Cloudflare',
      href: '/cloudflare',
      lead: 'PowerUP Consult first',
      support: 'Self-Serve Agency when account volume justifies it',
      detail:
        'Cloudflare carries deployable Workers, Pages, D1, queues, remote MCP endpoints, and rollback-ready delivery surfaces.'
    },
    {
      name: 'Notion',
      label: 'Operator workspace',
      logo: 'Notion',
      href: '/notion',
      lead: 'Solutions Partner first',
      support: 'Templates and builders as proof; Technology Partner later',
      detail:
        'Notion carries PM visibility, client-readable evidence, template systems, human review, and operating dashboards.'
    },
    {
      name: 'OpenAI',
      label: 'Reasoning host',
      logo: 'OpenAI',
      href: '/stack',
      lead: 'Ecosystem readiness',
      support: 'Startup, portal, or research paths only when eligible',
      detail:
        'OpenAI carries reasoning and agent-host proof while CREATE SOMETHING owns scoped tools, approvals, evals, and policy boundaries.'
    }
  ];

  const operatingLoop = [
    {
      step: '01',
      title: 'Apply with one story',
      detail:
        'CREATE SOMETHING builds governed AI workflow systems: agent surface, runtime substrate, operator workspace, and policy artifacts.'
    },
    {
      step: '02',
      title: 'Route each lead correctly',
      detail:
        'Self-serve buyers use disclosed affiliate or marketplace paths only after approval. Implementation, reseller, and co-sell buyers stay in partner lanes.'
    },
    {
      step: '03',
      title: 'Publish sanitized proof',
      detail:
        'Use generated inventories, public trust catalogs, screenshots, diagrams, templates, and setup steps without exposing raw traces or client-private records.'
    },
    {
      step: '04',
      title: 'Convert delivery into distribution',
      detail:
        'Turn repeated builds into Dify templates, Notion templates, Cloudflare runbooks, and reusable MCP cards once the workflow is proven.'
    }
  ];

  const partnerArtifacts = [
    {
      displayName: 'partner_stack_packet.md',
      name: 'partner_stack_packet.md',
      summary: 'One narrative tying Dify, Cloudflare, Notion, and OpenAI to the same governed workflow system.',
      tag: 'Strategy'
    },
    {
      displayName: 'surface_review_2026_05_17.md',
      name: 'surface_review_2026_05_17.md',
      summary: 'Current review of partner, affiliate, MCP, agent, policy, and public-page alignment.',
      tag: 'Review'
    },
    {
      displayName: 'application_drafts.md',
      name: 'application_drafts.md',
      summary: 'Program-specific copy with conservative claims and sanitized implementation proof.',
      tag: 'Apply'
    },
    {
      displayName: 'lead_routing_rules.md',
      name: 'lead_routing_rules.md',
      summary: 'Rules separating affiliate, marketplace, partner, reseller, and client delivery opportunities.',
      tag: 'Route'
    },
    {
      displayName: 'proof_inventory.md',
      name: 'proof_inventory.md',
      summary: 'Public-safe evidence, case studies, templates, screenshots, runbooks, and validation commands.',
      tag: 'Proof'
    },
    {
      displayName: 'brand_guardrails.md',
      name: 'brand_guardrails.md',
      summary: 'Claim language, logo usage, disclosure, and no-implied-endorsement rules before approvals.',
      tag: 'Guard'
    },
    {
      displayName: 'openai_readiness.md',
      name: 'openai_readiness.md',
      summary: 'OpenAI ecosystem proof without unsupported affiliate, reseller, or Frontier Alliance claims.',
      tag: 'OpenAI'
    }
  ];

  const routingRules = [
    {
      title: 'Affiliate leads',
      detail:
        'Use only after acceptance, with disclosures, declared surfaces, and no duplicate compensation on partner-led transactions.'
    },
    {
      title: 'Partner and co-sell leads',
      detail:
        'Route implementation, enterprise, reseller, managed service, and training opportunities through the relevant partner track.'
    },
    {
      title: 'Marketplace distribution',
      detail:
        'Publish free or approved assets only when setup steps, privacy notes, support contacts, and no-credential checks are complete.'
    },
    {
      title: 'Client delivery proof',
      detail:
        'Use sanitized diagrams, generated catalogs, evaluation summaries, and public screenshots instead of raw traces or private workspace records.'
    },
    {
      title: 'OpenAI readiness',
      detail:
        'Use OpenAI as reasoning and agent-host proof. Do not route it as affiliate or reseller work unless OpenAI grants that program participation.'
    }
  ];

  const guardrails = [
    'No official partner, certified provider, reseller, or technology alliance claim before acceptance.',
    'No vendor commercial brand use in sales collateral unless the relevant program authorizes it.',
    'No raw traces, secrets, private hub details, client records, billing details, or broad connector surfaces in public proof.',
    'No affiliate links until acceptance, disclosure language, declared domains, and payment/tax setup are complete.',
    'No OpenAI affiliate, reseller, or Frontier Alliance claim without explicit OpenAI authorization.'
  ];
</script>

<SEO
  title="Partner Stack | CREATE SOMETHING .agency"
  description="CREATE SOMETHING's partner stack for governed AI workflow systems: Dify for agent surfaces, Cloudflare for runtime, Notion for operator workspaces, and OpenAI as reasoning-host readiness."
  keywords="Dify partner, Cloudflare partner, Notion partner, OpenAI readiness, AI workflow systems, partner stack, Policy OS, MCP governance"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<section class="hero-page partners-hero">
  <div class="hero-stage">
    <HeroSignalField variant="agency" focus="right" />

    <div class="shell-inner-pad partners-shell hero-layout">
      <div class="hero-copy">
        <BlurFade>
          <span class="product-kicker">Partner Stack</span>
        </BlurFade>

        <BlurFade delay={0.05}>
          <h1 class="hero-title">One partner story for governed AI workflow systems.</h1>
        </BlurFade>

        <BlurFade delay={0.1}>
          <p class="hero-detail">
            Dify is the agent surface, Cloudflare is the runtime substrate, and Notion is the
            operator workspace. OpenAI is the reasoning-host readiness lane. CREATE SOMETHING owns
            the policy artifacts, MCP boundaries, delivery runbooks, and evidence that make the
            combined system credible.
          </p>
        </BlurFade>

        <BlurFade delay={0.15}>
          <div class="hero-actions">
            <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
            <Button href="/stack" variant="secondary">See Stack Boundary</Button>
          </div>
        </BlurFade>

        <BlurFade delay={0.18}>
          <p class="hero-note">Apply. Route. Prove. Govern.</p>
        </BlurFade>
      </div>

      <BlurFade delay={0.2}>
        <aside class="partner-brief product-surface product-surface--soft" aria-label="Partner stack summary">
          <div class="partner-brief__header">
            <div class="partner-logo-stack" aria-hidden="true">
              <span><BrandLogo name="Dify" size={22} /></span>
              <span><BrandLogo name="Cloudflare" size={22} /></span>
              <span><BrandLogo name="Notion" size={22} /></span>
              <span><BrandLogo name="OpenAI" size={22} /></span>
            </div>
            <div>
              <span>Partner stack</span>
              <strong>Dify + Cloudflare + Notion + OpenAI</strong>
            </div>
          </div>

          <dl class="partner-brief__facts">
            <div>
              <dt>Public claim</dt>
              <dd>Application-ready lanes plus ecosystem readiness</dd>
            </div>
            <div>
              <dt>Lead offer</dt>
              <dd>Policy OS plus governed delivery</dd>
            </div>
            <div>
              <dt>Approval posture</dt>
              <dd>No official partner claims yet</dd>
            </div>
          </dl>
        </aside>
      </BlurFade>
    </div>
  </div>
</section>

<section class="status-band">
  <div class="shell-inner-pad partners-shell">
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

<section class="content-section application-section">
  <div class="shell-inner-pad partners-shell">
    <div class="section-copy wide">
      <span class="product-kicker">Application Queue</span>
      <h2>The recommended order stays visible.</h2>
      <p>
        Each lane has a public page, a lead partner track, and a proof boundary. The queue keeps the
        application motion legible without implying approval before the programs accept CREATE
        SOMETHING.
      </p>
    </div>

    <div class="application-grid">
      {#each applicationQueue as item}
        <a class="application-card product-surface product-surface--soft" href={item.href}>
          <span>{item.name}</span>
          <h3>{item.track}</h3>
          <strong>{item.status}</strong>
          <p>{item.detail}</p>
        </a>
      {/each}
    </div>
  </div>
</section>

<section class="content-section lane-section">
  <div class="shell-inner-pad partners-shell">
    <div class="section-copy wide">
      <span class="product-kicker">Application Lanes</span>
      <h2>Each vendor has a different job in the same operating system.</h2>
      <p>
        The strongest application posture is not a list of tools. It is a clear system boundary:
        what the vendor provides, what CREATE SOMETHING adds, what stays portable, and how buyer
        leads are routed.
      </p>
    </div>

    <div class="lane-grid">
      {#each partnerLanes as lane}
        <a class="lane-card product-surface" href={lane.href}>
          <div class="lane-card__header">
            <span class="lane-card__logo" aria-hidden="true">
              <BrandLogo name={lane.logo} size={26} />
            </span>
            <div>
              <span>{lane.label}</span>
              <h3>{lane.name}</h3>
            </div>
          </div>
          <dl>
            <div>
              <dt>Lead track</dt>
              <dd>{lane.lead}</dd>
            </div>
            <div>
              <dt>Support track</dt>
              <dd>{lane.support}</dd>
            </div>
          </dl>
          <p>{lane.detail}</p>
        </a>
      {/each}
    </div>
  </div>
</section>

<section class="content-section loop-section">
  <div class="shell-inner-pad partners-shell section-grid">
    <div class="section-copy">
      <span class="product-kicker">Operating Motion</span>
      <h2>Partner credibility comes from repeatable delivery, not a badge.</h2>
      <p>
        The recommended path is to apply with the strongest current evidence, then keep converting
        delivery work into reusable partner assets without crossing claim, brand, or compensation
        boundaries.
      </p>
    </div>

    <div class="loop-list">
      {#each operatingLoop as item}
        <article class="loop-step product-surface product-surface--soft">
          <span>{item.step}</span>
          <div>
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="content-section artifact-section">
  <div class="shell-inner-pad partners-shell">
    <ArtifactSystemStrip
      eyebrow="Partner Evidence"
      title="The applications should point to durable artifacts."
      description="The public story stays simple while the repo carries the application packets, lead-routing rules, proof inventory, and brand guardrails."
      items={partnerArtifacts}
    />
  </div>
</section>

<section class="content-section routing-section">
  <div class="shell-inner-pad partners-shell section-grid reverse">
    <div class="routing-grid" role="list">
      {#each routingRules as rule}
        <article class="routing-card product-surface" role="listitem">
          <h3>{rule.title}</h3>
          <p>{rule.detail}</p>
        </article>
      {/each}
    </div>

    <div class="section-copy">
      <span class="product-kicker">Lead Routing</span>
      <h2>The partner stack needs one compensation rule.</h2>
      <p>
        A self-serve signup, a marketplace install, a partner-led enterprise conversation, and a
        paid implementation are different motions. Keeping them separate protects program
        compliance and makes reporting cleaner.
      </p>
    </div>
  </div>
</section>

<section class="content-section compliance-section">
  <div class="shell-inner-pad partners-shell compliance-layout">
    <div class="section-copy">
      <span class="product-kicker">Guardrails</span>
      <h2>Application-ready does not mean approved.</h2>
      <p>
        The site can show implementation readiness and program intent. It should not imply partner
        approval, commercial brand authorization, certification, or affiliate economics before the
        relevant vendor accepts the application.
      </p>
    </div>

    <ul class="guardrail-list">
      {#each guardrails as item}
        <li class="product-surface product-surface--soft">{item}</li>
      {/each}
    </ul>
  </div>
</section>

<section class="content-section cta-section">
  <div class="shell-inner-pad partners-shell">
    <div class="product-surface product-surface--accent cta-layout">
      <div>
        <span class="product-kicker">Next Step</span>
        <h2>Map the first partner-grade workflow.</h2>
        <p>
          Bring one workflow, its source systems, and the approval owner. CREATE SOMETHING will map
          the Dify surface, Cloudflare runtime, Notion workspace, MCP contracts, and proof packet.
        </p>
      </div>
      <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
    </div>
  </div>
</section>

<style>
  .partners-shell {
    width: min(1180px, 100%);
    margin: 0 auto;
  }

  .partners-hero {
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

  .partners-hero :global(.hero-signal-field) {
    inset: -2rem -4rem -3rem -2rem;
  }

  .hero-layout {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(18rem, 0.74fr);
    gap: clamp(2rem, 5vw, 5rem);
    align-items: center;
    padding-top: clamp(2rem, 4vw, 3rem);
    padding-bottom: clamp(3rem, 6vw, 4.5rem);
  }

  .hero-copy {
    display: grid;
    gap: 1.1rem;
    max-width: 47rem;
  }

  .hero-copy .product-kicker {
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
    width: 0.38rem;
    height: 0.38rem;
    background: rgba(59, 109, 255, 0.96);
    box-shadow: 0 0 14px rgba(70, 154, 255, 0.38);
  }

  .hero-title {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: clamp(3rem, 5vw + 1rem, 5.35rem);
    line-height: 0.98;
    letter-spacing: 0;
    text-wrap: balance;
  }

  .hero-detail {
    margin: 0;
    max-width: 39rem;
    color: var(--color-fg-secondary);
    font-size: clamp(1.02rem, 1vw + 0.9rem, 1.18rem);
    line-height: 1.72;
    text-wrap: pretty;
  }

  .hero-actions {
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

  .partner-brief {
    display: grid;
    gap: 1rem;
    padding: clamp(1.15rem, 3vw, 1.6rem);
  }

  .partner-brief__header {
    display: grid;
    gap: 0.9rem;
    padding: 1rem;
    border-radius: 0.75rem;
    border: 1px solid var(--color-shell-border-default);
    background: rgba(255, 255, 255, 0.03);
  }

  .partner-logo-stack {
    display: flex;
    align-items: center;
  }

  .partner-logo-stack span {
    display: inline-grid;
    place-items: center;
    width: 2.6rem;
    height: 2.6rem;
    border-radius: 0.85rem;
    border: 1px solid var(--color-shell-border-default);
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-fg-primary);
  }

  .partner-logo-stack span + span {
    margin-left: -0.45rem;
  }

  .partner-brief__header > div:last-child,
  .partner-brief__facts div {
    display: grid;
    gap: 0.35rem;
  }

  .partner-brief__facts {
    display: grid;
    gap: 0.85rem;
    margin: 0;
  }

  .partner-brief__facts div {
    padding: 1rem;
    border-radius: 0.75rem;
    border: 1px solid var(--color-shell-border-default);
    background: rgba(255, 255, 255, 0.03);
  }

  .partner-brief span,
  .partner-brief dt,
  .status-card span,
  .application-card span,
  .lane-card span,
  .lane-card dt,
  .loop-step span {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .partner-brief strong,
  .partner-brief dd {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: 1.05rem;
    line-height: 1.3;
  }

  .status-band,
  .content-section {
    padding-top: clamp(1.25rem, 3vw, 2rem);
    padding-bottom: clamp(3.5rem, 6vw, 5rem);
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.9rem;
  }

  .application-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.9rem;
  }

  .status-card,
  .application-card,
  .lane-card,
  .routing-card {
    min-height: 13rem;
    display: grid;
    align-content: start;
    gap: 0.8rem;
    padding: clamp(1rem, 2.4vw, 1.35rem);
  }

  .lane-card {
    text-decoration: none;
  }

  .application-card {
    text-decoration: none;
  }

  .status-card h2,
  .application-card h3,
  .lane-card h3,
  .routing-card h3,
  .loop-step h3,
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
  .application-card p,
  .lane-card p,
  .routing-card p,
  .loop-step p,
  .section-copy p,
  .cta-layout p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.68;
    text-wrap: pretty;
  }

  .application-card strong {
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    line-height: 1.4;
  }

  .section-copy {
    display: grid;
    gap: 0.8rem;
    align-content: start;
    max-width: 43rem;
  }

  .section-copy.wide {
    max-width: 54rem;
    margin-bottom: 1.25rem;
  }

  .section-copy h2 {
    font-size: clamp(2rem, 4vw, 3.35rem);
  }

  .lane-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.9rem;
  }

  .lane-card__header {
    display: flex;
    gap: 0.85rem;
    align-items: center;
  }

  .lane-card__logo {
    display: inline-grid;
    place-items: center;
    flex: 0 0 auto;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 0.9rem;
    border: 1px solid var(--color-shell-border-default);
    background: rgba(255, 255, 255, 0.04);
  }

  .lane-card dl {
    display: grid;
    gap: 0.75rem;
    margin: 0;
  }

  .lane-card dl div {
    display: grid;
    gap: 0.25rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-shell-border-default);
  }

  .lane-card dd {
    margin: 0;
    color: var(--color-fg-primary);
    line-height: 1.45;
  }

  .section-grid,
  .compliance-layout {
    display: grid;
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
    gap: clamp(2rem, 5vw, 4.5rem);
    align-items: start;
  }

  .section-grid.reverse {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  }

  .loop-list {
    display: grid;
    gap: 0.75rem;
  }

  .loop-step {
    display: grid;
    grid-template-columns: 3.2rem minmax(0, 1fr);
    gap: 0.9rem;
    padding: 1rem;
  }

  .loop-step span {
    color: var(--color-fg-primary);
  }

  .routing-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.9rem;
  }

  .routing-card {
    min-height: 12rem;
  }

  .routing-card:last-child:nth-child(odd) {
    grid-column: 1 / -1;
    min-height: 10.5rem;
  }

  .guardrail-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .guardrail-list li:first-child {
    grid-column: 1 / -1;
  }

  .guardrail-list li {
    padding: 1rem;
    color: var(--color-fg-secondary);
    line-height: 1.6;
  }

  .cta-layout {
    display: flex;
    gap: 1.5rem;
    align-items: center;
    justify-content: space-between;
    padding: clamp(1.25rem, 3vw, 1.75rem);
  }

  .cta-layout > div {
    display: grid;
    gap: 0.65rem;
    max-width: 45rem;
  }

  @media (max-width: 1180px) {
    .status-grid,
    .application-grid,
    .lane-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 980px) {
    .hero-layout,
    .section-grid,
    .section-grid.reverse,
    .compliance-layout {
      grid-template-columns: 1fr;
    }

    .routing-grid {
      grid-template-columns: 1fr;
    }

    .guardrail-list {
      grid-template-columns: 1fr;
    }

    .guardrail-list li:first-child {
      grid-column: auto;
    }

    .partner-brief {
      max-width: 100%;
    }
  }

  @media (max-width: 640px) {
    .partners-hero {
      padding-top: 4.25rem;
    }

    .hero-stage {
      min-height: auto;
    }

    .partners-hero :global(.hero-signal-field) {
      inset: 0 -2.5rem -2rem -1rem;
    }

    .hero-layout {
      padding-top: 1rem;
      padding-bottom: 2.75rem;
    }

    .hero-title {
      font-size: clamp(2.55rem, 10vw, 4rem);
    }

    .partner-brief,
    .status-card,
    .application-card,
    .lane-card,
    .routing-card,
    .guardrail-list li,
    .cta-layout {
      padding: 1rem;
    }

    .status-grid,
    .application-grid,
    .lane-grid {
      grid-template-columns: 1fr;
    }

    .loop-step {
      grid-template-columns: 1fr;
    }

    .cta-layout {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
