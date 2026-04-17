<script lang="ts">
  import { SEO } from '@create-something/canon';
  import { AnimatedGridPattern, BlurFade } from '@create-something/canon/magicui';
  import { products } from '$lib/data/services';

  const proofPatterns = [
    {
      title: 'Validation before submission',
      detail:
        'AI-native checks, evidence capture, and policy-aware scoring catch issues before they hit a reviewer queue.'
    },
    {
      title: 'Submission and intake routing',
      detail:
        'Forms, uploads, webhooks, and operator statuses stay aligned so work enters the system cleanly.'
    },
    {
      title: 'Reviewer workflows with evidence',
      detail:
        'Automated analysis, queue context, and explicit decision support reduce vague feedback and rework.'
    },
    {
      title: 'Approval control in production',
      detail:
        'Allow, review, and block states make risky actions governable once the workflow carries real cost.'
    }
  ];

  // Group products by category
  const featured = products.filter((p) => p.category === 'featured');
  const devTools = products.filter((p) => p.category === 'developer-tools');
  const framework = products.filter((p) => p.category === 'framework');
  const integrations = products.filter((p) => p.category === 'integration');
  const clientWork = products.filter((p) => p.category === 'client');

  function isExternal(href: string | undefined): boolean {
    return !!href && href.startsWith('http');
  }
</script>

<SEO
  title="Proof in Production | AI-Native Workflow Systems"
  description="Inspectable AI-native tools, MCP surfaces, and shipped client systems that prove CREATE SOMETHING's work in validation, intake routing, reviewer workflows, and approval control."
  keywords="ai-native workflow systems, review workflow automation, submission intake systems, approval operations, workflow validation, mcp servers"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<!-- Hero -->
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
  <div class="hero-content">
    <BlurFade delay={0}>
      <p class="hero-eyebrow">AI-Native Proof</p>
    </BlurFade>
    <BlurFade delay={0.1}>
      <h1 class="hero-title">Governed systems in production.</h1>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="hero-subtitle">
        AI-native tools, MCP surfaces, and shipped client systems behind validation, submission
        intake, reviewer workflows, and approval control. The point is inspectable proof, not
        catalog sprawl.
      </p>
    </BlurFade>
  </div>
</section>

