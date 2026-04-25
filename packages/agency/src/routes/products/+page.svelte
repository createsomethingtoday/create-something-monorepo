<script lang="ts">
  import { Button, SEO } from '@create-something/canon';
  import { AnimatedGridPattern, BlurFade } from '@create-something/canon/magicui';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { products } from '$lib/data/services';

  const featured = products.filter((product) => product.category === 'featured');
  const devTools = products.filter((product) => product.category === 'developer-tools');
  const framework = products.filter((product) => product.category === 'framework');
  const integrations = products.filter((product) => product.category === 'integration');
  const clientWork = products.filter((product) => product.category === 'client');
  const operatorTooling = [...devTools, ...framework];

  const proofTracks = [
    {
      label: 'Flagship tools',
      count: featured.length,
      detail: 'Reusable packages buyers can inspect before they buy services.'
    },
    {
      label: 'Operator tooling',
      count: operatorTooling.length,
      detail: 'Diagnostics and framework layers that keep the system legible.'
    },
    {
      label: 'Integration MCPs',
      count: integrations.length,
      detail: 'Connectors for live systems teams already depend on.'
    },
    {
      label: 'Client systems',
      count: clientWork.length,
      detail: 'Production builds delivered with operating artifacts and handoff discipline.'
    }
  ];

  function isExternal(href: string | undefined): boolean {
    return !!href && href.startsWith('http');
  }

  function formatCount(value: number) {
    return value.toString().padStart(2, '0');
  }

  function getProductCta(productHref: string | undefined, fallback: string) {
    return isExternal(productHref) ? 'Inspect on GitHub →' : fallback;
  }
</script>

