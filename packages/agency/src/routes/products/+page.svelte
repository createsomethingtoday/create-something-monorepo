<script lang="ts">
  import { SEO } from '@create-something/canon';
  import { AnimatedGridPattern, BlurFade } from '@create-something/canon/magicui';
  import { products } from '$lib/data/services';
  // Group products by category
  const featured = products.filter((p) => p.category === 'featured');
  const devTools = products.filter((p) => p.category === 'developer-tools');
  const framework = products.filter((p) => p.category === 'framework');
  const integrations = products.filter((p) => p.category === 'integration');
  const clientWork = products.filter((p) => p.category === 'client');

  const proofStories = [
    {
      title: 'Revenue handoff consolidation',
      workflow:
        'Email, video transcripts, and meeting clips were pulled into one Notion operating surface so the team no longer had to rebuild context across inboxes and recordings.',
      boundary:
        'Gmail, YouTube, Zoom Clips, contact matching, notifications, runbook, and Codex setup.',
      outcome:
        'The workflow shipped with explicit artifacts and repeatable operating context instead of living in scattered tools and memory.',
      visual: {
        inputs: [{ type: 'icon', name: 'google' }, { type: 'text', text: 'Vid' }],
        output: { type: 'icon', name: 'notion' }
      }
    },
    {
      title: 'Platform knowledge as an operating surface',
      workflow:
        'Platform documentation, deployment guidance, and architecture patterns were exposed through an AI-guided surface instead of staying trapped in ad hoc internal context.',
      boundary:
        'Component exploration, pattern guidance, deployment support, and architecture documentation.',
      outcome:
        'Teams received an inspectable MCP surface for platform knowledge and deployment decisions.',
      visual: {
        inputs: [{ type: 'icon', name: 'github' }, { type: 'text', text: 'Docs' }],
        output: { type: 'icon', name: 'slack' }
      }
    },
    {
      title: 'Constrained operational surfaces before live writes',
      workflow:
        'Scheduling, finance, and knowledge systems were exposed as constrained MCP surfaces first so workflow design could be validated before broader automation authority was granted.',
      boundary:
        'Backfill and forecast, read-only finance access, sync boundaries, and conflict handling.',
      outcome:
        'Operators could review the data surface and the workflow shape before promoting riskier actions.',
      visual: {
        inputs: [{ type: 'icon', name: 'stripe' }, { type: 'icon', name: 'notion' }],
        output: { type: 'icon', name: 'salesforce' }
      }
    }
  ];

  function isExternal(href: string | undefined): boolean {
    return !!href && href.startsWith('http');
  }
</script>

