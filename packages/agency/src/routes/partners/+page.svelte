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
      logo: 'Cloudflare Workers',
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
      summary: 'One narrative tying Dify, Cloudflare, and Notion to the same governed workflow system.',
      tag: 'Strategy'
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
    }
  ];

  const guardrails = [
    'No official partner, certified provider, reseller, or technology alliance claim before acceptance.',
    'No vendor commercial brand use in sales collateral unless the relevant program authorizes it.',
    'No raw traces, secrets, private hub details, client records, billing details, or broad connector surfaces in public proof.',
    'No affiliate links until acceptance, disclosure language, declared domains, and payment/tax setup are complete.'
  ];
</script>

<SEO
  title="Partner Stack | Dify, Cloudflare, and Notion"
  description="CREATE SOMETHING's partner stack for governed AI workflow systems: Dify for agent surfaces, Cloudflare for runtime, and Notion for operator workspaces."
  keywords="Dify partner, Cloudflare partner, Notion partner, AI workflow systems, partner stack, Policy OS, MCP governance"
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
            operator workspace. CREATE SOMETHING owns the policy artifacts, MCP boundaries,
            delivery runbooks, and evidence that make the combined system credible.
          </p>
        </BlurFade>

        <BlurFade delay={0.15}>
          <div class="hero-actions">
            <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
            <Button href="/stack" variant="secondary">See Stack Boundary</Button>
          </div>
        </BlurFade>
      </div>

      <BlurFade delay={0.2}>
        <aside class="partner-brief product-surface product-surface--soft" aria-label="Partner stack summary">
          <div>
            <span>Public claim</span>
            <strong>Application-ready implementation lanes</strong>
          </div>
          <div>
            <span>Lead offer</span>
            <strong>Policy OS plus governed delivery</strong>
          </div>
          <div>
            <span>Approval posture</span>
            <strong>No official partner claims yet</strong>
          </div>
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
        rgba(3, 3, 4, 0.88) 10%,
        rgba(3, 3, 4, 0.24) 30%,
        rgba(3, 3, 4, 0.2) 70%,
        rgba(3, 3, 4, 0.9) 100%
      ),
      linear-gradient(
        90deg,
        rgba(3, 3, 4, 0.98) 0%,
        rgba(3, 3, 4, 0.88) 42%,
        rgba(3, 3, 4, 0.52) 74%,
        rgba(3, 3, 4, 0.76) 100%
      );
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

  .partner-brief {
    display: grid;
    gap: 0.85rem;
    padding: clamp(1.15rem, 3vw, 1.6rem);
  }

  .partner-brief div {
    display: grid;
    gap: 0.35rem;
    padding: 1rem;
    border-radius: 0.75rem;
    border: 1px solid var(--color-shell-border-default);
    background: rgba(255, 255, 255, 0.03);
  }

  .partner-brief span,
  .status-card span,
  .lane-card span,
  .lane-card dt,
  .loop-step span {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .partner-brief strong {
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.9rem;
  }

  .status-card,
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

  .status-card h2,
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
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

  .guardrail-list {
    display: grid;
    gap: 0.75rem;
    padding: 0;
    margin: 0;
    list-style: none;
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

  @media (max-width: 980px) {
    .hero-layout,
    .section-grid,
    .section-grid.reverse,
    .compliance-layout {
      grid-template-columns: 1fr;
    }

    .status-grid,
    .lane-grid,
    .routing-grid {
      grid-template-columns: 1fr;
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
    .lane-card,
    .routing-card,
    .guardrail-list li,
    .cta-layout {
      padding: 1rem;
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