<!-- Proof Patterns -->
<section class="products-section products-section--tight">
  <div class="section-inner">
    <BlurFade delay={0.1}>
      <div class="section-header">
        <h2 class="section-eyebrow">Current proof wedge</h2>
        <p class="section-desc">
          The strongest shipped proof currently clusters in a few repeatable workflow classes. That
          is the category the buyer should see first.
        </p>
      </div>
    </BlurFade>
    <div class="pattern-grid">
      {#each proofPatterns as pattern, index}
        <BlurFade delay={0.15 + index * 0.06}>
          <article class="pattern-card">
            <h3 class="pattern-title">{pattern.title}</h3>
            <p class="pattern-detail">{pattern.detail}</p>
          </article>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<!-- Featured Products -->
<section class="products-section">
  <div class="section-inner">
    <BlurFade delay={0.1}>
      <div class="section-header">
        <h2 class="section-eyebrow">Core proof artifacts</h2>
        <p class="section-desc">
          These tools make evidence, coordination, and recovery visible before a workflow is sold
          as reliable.
        </p>
      </div>
    </BlurFade>
    <div class="featured-grid">
      {#each featured as product, index}
        <BlurFade delay={0.2 + index * 0.1}>
          <a href={product.href} class="product-card featured-card">
            <div class="product-badge badge-oss">{product.badge}</div>
            <h3 class="product-name">{product.title}</h3>
            <p class="product-tagline">{product.tagline}</p>
            <p class="product-description">{product.description}</p>
            <div class="product-footer">
              {#if product.npmPackage}
                <code class="product-npm">{product.npmPackage}</code>
              {/if}
              <span class="product-cta">Install →</span>
            </div>
          </a>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<!-- Integration MCPs -->
<section class="products-section">
  <div class="section-inner">
    <BlurFade delay={0.1}>
      <div class="section-header">
        <h2 class="section-eyebrow">Workflow MCP surfaces</h2>
        <p class="section-desc">
          Trusted AI-native system surfaces used to power validation, intake routing, reviewer
          context, and operator follow-through.
        </p>
      </div>
    </BlurFade>
    <div class="category-grid">
      {#each integrations as product, index}
        <BlurFade delay={0.2 + index * 0.1}>
          <a
            href={product.href}
            class="product-card category-card"
            target={isExternal(product.href) ? '_blank' : undefined}
            rel={isExternal(product.href) ? 'noopener noreferrer' : undefined}
          >
            <div class="product-badge badge-neutral">{product.badge}</div>
            <h3 class="product-name">{product.title}</h3>
            <p class="product-tagline">{product.tagline}</p>
            <p class="product-description">{product.description}</p>
            <span class="product-cta">View on GitHub →</span>
          </a>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<!-- Client Portfolio -->
<section class="products-section">
  <div class="section-inner">
    <BlurFade delay={0.1}>
      <div class="section-header">
        <h2 class="section-eyebrow">Selected client systems</h2>
        <p class="section-desc">
          Shipped operating paths that had to survive real constraints, approvals, and cross-system
          drift.
        </p>
      </div>
    </BlurFade>
    <div class="client-grid">
      {#each clientWork as product, index}
        <BlurFade delay={0.2 + index * 0.1}>
          <div class="client-card">
            <div class="client-card-header">
              <div class="product-badge badge-accent">{product.badge}</div>
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
          </div>
        </BlurFade>
      {/each}
    </div>
  </div>
</section>

<!-- CTA -->
<section class="cta-section">
  <div class="section-container">
    <BlurFade delay={0.1}>
      <p class="cta-heading">Need this applied to a review, intake, or approval workflow?</p>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="cta-subtext">
        I’ll map the first workflow, the decision points, and the cleanest path into governed
        production.
      </p>
    </BlurFade>
    <BlurFade delay={0.3}>
      <a href="/book" class="cta-link">Book a mapping session →</a>
    </BlurFade>
  </div>
</section>

<style>
  /* Section containers */
  .section-container {
    max-width: var(--content-width-xl);
    margin: 0 auto;
    padding: 0 var(--container-padding, 1.5rem);
  }

  .section-inner {
    max-width: var(--content-width-xl);
    margin: 0 auto;
  }

  /* Hero with grid background */
  .hero {
    position: relative;
    padding: 5rem var(--container-padding, 1.5rem) 3rem;
    overflow: hidden;
  }

  .hero-grid-container {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  :global(.hero-animated-grid) {
    mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
    -webkit-mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
  }

  .hero-content {
    position: relative;
    text-align: center;
    max-width: var(--content-width-xl);
    margin: 0 auto;
  }

  .hero-eyebrow {
    font-size: var(--text-caption);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--color-fg-muted);
    margin-bottom: var(--space-3, 0.75rem);
  }

  .hero-title {
    font-size: var(--text-h1);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-3, 0.75rem);
    line-height: 1.1;
    letter-spacing: var(--tracking-tighter, -0.025em);
  }

  .hero-subtitle {
    font-size: var(--text-body-lg);
    color: var(--color-fg-secondary);
    max-width: var(--content-width-xl);
    margin: 0 auto;
    line-height: var(--leading-relaxed);
  }

  /* Section Headers — compact: eyebrow + one-line description */
  .section-header {
    display: flex;
    flex-direction: column;
    margin-bottom: var(--space-5, 1.5rem);
  }

  .section-eyebrow {
    font-size: var(--text-caption);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--color-fg-muted);
    font-weight: var(--font-semibold);
    margin-bottom: var(--space-2, 0.5rem);
  }

  .section-desc {
    font-size: var(--text-body-sm);
    color: var(--color-fg-tertiary);
    line-height: var(--leading-relaxed);
    text-wrap: balance;
  }

  /* Products Section */
  .products-section {
    padding: 3rem var(--container-padding, 1.5rem);
  }

  .products-section--tight {
    padding-top: 0;
  }

  .pattern-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-4, 1rem);
  }

  .pattern-card {
    padding: 1.25rem;
    border-radius: var(--radius-lg, 12px);
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.05));
    box-shadow: var(--glass-shine-soft);
  }

  .pattern-title {
    font-size: var(--text-body);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-2, 0.5rem);
  }

  .pattern-detail {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    text-wrap: balance;
  }

  /* Shared Grid for all product sections */
  .featured-grid,
  .category-grid,
  .client-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: var(--space-4, 1rem);
  }

  /* Product Card — base */
  .product-card,
  .client-card {
    padding: 1.5rem;
    border-radius: var(--radius-lg, 12px);
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.05));
    box-shadow: var(--glass-shine-soft);
    text-decoration: none;
    transition:
      border-color var(--duration-standard) var(--ease-standard),
      transform var(--duration-standard) var(--ease-standard),
      background var(--duration-standard) var(--ease-standard);
  }

  .product-card:hover,
  .client-card:hover {
    border-color: rgba(96, 165, 250, 0.4);
    background: rgba(255, 255, 255, 0.04);
    transform: translateY(-2px);
  }

  .featured-card {
    background: linear-gradient(135deg, transparent 0%, rgba(96, 165, 250, 0.04) 100%);
    border-color: rgba(96, 165, 250, 0.15);
  }

  .client-card {
    background: linear-gradient(135deg, transparent 0%, rgba(167, 139, 250, 0.04) 100%);
  }

  /* Typography consistency */
  .product-name {
    font-size: var(--text-h3, 1.25rem);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-1, 0.25rem);
  }

  .client-card-header {
    display: flex;
    align-items: center;
    gap: var(--space-3, 0.75rem);
    margin-bottom: var(--space-4, 1rem);
  }

  .client-name {
    font-size: var(--text-body-sm);
    color: var(--color-fg-muted);
    font-style: italic;
  }

  /* Badges */
  .product-badge {
    font-size: var(--text-caption);
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-full, 9999px);
    width: fit-content;
    margin-bottom: var(--space-3, 0.75rem);
  }

  .client-card-header .product-badge {
    margin-bottom: 0;
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
    background: rgba(167, 139, 250, 0.1);
  }

  .product-tagline {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-2, 0.5rem);
  }

  .product-description {
    font-size: var(--text-caption);
    color: var(--color-fg-tertiary);
    line-height: var(--leading-relaxed);
    flex: 1;
    margin-bottom: var(--space-3, 0.75rem);
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .product-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3, 0.75rem);
    margin-top: auto;
    min-width: 0;
  }

  .product-npm {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    background: rgba(255, 255, 255, 0.04);
    padding: 0.2rem 0.5rem;
    border-radius: var(--radius-sm, 4px);
    font-family: var(--font-mono, monospace);
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .product-cta {
    font-size: var(--text-body-sm);
    font-weight: var(--font-semibold);
    color: var(--color-fg-secondary);
    transition: color var(--duration-micro, 200ms) var(--ease-standard);
    margin-left: auto;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .product-card:hover .product-cta {
    color: var(--color-fg-primary);
  }

  /* Integration tags */
  .integration-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2, 0.5rem);
    margin-top: auto;
  }

  .integration-tag {
    font-size: var(--text-caption);
    color: var(--color-fg-muted);
    background: rgba(255, 255, 255, 0.04);
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius-sm, 4px);
  }

  /* CTA */
  .cta-section {
    padding: 3rem 0;
    text-align: center;
  }

  .cta-heading {
    font-size: var(--text-h3, 1.25rem);
    font-weight: var(--font-semibold);
    color: var(--color-fg-primary);
    margin-bottom: var(--space-2, 0.5rem);
  }

  .cta-subtext {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    margin-bottom: var(--space-4, 1rem);
  }

  .cta-link {
    font-size: var(--text-body);
    font-weight: var(--font-semibold);
    color: var(--color-fg-secondary);
    transition: color var(--duration-micro, 200ms) var(--ease-standard);
  }

  .cta-link:hover {
    color: var(--color-fg-primary);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .hero {
      padding: 3rem var(--container-padding, 1.5rem) 2rem;
    }

    .hero-title {
      font-size: var(--text-h2);
    }

    .pattern-grid,
    .featured-grid,
    .category-grid,
    .client-grid {
      grid-template-columns: 1fr;
    }

    .products-section {
      padding: 2rem var(--container-padding, 1.5rem);
    }

    .cta-section {
      padding: 2rem 0;
    }

    .product-footer {
      flex-direction: column;
      align-items: flex-start;
    }

    .product-npm {
      width: 100%;
    }

    .product-cta {
      margin-left: 0;
    }
  }
</style>
