<script lang="ts">
  import { Button, HeroSignalField, SEO } from '@create-something/canon';
  import { BlurFade } from '@create-something/canon/magicui';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  const channelRoles = [
    {
      label: 'Canonical',
      title: 'Custom-domain content cluster',
      detail:
        'Long-form Dify guides, internal links, disclosures, analytics, partner handoff, and self-serve affiliate routing live on the CREATE SOMETHING site.'
    },
    {
      label: 'Distribution',
      title: 'Substack dispatches',
      detail:
        'Weekly notes summarize one idea, point back to the canonical page, collect replies, and build the subscriber list.'
    },
    {
      label: 'Discovery',
      title: 'Social and video clips',
      detail:
        'Native snippets and demos create reach, but the measurable conversion path still resolves to the canonical page.'
    }
  ];

  const targets = [
    {
      horizon: '30 days',
      content: '4 canonical posts',
      audience: '100-200 subscribers',
      conversion: '1-2 paid conversions'
    },
    {
      horizon: '90 days',
      content: '8-12 canonical posts',
      audience: '300-500 subscribers',
      conversion: '4-6 paid conversions'
    },
    {
      horizon: '6 months',
      content: '2,500-5,000 visits/month',
      audience: '750-1,500 subscribers',
      conversion: '20 paid conversions'
    },
    {
      horizon: '12 months',
      content: '6,000-10,000 visits/month',
      audience: '2,000-3,500 subscribers',
      conversion: '50 paid conversions'
    }
  ];

  const contentCluster = [
    {
      title: 'Dify + MCP Control Plane',
      audience: 'Builders',
      cta: '/dify/mcp-control-plane',
      dispatch: 'Dify is the surface. MCP is the boundary.'
    },
    {
      title: 'Dify Agent Eval Gates',
      audience: 'Operators',
      cta: '/book',
      dispatch: 'The evals that make Dify safer to operate.'
    },
    {
      title: 'How To Ship A Dify App With MCP Tools',
      audience: 'Agencies',
      cta: '/book',
      dispatch: 'A practical shipping checklist for Dify plus MCP.'
    },
    {
      title: 'Client-Safe Dify Delivery Evidence',
      audience: 'Client buyers',
      cta: '/dify',
      dispatch: 'What proof can be public without leaking traces.'
    },
    {
      title: 'Dify Template Marketplace Workflow',
      audience: 'Marketplace builders',
      cta: '/partners',
      dispatch: 'Turn a Dify workflow into a reusable asset.'
    },
    {
      title: 'Dify vs n8n: Workflow Automation vs Agent Apps',
      audience: 'Operators',
      cta: '/dify/n8n-vs-dify',
      dispatch: 'The job changed: n8n for workflows, Dify for agent apps.'
    },
    {
      title: 'Dify Affiliate Starter Kit For Agencies',
      audience: 'Consultants',
      cta: '/book',
      dispatch: 'How agencies should route self-serve Dify leads.'
    }
  ];

  const economics = [
    {
      label: '20 paid conversions',
      detail: 'Upgrade milestone',
      value: '$534/mo',
      note: '70% Professional and 30% Team at the starting 30% rate.'
    },
    {
      label: '50 paid conversions',
      detail: 'First scaled target',
      value: '$1,869/mo',
      note: 'First 20 at 30%, next 30 at 50%, same plan mix.'
    },
    {
      label: '100 paid conversions',
      detail: 'Mature run rate',
      value: '$4,094/mo',
      note: 'First 20 at 30%, next 80 at 50%, same plan mix.'
    }
  ];

  const operatingLoop = [
    'Publish or update the custom-domain page first.',
    'Add internal links from the Dify and partner pages.',
    'Keep Dify links direct until affiliate acceptance exists.',
    'Send a short Substack dispatch back to the canonical page.',
    'Log the URL, audience, disclosure, link type, and campaign in the ledger.',
    'Record visits, clicks, affiliate clicks, conversions, and service leads in Linear.'
  ];
</script>

<SEO
  title="Dify Affiliate Content Engine | CREATE SOMETHING .agency"
  description="CREATE SOMETHING uses a custom-domain-first Dify content engine with Substack distribution for disclosed affiliate acquisition and partner-safe lead routing."
  keywords="Dify affiliate content, Dify Substack, Dify blog strategy, Dify partner funnel, Dify MCP content"
  canonical="https://createsomething.agency/dify/content-engine"
  ogType="article"
  ogImage="/og-image.svg"
  articleSection="Dify Affiliate Content"
  articleTags={['Dify', 'affiliate', 'Substack', 'content strategy', 'MCP']}
  propertyName="agency"
/>

