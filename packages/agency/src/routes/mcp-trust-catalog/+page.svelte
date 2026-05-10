<script lang="ts">
  import { SEO } from '@create-something/canon';
  import { AnimatedGridPattern, BlurFade } from '@create-something/canon/magicui';
  import {
    publicGuideAgent,
    publicMcpTrustCards,
    publicTrustListingCopy
  } from '$lib/data/publicTrustCatalog';

  const verificationRows = [
    ['MCP initialize', '200 from each public endpoint'],
    ['Initialized notification', '202 from each public endpoint'],
    ['MCP tools/list', '200 from each public endpoint'],
    ['Credential boundary', 'No bearer token or API key in public evidence']
  ];

  const evidenceStats = [
    ['Public endpoints', String(publicMcpTrustCards.length)],
    ['Auth posture', 'No public auth'],
    ['Guide tools', '0 enabled'],
    ['Evidence', 'MCP probes + Braintrust']
  ];
</script>

<SEO
  title="MCP Trust Catalog | CREATE SOMETHING"
  description="Public CREATE SOMETHING MCP trust cards, guide-agent boundary, and launch copy for the public registry surface."
  keywords="CREATE SOMETHING MCP trust catalog, public MCP, Dify guide agent, Three-Tier Framework, MCP governance"
  ogImage="/og-image.svg"
  propertyName="agency"
/>

<section class="catalog-hero">
  <div class="catalog-hero__grid">
    <AnimatedGridPattern
      numSquares={25}
      maxOpacity={0.08}
      duration={4}
      repeatDelay={2}
      width={60}
      height={60}
      class="catalog-animated-grid"
    />
  </div>
  <div class="catalog-hero__inner">
    <BlurFade delay={0}>
      <p class="catalog-eyebrow">Public trust catalog</p>
    </BlurFade>
    <BlurFade delay={0.1}>
      <h1>{publicTrustListingCopy.headline}</h1>
    </BlurFade>
    <BlurFade delay={0.2}>
      <p class="hero-copy">{publicTrustListingCopy.shortDescription}</p>
    </BlurFade>
    <BlurFade delay={0.3}>
      <div class="hero-actions" aria-label="Public trust catalog actions">
        <a class="primary-action" href="#trust-cards">View trust cards</a>
        <a class="secondary-action" href="#create-something-guide-agent">Guide agent</a>
      </div>
    </BlurFade>
  </div>
</section>