<SEO
  title="Proof in Production | Workflow Systems and MCPs"
  description="Flagship tools, integration MCPs, and client systems that show CREATE SOMETHING .agency is real, inspectable, and already operating in production."
  keywords="AI integrations, business tool automation, Notion AI, Gmail AI, Zoom AI, Salesforce AI, custom AI development, MCP servers"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<section class="hero">
  <div class="hero-grid-container">
    <AnimatedGridPattern
      numSquares={25}
      maxOpacity={0.08}
      duration={4}
      repeatDelay={2}
      width={60}
      height={60}
      class="hero-animated-grid"
    />
  </div>

  <div class="section-container hero-content">
    <div class="hero-copy">
      <BlurFade delay={0}>
        <p class="hero-eyebrow">Proof of Work</p>
      </BlurFade>
      <BlurFade delay={0.08}>
        <h1 class="hero-title">Proof in production, not just in pitch language.</h1>
      </BlurFade>
      <BlurFade delay={0.16}>
        <p class="hero-subtitle">
          Flagship packages, live-system connectors, and client deployments buyers can inspect
          before they commit.
        </p>
      </BlurFade>
    </div>

    <div class="proof-grid">
      {#each proofTracks as track, index}
        <BlurFade delay={0.22 + index * 0.06}>
          <article class="proof-card">
            <span class="proof-count">{formatCount(track.count)}</span>
            <div class="proof-copy">
              <strong>{track.label}</strong>
              <p>{track.detail}</p>
            </div>
          </article>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="products-section products-section--featured">
  <div class="section-container">
    <div class="section-header">
      <BlurFade>
        <span class="section-kicker">Flagship tools</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Reusable products that show how the operating model is packaged.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          These are the clearest proof surfaces for how CREATE SOMETHING turns governance,
          automation, and handoff discipline into something buyers can inspect directly.
        </p>
      </BlurFade>
    </div>

    <div class="featured-grid">
      {#each featured as product, index}
        <BlurFade delay={0.15 + index * 0.08}>
          <a
            href={product.href}
            class="product-card product-card--featured"
            target={isExternal(product.href) ? '_blank' : undefined}
            rel={isExternal(product.href) ? 'noopener noreferrer' : undefined}
          >
            <div class="product-card__meta">
              {#if product.badge}
                <span class="product-badge badge-oss">{product.badge}</span>
              {/if}
              {#if product.npmPackage}
                <code class="product-npm">{product.npmPackage}</code>
              {/if}
            </div>
            <h3 class="product-name">{product.title}</h3>
            <p class="product-tagline">{product.tagline}</p>
            <p class="product-description">{product.description}</p>
            <div class="product-footer">
              <span class="product-support">{product.timeline}</span>
              <span class="product-cta">{getProductCta(product.href, 'See product detail →')}</span>
            </div>
          </a>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="products-section">
  <div class="section-container">
    <div class="section-header section-header--split">
      <div>
        <BlurFade>
          <span class="section-kicker">Operator tooling</span>
        </BlurFade>
        <BlurFade delay={0.05}>
          <h2>The layers that keep the work understandable and governable.</h2>
        </BlurFade>
      </div>
      <BlurFade delay={0.1}>
        <p>
          Not every proof surface is a customer-facing product. Some of the most important layers
          are the analysis, framework, and teaching surfaces that keep the delivery work honest.
        </p>
      </BlurFade>
    </div>

    <div class="operator-columns">
      <article class="operator-panel">
        <div class="operator-intro">
          <span class="product-badge badge-neutral">Developer tools</span>
          <h3>Inspection and learning surfaces for teams building governed systems.</h3>
          <p>
            These tools help engineers diagnose duplication, teach the method, and keep
            implementation grounded instead of drifting into agent theater.
          </p>
        </div>
        <div class="operator-grid">
          {#each devTools as product, index}
            <BlurFade delay={0.15 + index * 0.06}>
              <a
                href={product.href}
                class="product-card product-card--compact"
                target={isExternal(product.href) ? '_blank' : undefined}
                rel={isExternal(product.href) ? 'noopener noreferrer' : undefined}
              >
                {#if product.badge}
                  <span class="product-badge badge-neutral">{product.badge}</span>
                {/if}
                <h3 class="product-name">{product.title}</h3>
                <p class="product-tagline">{product.tagline}</p>
                <p class="product-description">{product.description}</p>
                <div class="product-footer">
                  {#if product.npmPackage}
                    <code class="product-npm">{product.npmPackage}</code>
                  {/if}
                  <span class="product-cta">{getProductCta(product.href, 'See product detail →')}</span>
                </div>
              </a>
            </BlurFade>
          {/each}
        </div>
      </article>

      <article class="operator-panel operator-panel--soft">
        <div class="operator-intro">
          <span class="product-badge badge-neutral">Framework layer</span>
          <h3>Architecture primitives for connecting data, tools, and policy.</h3>
          <p>
            This is the structural layer behind the service work: where the system boundaries,
            storage model, and governance logic become durable artifacts rather than ad hoc prompts.
          </p>
        </div>
        <div class="operator-grid">
          {#each framework as product, index}
            <BlurFade delay={0.15 + index * 0.06}>
              <a
                href={product.href}
                class="product-card product-card--compact"
                target={isExternal(product.href) ? '_blank' : undefined}
                rel={isExternal(product.href) ? 'noopener noreferrer' : undefined}
              >
                {#if product.badge}
                  <span class="product-badge badge-neutral">{product.badge}</span>
                {/if}
                <h3 class="product-name">{product.title}</h3>
                <p class="product-tagline">{product.tagline}</p>
                <p class="product-description">{product.description}</p>
                <div class="product-footer">
                  <span class="product-support">{product.timeline}</span>
                  <span class="product-cta">{getProductCta(product.href, 'See product detail →')}</span>
                </div>
              </a>
            </BlurFade>
          {/each}
        </div>
      </article>
    </div>
  </div>
</section>

<section class="products-section">
  <div class="section-container">
    <div class="section-header">
      <BlurFade>
        <span class="section-kicker">Integration MCPs</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Connective tissue for the systems teams already use.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          These connectors handle the live edge between tools, data, and AI. The value is not the
          acronym. It is that the surrounding systems remain queryable, auditable, and easier to
          operate.
        </p>
      </BlurFade>
    </div>

    <div class="category-grid">
      {#each integrations as product, index}
        <BlurFade delay={0.15 + index * 0.05}>
          <a
            href={product.href}
            class="product-card product-card--integration"
            target={isExternal(product.href) ? '_blank' : undefined}
            rel={isExternal(product.href) ? 'noopener noreferrer' : undefined}
          >
            {#if product.badge}
              <span class="product-badge badge-neutral">{product.badge}</span>
            {/if}
            <h3 class="product-name">{product.title}</h3>
            <p class="product-tagline">{product.tagline}</p>
            <p class="product-description">{product.description}</p>
            <div class="product-footer">
              <span class="product-support">{product.timeline}</span>
              <span class="product-cta">{getProductCta(product.href, 'See product detail →')}</span>
            </div>
          </a>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="products-section products-section--client">
  <div class="section-container">
    <div class="section-header">
      <BlurFade>
        <span class="section-kicker">Client systems</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>Production builds with real constraints, not sandbox demos.</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          The client work matters because it shows how the product layer holds up when there are
          owners, edge cases, third-party limits, and a real handoff at the end.
        </p>
      </BlurFade>
    </div>

    <div class="client-grid">
      {#each clientWork as product, index}
        <BlurFade delay={0.15 + index * 0.08}>
          <article class="client-card">
            <div class="client-card-header">
              {#if product.badge}
                <span class="product-badge badge-accent">{product.badge}</span>
              {/if}
              {#if product.client}
                <span class="client-name">for {product.client}</span>
              {/if}
            </div>
            <h3 class="product-name">{product.title}</h3>
            <p class="product-tagline">{product.tagline}</p>
            <p class="product-description">{product.description}</p>
            {#if product.integrations && product.integrations.length > 0}
              <div class="integration-tags">
                {#each product.integrations as integration}
                  <span class="integration-tag">{integration}</span>
                {/each}
              </div>
            {/if}
            <div class="product-footer">
              <span class="product-support">Delivered as a custom engagement</span>
              <span class="product-cta">Policy + runbook included</span>
            </div>
          </article>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<section class="cta-section">
  <div class="section-container">
    <div class="cta-panel">
      <BlurFade>
        <span class="section-kicker">Start with one workflow</span>
      </BlurFade>
      <BlurFade delay={0.05}>
        <h2>{agencyCoreMessaging.workflowCtaHeading}</h2>
      </BlurFade>
      <BlurFade delay={0.1}>
        <p>
          I’ll map the workflow, the failure points, and the first safe path into production so you
          can see where a governed system actually earns its keep.
        </p>
      </BlurFade>
      <BlurFade delay={0.15}>
        <div class="cta-actions">
          <Button href="/book">{agencyCoreMessaging.bookMappingSessionLabel}</Button>
          <Button href="/services" variant="secondary">{agencyCoreMessaging.engagementModelLabel}</Button>
        </div>
      </BlurFade>
    </div>
  </div>
</section>

<style>
  .section-container {
    max-width: var(--content-width-xl);
    margin: 0 auto;
    padding: 0 var(--container-padding, 1.5rem);
  }

  .hero {
    position: relative;
    padding: clamp(4.75rem, 8vw, 6.5rem) 0 clamp(2.8rem, 5vw, 4rem);
    overflow: hidden;
  }

  .hero-grid-container {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  :global(.hero-animated-grid) {
    mask-image: radial-gradient(680px circle at 50% 30%, white, transparent);
    -webkit-mask-image: radial-gradient(680px circle at 50% 30%, white, transparent);
  }

  .hero-content {
    position: relative;
    display: grid;
    gap: 2rem;
  }

  .hero-copy {
    max-width: 46rem;
  }

  .hero-eyebrow {
    margin: 0 0 0.85rem;
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--color-fg-muted);
  }

  .hero-title {
    margin: 0 0 1rem;
    max-width: 11ch;
    font-size: clamp(3.2rem, 6vw, 5.8rem);
    line-height: 0.94;
    letter-spacing: -0.05em;
    text-wrap: balance;
  }

  .hero-subtitle {
    margin: 0;
    max-width: 38rem;
    color: var(--color-fg-secondary);
    font-size: clamp(1.05rem, 1vw + 0.85rem, 1.2rem);
    line-height: 1.72;
    text-wrap: pretty;
  }

  .proof-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.9rem;
  }

  .proof-card {
    display: grid;
    gap: 0.65rem;
    padding: 1rem 1.05rem;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
    box-shadow: var(--glass-shine-soft);
  }

  .proof-count {
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    letter-spacing: 0.12em;
  }

  .proof-copy {
    display: grid;
    gap: 0.35rem;
  }

  .proof-copy strong {
    color: var(--color-fg-primary);
    font-size: 0.98rem;
    line-height: 1.25;
  }

  .proof-copy p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    line-height: 1.55;
  }

  .products-section,
  .cta-section {
    padding: clamp(2.5rem, 5vw, 4.5rem) 0;
  }

  .products-section--featured {
    padding-top: clamp(2rem, 4vw, 3rem);
  }

  .section-header {
    display: grid;
    gap: 0.75rem;
    max-width: 44rem;
    margin-bottom: 1.4rem;
  }

  .section-header--split {
    max-width: none;
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 0.8fr);
    align-items: end;
    gap: 1rem;
  }

  .section-kicker {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .section-header h2,
  .operator-intro h3,
  .cta-panel h2 {
    margin: 0;
    line-height: 1.02;
    text-wrap: balance;
  }

  .section-header p,
  .operator-intro p,
  .cta-panel p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.72;
  }

  .featured-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .operator-columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .operator-panel {
    display: grid;
    gap: 1rem;
    padding: 1.15rem;
    border-radius: 22px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.02);
    box-shadow: var(--glass-shine-soft);
  }

  .operator-panel--soft {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.018));
  }

  .operator-intro {
    display: grid;
    gap: 0.7rem;
  }

  .operator-grid,
  .category-grid,
  .client-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 0.9rem;
  }

  .product-card,
  .client-card {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    padding: 1.2rem;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.02);
    color: inherit;
    text-decoration: none;
    transition:
      transform var(--duration-standard) var(--ease-standard),
      border-color var(--duration-standard) var(--ease-standard),
      background var(--duration-standard) var(--ease-standard);
  }

  .product-card:hover,
  .client-card:hover {
    transform: translateY(-2px);
    border-color: rgba(96, 165, 250, 0.25);
    background: rgba(255, 255, 255, 0.04);
  }

  .product-card--featured {
    gap: 0.95rem;
    padding: clamp(1.3rem, 2vw, 1.6rem);
    background: linear-gradient(135deg, rgba(96, 165, 250, 0.06), rgba(255, 255, 255, 0.02));
    border-color: rgba(96, 165, 250, 0.16);
  }

  .product-card--compact {
    min-height: 100%;
  }

  .product-card--integration {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.018));
  }

  .client-card {
    background: linear-gradient(135deg, rgba(167, 139, 250, 0.06), rgba(255, 255, 255, 0.02));
    border-color: rgba(167, 139, 250, 0.12);
  }

  .product-card__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.65rem;
  }

  .product-badge {
    width: fit-content;
    padding: 0.22rem 0.65rem;
    border-radius: 999px;
    font-size: var(--text-caption);
  }

  .badge-oss {
    color: var(--color-success);
    background: var(--color-success-muted);
  }

  .badge-neutral {
    color: var(--color-fg-secondary);
    background: rgba(255, 255, 255, 0.06);
  }

  .badge-accent {
    color: var(--color-accent, #a78bfa);
    background: rgba(167, 139, 250, 0.12);
  }

  .product-name {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: clamp(1.2rem, 1vw + 1rem, 1.55rem);
    line-height: 1.08;
  }

  .product-tagline {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    line-height: 1.55;
  }

  .product-description {
    margin: 0;
    flex: 1;
    color: var(--color-fg-tertiary);
    font-size: var(--text-body-sm);
    line-height: 1.65;
  }

  .product-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
    align-items: center;
    justify-content: space-between;
    margin-top: auto;
  }

  .product-support {
    color: var(--color-fg-muted);
    font-size: 0.78rem;
    letter-spacing: 0.02em;
  }

  .product-npm {
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--color-fg-muted);
    background: rgba(255, 255, 255, 0.04);
    border-radius: 8px;
    padding: 0.24rem 0.55rem;
    font-family: var(--font-mono);
    font-size: 0.75rem;
  }

  .product-cta {
    color: var(--color-fg-primary);
    font-size: var(--text-body-sm);
    font-weight: var(--font-semibold);
  }

  .client-card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .client-name {
    color: var(--color-fg-muted);
    font-size: var(--text-body-sm);
    font-style: italic;
  }

  .integration-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: auto;
  }

  .integration-tag {
    color: var(--color-fg-muted);
    background: rgba(255, 255, 255, 0.04);
    border-radius: 999px;
    padding: 0.25rem 0.6rem;
    font-size: var(--text-caption);
  }

  .cta-panel {
    display: grid;
    gap: 0.95rem;
    padding: clamp(1.5rem, 3vw, 2rem);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
    box-shadow: var(--glass-shine-soft);
    text-align: center;
  }

  .cta-panel p {
    max-width: 40rem;
    margin-left: auto;
    margin-right: auto;
  }

  .cta-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.85rem;
  }

  @media (max-width: 1080px) {
    .proof-grid,
    .featured-grid,
    .operator-columns {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .section-header--split {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .section-container {
      padding: 0 1rem;
    }

    .hero {
      padding-top: 4rem;
      padding-bottom: 2.5rem;
    }

    .hero-title {
      max-width: 9ch;
      font-size: clamp(2.6rem, 11vw, 4.4rem);
    }

    .proof-grid,
    .featured-grid,
    .operator-columns,
    .operator-grid,
    .category-grid,
    .client-grid {
      grid-template-columns: 1fr;
    }

    .product-card,
    .client-card,
    .operator-panel,
    .proof-card,
    .cta-panel {
      padding: 1rem;
    }

    .product-footer {
      flex-direction: column;
      align-items: flex-start;
    }

    .cta-actions {
      width: 100%;
      flex-direction: column;
    }
  }
</style>