<section class="content-hero">
  <div class="hero-stage">
    <HeroSignalField variant="agency" focus="right" />

    <div class="shell-inner-pad content-shell hero-grid">
      <div class="hero-copy">
        <BlurFade>
          <span class="product-kicker">Dify Content Engine</span>
        </BlurFade>
        <BlurFade delay={0.05}>
          <h1>Custom-domain content owns the funnel. Substack carries the dispatch.</h1>
        </BlurFade>
        <BlurFade delay={0.1}>
          <p>
            The Dify affiliate lane needs one canonical place for proof, disclosures, analytics, and
            lead routing. The CREATE SOMETHING site owns that source of truth; Substack sends
            readers back to it with a weekly, lightweight cadence.
          </p>
        </BlurFade>
        <BlurFade delay={0.15}>
          <div class="hero-actions">
            <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
            <Button href="/dify" variant="secondary">Back To Dify Lane</Button>
          </div>
        </BlurFade>
      </div>

      <BlurFade delay={0.2}>
        <aside
          class="brief-panel product-surface product-surface--soft"
          aria-label="Content channel summary"
        >
          <span>Primary channel</span>
          <strong>Custom domain first</strong>
          <p>
            Affiliate links stay direct until acceptance. Implementation and enterprise leads stay
            in the partner lane instead of being forced through affiliate attribution.
          </p>
        </aside>
      </BlurFade>
    </div>
  </div>
</section>