<!-- Icons -->
{#snippet createSomethingLogo()}
  <svg viewBox="0 0 32 32" fill="none" width="20" height="20">
    <path d="M 16 4 L 26.39 10 L 16 16 L 5.61 10 Z" fill="currentColor" fill-opacity="1" />
    <path d="M 5.61 10 L 16 16 L 16 28 L 5.61 22 Z" fill="currentColor" fill-opacity="0.6" />
    <path d="M 16 16 L 26.39 10 L 26.39 22 L 16 28 Z" fill="currentColor" fill-opacity="0.3" />
  </svg>
{/snippet}

{#snippet googleIcon()}
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
{/snippet}

{#snippet notionIcon()}
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.887c-.56.046-.747.326-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.746 0-.933-.234-1.495-.933l-4.577-7.186v6.952l1.449.327s0 .84-1.168.84l-3.22.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933zM2.718 1.321l13.496-.933c1.635-.14 2.055-.047 3.08.7l4.296 2.986c.7.513.933.653.933 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.933c-.98.047-1.448-.093-1.962-.747l-3.127-4.06c-.56-.746-.793-1.306-.793-1.958V2.948c0-.84.373-1.54 1.215-1.627z" />
  </svg>
{/snippet}

{#snippet githubIcon()}
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
{/snippet}

{#snippet stripeIcon()}
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
  </svg>
{/snippet}

{#snippet salesforceIcon()}
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M12 4C8.5 4 5.4 6.1 4.1 9.1c-2.1.5-3.6 2.4-3.6 4.6 0 2.6 2.1 4.8 4.8 4.8h13.4c2.1 0 3.8-1.7 3.8-3.8 0-1.9-1.4-3.5-3.2-3.8C18.8 7.1 15.7 4 12 4z" />
  </svg>
{/snippet}

{#snippet slackIcon()}
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
    <path d="M6 15a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2zM7 15a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-5zM9 6a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2H9zM9 7a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5zM18 9a2 2 0 0 1 2-2 2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2V9zM17 9a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5zM15 18a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h2zM15 17a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-5z" />
  </svg>
{/snippet}

{#snippet renderNode(node: { type: string, name?: string, text?: string })}
  <div class="visual-node">
    {#if node.type === 'icon'}
      {#if node.name === 'google'}
        {@render googleIcon()}
      {:else if node.name === 'notion'}
        {@render notionIcon()}
      {:else if node.name === 'github'}
        {@render githubIcon()}
      {:else if node.name === 'stripe'}
        {@render stripeIcon()}
      {:else if node.name === 'salesforce'}
        {@render salesforceIcon()}
      {:else if node.name === 'slack'}
        {@render slackIcon()}
      {/if}
    {:else}
      <span class="node-text">{node.text}</span>
    {/if}
  </div>
{/snippet}

<SEO
  title="Proof in Production | Workflow Systems and MCPs"
  description="Workflow proof for Ops and RevOps teams: buyer-readable examples, technical artifacts, and reusable MCP patterns behind CREATE SOMETHING .agency."
  keywords="ops revops workflow proof, policy os examples, workflow infrastructure case studies, mcp systems, governed execution proof"
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
      <p class="hero-eyebrow">Proof</p>
    </BlurFade>
    <BlurFade delay={0.1}>
      <h1 class="hero-title">Proof for operators, not just builders</h1>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="hero-subtitle">
        The point is not that tools exist. The point is that risky handoffs, approvals, and cross-system
        workflows were turned into something a team can inspect and operate.
      </p>
    </BlurFade>
  </div>
</section>

<!-- Proof Stories -->
<section class="products-section">
  <div class="section-inner">
    <BlurFade delay={0.1}>
      <div class="section-header">
        <h2 class="section-eyebrow">Workflow Examples</h2>
        <p class="section-desc">
          Buyer-readable proof showing the workflow, the control boundary, and what the team could
          operate afterward.
        </p>
      </div>
    </BlurFade>
    <div class="proof-grid">
      {#each proofStories as story, index}
        <BlurFade delay={0.2 + index * 0.1}>
          <article class="proof-card">
            {#if story.visual}
              <div class="proof-visual">
                <div class="visual-inputs">
                  {#each story.visual.inputs as inputNode}
                    {@render renderNode(inputNode)}
                  {/each}
                </div>
                <div class="visual-line"></div>
                <div class="visual-node hub-node">
                  {@render createSomethingLogo()}
                </div>
                <div class="visual-line"></div>
                <div class="visual-outputs">
                  {@render renderNode(story.visual.output)}
                </div>
              </div>
            {/if}
            <span class="proof-label">Example {index + 1}</span>
            <h3 class="proof-title">{story.title}</h3>
            <div class="proof-copy">
              <p><strong>Workflow:</strong> {story.workflow}</p>
              <p><strong>Control boundary:</strong> {story.boundary}</p>
              <p><strong>Result:</strong> {story.outcome}</p>
            </div>
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
        <h2 class="section-eyebrow">Technical Proof</h2>
        <p class="section-desc">
          Reusable patterns from real client work. This is the supporting evidence behind the
          workflow examples above.
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
        <h2 class="section-eyebrow">Integration Surfaces</h2>
        <p class="section-desc">
          MCP surfaces for connecting live systems without asking the team to keep rebuilding
          context by hand.
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
        <h2 class="section-eyebrow">Client Portfolio</h2>
        <p class="section-desc">
          Selected builds showing the constraints, handoffs, and operating realities behind the
          work.
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
      <p class="cta-heading">Need this applied to your workflow?</p>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="cta-subtext">
        I’ll map the first workflow, the risk points, and the cleanest path into production.
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

  .proof-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--space-5, 1.5rem);
  }

  .proof-card {
    border-radius: var(--radius-xl, 16px);
    border: 1px solid var(--color-border-default);
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01));
    padding: var(--space-6, 2rem);
    display: flex;
    flex-direction: column;
    gap: var(--space-4, 1rem);
  }

  /* Visual Pipeline styles */
  .proof-visual {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    background: rgba(0, 0, 0, 0.15);
    border-radius: var(--radius-lg, 12px);
    border: 1px solid rgba(255, 255, 255, 0.04);
    margin-bottom: var(--space-2, 0.5rem);
  }

  .visual-inputs, .visual-outputs {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .visual-node {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md, 8px);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-fg-secondary);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    position: relative;
    z-index: 2;
  }

  .hub-node {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-lg, 12px);
    border-color: rgba(167, 139, 250, 0.3);
    background: linear-gradient(135deg, rgba(167, 139, 250, 0.1) 0%, rgba(255, 255, 255, 0.02) 100%);
    color: var(--color-accent);
  }

  .node-text {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .visual-line {
    flex: 1;
    height: 2px;
    background: rgba(255, 255, 255, 0.05);
    margin: 0 1rem;
    position: relative;
    overflow: hidden;
    min-width: 20px;
  }

  .visual-line::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 40%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(167, 139, 250, 0.6), transparent);
    animation: pipeline 2s infinite linear;
    border-radius: 2px;
  }

  @keyframes pipeline {
    0% { transform: translateX(-150%); }
    100% { transform: translateX(350%); }
  }

  .proof-label {
    font-size: var(--text-caption);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-fg-muted);
  }

  .proof-title {
    font-size: var(--text-h3);
    color: var(--color-fg-primary);
    line-height: 1.15;
  }

  .proof-copy {
    display: grid;
    gap: var(--space-3, 0.75rem);
  }

  .proof-copy p {
    font-size: var(--text-body-sm);
    color: var(--color-fg-secondary);
    line-height: var(--leading-relaxed);
    margin: 0;
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