<div class="catalog-body">
  <section class="catalog-section catalog-section--summary" aria-label="Public trust catalog summary">
    <div class="summary-strip">
      {#each evidenceStats as stat}
        <div class="summary-item">
          <span>{stat[0]}</span>
          <strong>{stat[1]}</strong>
        </div>
      {/each}
    </div>
  </section>

  <section class="catalog-section" id="trust-cards">
    <div class="section-copy">
      <p class="catalog-eyebrow">Verified public MCPs</p>
      <h2>No-auth surfaces with explicit boundaries.</h2>
      <p>
        These cards are the public launch surface. They expose setup and methodology guidance, not
        private customer data, private Hub routes, or operator telemetry.
      </p>
    </div>

    <div class="trust-card-grid">
      {#each publicMcpTrustCards as card}
        <article class="trust-card">
          <div class="trust-card__header">
            <span>{card.tier}</span>
            <strong>{card.status}</strong>
          </div>
          <h3>{card.name}</h3>
          <p>{card.scope}</p>
          <dl>
            <div>
              <dt>Endpoint</dt>
              <dd>
                <a
                  class="endpoint-link"
                  href={card.endpoint}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${card.name} public MCP endpoint`}
                >
                  <code>{card.endpoint}</code>
                </a>
              </dd>
            </div>
            <div>
              <dt>Server</dt>
              <dd>{card.serverInfo}</dd>
            </div>
            <div>
              <dt>Tools</dt>
              <dd>{card.toolCount}</dd>
            </div>
            <div>
              <dt>Auth</dt>
              <dd>{card.auth}</dd>
            </div>
          </dl>
        </article>
      {/each}
    </div>
  </section>

  <section class="catalog-section catalog-section--split" id="create-something-guide-agent">
    <div class="section-copy">
      <p class="catalog-eyebrow">Guide agent</p>
      <h2>{publicGuideAgent.name}</h2>
      <p>{publicGuideAgent.scope}</p>
    </div>

    <article class="guide-panel">
      <dl>
        <div>
          <dt>Public URL</dt>
          <dd><code>{publicGuideAgent.publicUrl}</code></dd>
        </div>
        <div>
          <dt>Runtime</dt>
          <dd>{publicGuideAgent.runtime}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{publicGuideAgent.status}</dd>
        </div>
        <div>
          <dt>Policy pack</dt>
          <dd>{publicGuideAgent.policyPack}</dd>
        </div>
        <div>
          <dt>Eval suite</dt>
          <dd>{publicGuideAgent.evalSuite}</dd>
        </div>
        <div>
          <dt>Boundary</dt>
          <dd>{publicGuideAgent.boundary}</dd>
        </div>
      </dl>
    </article>
  </section>

  <section class="catalog-section catalog-section--split">
    <div class="section-copy">
      <p class="catalog-eyebrow">Launch copy</p>
      <h2>External listing text.</h2>
      <p>{publicTrustListingCopy.longDescription}</p>
    </div>

    <div class="launch-list" role="list">
      {#each publicTrustListingCopy.bullets as item}
        <p role="listitem">{item}</p>
      {/each}
    </div>
  </section>

  <section class="catalog-section">
    <div class="section-copy">
      <p class="catalog-eyebrow">Verification</p>
      <h2>What the launch check proves.</h2>
    </div>

    <div class="verification-table" role="table" aria-label="Public trust catalog verification">
      {#each verificationRows as row}
        <div class="verification-row" role="row">
          <span role="cell">{row[0]}</span>
          <span class="verification-result" role="cell">{row[1]}</span>
        </div>
      {/each}
    </div>
  </section>
</div>

<style>
  .catalog-body {
    background: var(--color-bg-pure);
    padding-bottom: 4rem;
  }

  .catalog-hero {
    color: var(--color-fg-primary);
    overflow: hidden;
    padding: 5rem var(--container-padding, 1.5rem) 3rem;
    position: relative;
  }

  .catalog-hero__grid {
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    position: absolute;
  }

  :global(.catalog-animated-grid) {
    mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
    -webkit-mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
  }

  .catalog-hero__inner,
  .catalog-section {
    margin: 0 auto;
    max-width: var(--content-width-xl);
  }

  .catalog-hero__inner {
    display: grid;
    gap: var(--space-3, 0.75rem);
    position: relative;
    text-align: center;
  }

  .catalog-eyebrow {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h1,
  h2,
  h3,
  p {
    margin: 0;
  }

  h1 {
    color: var(--color-fg-primary);
    font-size: var(--text-h1);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    line-height: 1.1;
    margin: 0 auto;
    max-width: 13ch;
  }

  h2 {
    color: var(--color-fg-primary);
    font-size: var(--text-h2);
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    line-height: 1.05;
  }

  h3 {
    color: var(--color-fg-primary);
    font-size: var(--text-h3, 1.25rem);
    font-weight: var(--font-semibold);
  }

  .hero-copy {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-lg);
    line-height: var(--leading-relaxed);
    margin: 0 auto;
    max-width: 720px;
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 0.75rem;
  }

  .primary-action,
  .secondary-action {
    border-radius: var(--radius-md, 8px);
    font-size: var(--text-body-sm);
    font-weight: var(--font-semibold);
    padding: 0.85rem 1rem;
    text-decoration: none;
    transition:
      border-color var(--duration-standard) var(--ease-standard),
      background var(--duration-standard) var(--ease-standard),
      color var(--duration-standard) var(--ease-standard);
  }

  .primary-action {
    background: var(--color-fg-primary);
    color: var(--color-bg-pure);
  }

  .primary-action:hover {
    background: var(--color-fg-secondary);
  }

  .secondary-action {
    border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08));
    color: var(--color-fg-secondary);
  }

  .secondary-action:hover {
    border-color: rgba(96, 165, 250, 0.4);
    color: var(--color-fg-primary);
  }

  .catalog-section {
    padding: 3rem var(--container-padding, 1.5rem) 0;
  }

  .catalog-section--summary {
    padding-top: 1rem;
  }

  .summary-strip {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    padding: 1rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.05));
    border-radius: var(--radius-md, 8px);
    box-shadow: var(--glass-shine-soft);
  }

  .summary-item {
    display: grid;
    gap: 0.35rem;
    min-width: 0;
    padding: 0.25rem 0.5rem;
  }

  .summary-item span {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
    font-weight: var(--font-semibold);
    text-transform: uppercase;
  }

  .summary-item strong {
    color: var(--color-fg-primary);
    font-size: var(--text-body-sm);
    font-weight: var(--font-semibold);
    line-height: var(--leading-snug, 1.35);
  }

  .catalog-section--split {
    align-items: start;
    display: grid;
    gap: 2rem;
    grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  }

  .section-copy {
    display: grid;
    gap: 0.85rem;
    max-width: 720px;
  }

  .section-copy p {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    line-height: var(--leading-relaxed);
  }

  .trust-card-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin-top: 2rem;
  }

  .trust-card,
  .guide-panel,
  .launch-list,
  .verification-table {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.05));
    border-radius: var(--radius-md, 8px);
    box-shadow: var(--glass-shine-soft);
  }

  .trust-card,
  .guide-panel {
    display: grid;
    gap: 1rem;
    padding: 1.25rem;
  }

  .trust-card__header {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }

  .trust-card__header span,
  .trust-card__header strong {
    border-radius: 999px;
    font-size: var(--text-caption);
    font-weight: var(--font-semibold);
    padding: 0.28rem 0.55rem;
  }

  .trust-card__header span {
    background: rgba(96, 165, 250, 0.1);
    color: rgba(191, 219, 254, 0.9);
  }

  .trust-card__header strong {
    background: var(--color-success-muted);
    color: var(--color-success);
  }

  .trust-card p {
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    line-height: var(--leading-relaxed);
  }

  dl {
    display: grid;
    gap: 0.75rem;
    margin: 0;
  }

  dl div {
    display: grid;
    gap: 0.25rem;
    min-width: 0;
  }

  dt {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
    font-weight: var(--font-semibold);
    text-transform: uppercase;
  }

  dd {
    color: var(--color-fg-primary);
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  code {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.06));
    border-radius: var(--radius-sm, 4px);
    color: var(--color-fg-secondary);
    display: inline-block;
    max-width: 100%;
    padding: 0.18rem 0.35rem;
    white-space: normal;
  }

  .endpoint-link {
    display: inline-block;
    max-width: 100%;
    text-decoration: none;
  }

  .endpoint-link:hover code,
  .endpoint-link:focus-visible code {
    border-color: rgba(96, 165, 250, 0.45);
    color: var(--color-fg-primary);
  }

  .primary-action:focus-visible,
  .secondary-action:focus-visible,
  .endpoint-link:focus-visible {
    outline: 2px solid rgba(191, 219, 254, 0.72);
    outline-offset: 3px;
  }

  .launch-list {
    display: grid;
    gap: 0;
  }

  .launch-list p {
    border-bottom: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.05));
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    line-height: var(--leading-relaxed);
    padding: 1rem 1.25rem;
  }

  .launch-list p:last-child {
    border-bottom: 0;
  }

  .verification-table {
    margin-top: 1.5rem;
    overflow: hidden;
  }

  .verification-row {
    align-items: center;
    border-bottom: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.05));
    display: grid;
    gap: 1rem;
    grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr);
    padding: 1rem 1.25rem;
  }

  .verification-row:last-child {
    border-bottom: 0;
  }

  .verification-row span {
    color: var(--color-fg-secondary);
  }

  .verification-result {
    color: var(--color-fg-primary);
    font-weight: var(--font-semibold);
  }

  @media (max-width: 860px) {
    .catalog-section--split,
    .trust-card-grid,
    .verification-row {
      grid-template-columns: 1fr;
    }

    .summary-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .catalog-hero {
      padding: 3rem var(--container-padding, 1.5rem) 2rem;
    }

    h1 {
      font-size: var(--text-h2);
      max-width: 14ch;
    }
  }

  @media (max-width: 520px) {
    .catalog-section {
      padding-right: 5rem;
    }

    .summary-strip {
      grid-template-columns: 1fr;
    }
  }
</style>