<section class="role-section">
  <div class="shell-inner-pad content-shell">
    <div class="section-heading">
      <span class="product-kicker">Channel Split</span>
      <h2>Each surface has one job.</h2>
    </div>

    <div class="role-grid" role="list">
      {#each channelRoles as role}
        <article class="role-card product-surface" role="listitem">
          <span>{role.label}</span>
          <h3>{role.title}</h3>
          <p>{role.detail}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="target-section">
  <div class="shell-inner-pad content-shell">
    <div class="section-heading wide">
      <span class="product-kicker">Targets</span>
      <h2>Measure the channel by canonical content, subscribers, and paid conversions.</h2>
    </div>

    <div class="target-grid" role="list">
      {#each targets as target}
        <article class="target-card product-surface product-surface--soft" role="listitem">
          <span>{target.horizon}</span>
          <strong>{target.content}</strong>
          <p>{target.audience}</p>
          <p>{target.conversion}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="cluster-section">
  <div class="shell-inner-pad content-shell cluster-grid">
    <div class="section-heading">
      <span class="product-kicker">Content Cluster</span>
      <h2>Publish the canonical page first, then dispatch the angle.</h2>
      <p>
        The long-form asset lives on the custom domain. Substack gets the shortest useful version:
        one claim, one artifact, one link back.
      </p>
    </div>

    <div class="cluster-list">
      {#each contentCluster as item}
        <a class="cluster-item product-surface" href={item.cta}>
          <div>
            <span>{item.audience}</span>
            <h3>{item.title}</h3>
            <p>{item.dispatch}</p>
          </div>
        </a>
      {/each}
    </div>
  </div>
</section>

<section class="economics-section">
  <div class="shell-inner-pad content-shell">
    <div class="section-heading wide">
      <span class="product-kicker">Affiliate Economics</span>
      <h2>The first serious milestone is 20 paid conversions.</h2>
      <p>
        Working model: Dify Professional at $59/month, Team at $159/month, 30% starting commission,
        50% after 20 paid conversions, and a 12-month eligible commission window.
      </p>
    </div>

    <div class="economics-grid" role="list">
      {#each economics as item}
        <article class="economics-card product-surface" role="listitem">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <h3>{item.detail}</h3>
          <p>{item.note}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<section class="loop-section">
  <div class="shell-inner-pad content-shell loop-grid">
    <div class="section-heading">
      <span class="product-kicker">Weekly Loop</span>
      <h2>Keep the system operational, not theoretical.</h2>
      <p>
        Every piece should leave a ledger row, a measured source, and a clear route for self-serve
        users versus implementation buyers.
      </p>
    </div>

    <ol class="loop-list">
      {#each operatingLoop as step}
        <li>{step}</li>
      {/each}
    </ol>
  </div>
</section>

<section class="cta-section">
  <div class="shell-inner-pad content-shell">
    <div class="product-surface product-surface--accent cta-grid">
      <div>
        <span class="product-kicker">Next Step</span>
        <h2>Turn the first content piece into a measurable Dify surface.</h2>
        <p>
          Start with one canonical page, one Substack dispatch, one ledger row, and one clean lead
          split between affiliate and implementation.
        </p>
      </div>
      <Button href="/dify/mcp-control-plane">Open First Canonical Piece</Button>
    </div>
  </div>
</section>

<style>
  .content-shell {
    width: min(1120px, 100%);
    margin: 0 auto;
  }

  .content-hero {
    padding-top: clamp(5.5rem, 9vw, 7.5rem);
    padding-bottom: clamp(2.5rem, 6vw, 4rem);
  }

  .hero-stage {
    position: relative;
    min-height: clamp(31rem, 54vw, 40rem);
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
      );
  }

  .content-hero :global(.hero-signal-field) {
    inset: -2rem -4rem -3rem -2rem;
  }

  .hero-grid,
  .cluster-grid,
  .loop-grid,
  .cta-grid {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: minmax(0, 1.08fr) minmax(18rem, 0.72fr);
    gap: clamp(2rem, 5vw, 4.5rem);
    align-items: center;
  }

  .hero-grid {
    padding-top: clamp(2rem, 4vw, 3rem);
    padding-bottom: clamp(3rem, 6vw, 4.5rem);
  }

  .hero-copy,
  .section-heading,
  .cta-grid div {
    display: grid;
    gap: 0.9rem;
  }

  .hero-copy {
    max-width: 45rem;
  }

  .brief-panel span,
  .role-card span,
  .target-card span,
  .cluster-item span,
  .economics-card span {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .hero-copy h1,
  .section-heading h2,
  .cta-grid h2 {
    margin: 0;
    color: var(--color-fg-primary);
    letter-spacing: 0;
    line-height: 1.04;
    text-wrap: balance;
  }

  .hero-copy h1 {
    font-size: clamp(2.75rem, 4.8vw, 4.6rem);
    line-height: 1;
  }

  .section-heading h2,
  .cta-grid h2 {
    font-size: clamp(1.65rem, 3vw, 2.75rem);
  }

  .hero-copy p,
  .brief-panel p,
  .section-heading p,
  .role-card p,
  .target-card p,
  .cluster-item p,
  .economics-card p,
  .cta-grid p,
  .loop-list li {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.68;
    text-wrap: pretty;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
    align-items: center;
  }

  .brief-panel {
    display: grid;
    gap: 0.75rem;
    padding: clamp(1.2rem, 3vw, 1.6rem);
  }

  .brief-panel strong,
  .target-card strong,
  .economics-card strong {
    color: var(--color-fg-primary);
    font-size: 1.25rem;
    line-height: 1.25;
  }

  .role-section,
  .target-section,
  .cluster-section,
  .economics-section,
  .loop-section,
  .cta-section {
    padding-top: clamp(1.25rem, 3vw, 2rem);
    padding-bottom: clamp(3.5rem, 6vw, 5rem);
  }

  .section-heading.wide {
    max-width: 58rem;
    margin-bottom: 1.4rem;
  }

  .role-grid,
  .target-grid,
  .economics-grid {
    display: grid;
    gap: 1rem;
  }

  .role-grid,
  .economics-grid {
    margin-top: 1.4rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .target-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .role-card,
  .target-card,
  .economics-card {
    min-height: 13rem;
    display: grid;
    align-content: start;
    gap: 0.7rem;
    padding: 1.15rem;
  }

  .role-card h3,
  .cluster-item h3,
  .economics-card h3 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: clamp(1.08rem, 1.5vw, 1.35rem);
    line-height: 1.14;
    letter-spacing: 0;
  }

  .cluster-list {
    display: grid;
    gap: 0.85rem;
  }

  .cluster-item {
    display: block;
    padding: 1rem 1.1rem;
    color: inherit;
    text-decoration: none;
    transition:
      border-color 160ms ease,
      background 160ms ease,
      transform 160ms ease;
  }

  .cluster-item div {
    display: grid;
    gap: 0.4rem;
  }

  .cluster-item:hover {
    border-color: var(--color-shell-border-strong);
    background: var(--color-shell-surface-hover);
    transform: translateY(-1px);
  }

  .loop-list {
    display: grid;
    gap: 0.8rem;
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: steps;
  }

  .loop-list li {
    counter-increment: steps;
    position: relative;
    padding: 1rem 1rem 1rem 3.25rem;
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-xl);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.015)),
      color-mix(in srgb, var(--color-shell-surface-secondary) 80%, transparent);
  }

  .loop-list li::before {
    content: counter(steps);
    position: absolute;
    left: 1rem;
    top: 1rem;
    display: grid;
    place-items: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    background: var(--color-brand-primary);
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: 0.78rem;
  }

  .cta-grid {
    align-items: center;
    padding: clamp(1.35rem, 3vw, 2rem);
  }

  @media (max-width: 980px) {
    .hero-grid,
    .cluster-grid,
    .loop-grid,
    .cta-grid,
    .role-grid,
    .target-grid,
    .economics-grid {
      grid-template-columns: 1fr;
    }

    .role-card,
    .target-card,
    .economics-card {
      min-height: auto;
    }

    .cta-grid {
      justify-items: start;
    }
  }

  @media (max-width: 680px) {
    .content-hero {
      padding-top: clamp(2.25rem, 9vw, 3.25rem);
      padding-bottom: clamp(1.75rem, 8vw, 3rem);
    }

    .hero-stage {
      min-height: clamp(28rem, 104vw, 37rem);
    }

    .content-hero :global(.hero-signal-field) {
      inset: 0 -2.5rem -2rem -1rem;
    }

    .hero-grid {
      padding-top: 1rem;
      padding-bottom: 2.75rem;
    }

    .hero-copy h1 {
      font-size: clamp(2.35rem, 11vw, 3.25rem);
      line-height: 1.02;
    }

    .hero-copy p {
      font-size: 0.94rem;
      line-height: 1.58;
    }

    .brief-panel {
      display: none;
    }
  }
</style>
