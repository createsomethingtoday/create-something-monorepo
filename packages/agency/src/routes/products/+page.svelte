<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceCardGrid,
    PerformanceContrastChapter,
    PerformanceConversionHandoff,
    PerformancePageSection,
    PerformanceWorkflowMiniArtifact,
    SEO,
    type PerformanceCardItem
  } from '@create-something/canon';
  import { listGovernanceProducts, type GovernanceProduct } from '@create-something/canon/governance';
  import { products, type Product } from '$lib/data/services';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { PUBLIC_PRODUCT_SEQUENCE, getPublicProduct } from '$lib/data/productFamily';

  type ProductSurfaceKind = 'signal' | 'decision' | 'proof';

  const featured = products.filter((product) => product.category === 'featured');
  const governanceProducts = listGovernanceProducts();
  const familyItems: PerformanceCardItem[] = PUBLIC_PRODUCT_SEQUENCE.map((productId) => {
    const product = getPublicProduct(productId);
    return {
      eyebrow: product.kind === 'subscription' ? 'Standalone subscription' : 'Implementation service',
      title: product.name,
      detail: product.outcome,
      href: product.route,
      points:
        product.id === 'control'
          ? ['Control includes Map', 'Monthly or yearly', 'Inbox / Map / Proof']
          : product.id === 'map'
            ? ['Living workflow definition', 'Monthly or yearly', 'Useful on its own']
            : ['Scoped implementation', 'Owned system and handoff', 'Quoted separately']
    };
  });

  const faqItems = [
    {
      question: 'What counts as proof?',
      answer:
        'Proof means delivery records, tools, connectors, and client builds that show which signal arrived, who decided, what evidence was used, what changed, what stayed private, and what still needs an owner.'
    },
    {
      question: 'Why are Ground and Loom MCP included?',
      answer:
        'Ground shows the verify-before-claiming discipline, while Loom MCP shows why long-running agent work needs ownership, checkpoints, and handoff evidence.'
    },
    {
      question: 'How does proof become a client workflow?',
      answer:
        'The paid work turns proof primitives into scoped actions, approval states, blocked-state receipts, and an operating path the client can inspect.'
    }
  ];

  const productSurfaceItems: Array<{
    kind?: ProductSurfaceKind;
    label: string;
    title: string;
    detail: string;
    href: string;
  }> = governanceProducts.filter((product) => product.id !== 'atlas').map((product) => ({
    kind: miniArtifactKind(product),
    label: product.name,
    title: surfaceTitle(product),
    detail: product.description,
    href: `/products/${product.id}`
  }));

  function productCard(product: Product): PerformanceCardItem {
    const points = [product.tagline, product.npmPackage, product.client, product.timeline].filter(
      Boolean
    ) as string[];
    const icon =
      product.category === 'integration'
        ? 'plus'
        : product.category === 'client'
          ? 'folder'
          : product.category === 'featured'
            ? 'check'
            : 'settings';

    return {
      eyebrow: product.badge ?? product.category,
      icon,
      title: product.title,
      detail: product.description,
      href: product.href,
      points: points.length ? points : undefined
    };
  }

  function miniArtifactKind(product: GovernanceProduct): ProductSurfaceKind | undefined {
    if (product.id === 'signal' || product.id === 'decision' || product.id === 'proof') {
      return product.id;
    }

    return undefined;
  }

  function surfaceTitle(product: GovernanceProduct): string {
    if (product.id === 'signal') return 'Watch the source';
    if (product.id === 'decision') return 'Route the judgment';
    return 'Preserve the record';
  }
</script>

<SEO
  title="Map and Control | CREATE SOMETHING .agency"
  description="CREATE SOMETHING Map defines the workflow. CREATE SOMETHING Control governs operation and includes Map. CREATE SOMETHING Build connects the approved system."
  keywords="workflow mapping subscription, AI workflow control, governed execution, workflow implementation service, operator surfaces"
  ogImage="/og-image.png"
  propertyName="agency"
  {faqItems}
/>

<PerformanceCampaignOpening
  eyebrow="Product system"
  title="Map the system. Control the work."
  lede="CREATE SOMETHING Map stands alone as a living workflow definition. CREATE SOMETHING Control stands alone as the governed operating product and includes Map. CREATE SOMETHING Build is the implementation service when you want us to connect the approved system."
  media={{ src: '/images/performance-lab/product-system-natural.webp', mobileSrc: '/images/performance-lab/product-system-natural-mobile.webp', alt: 'Aerial black-and-white view of one water-control structure dividing flow across three channels' }}
  proof={[{ label: 'Map', value: 'Define' }, { label: 'Build', value: 'Connect' }, { label: 'Control', value: 'Operate' }]}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.selfMapHref}>
      {agencyCoreMessaging.selfMapLabel}
    </Button>
    <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
  {/snippet}
</PerformanceCampaignOpening>

<PerformanceContrastChapter
  eyebrow="Product anatomy"
  title="Map -> Build -> Control"
  description="Map defines the system. Build connects it when implementation is needed. Control operates it through Signal, Decision, and Proof. Control includes Map, so governed workflows never lose their legible definition."
  intervention={{ label: 'One shared system', title: 'Define -> Connect -> Operate', detail: 'Two standalone products and one implementation service reuse the same workflow, canvas, policy, and receipt contracts.' }}
>
  {#snippet artifact()}
    <aside class="product-system-artifact" aria-label="CREATE SOMETHING product system">
      <div class="product-system-artifact__header">
        <span>AI workflow system</span>
        <strong>Map / Build / Control</strong>
      </div>
      <div class="product-system-artifact__atlas">
        <span>Map</span>
        <strong>Living workflow definition</strong>
        <p>Systems, owners, approvals, stops, proof requirements, versions, and handoff.</p>
      </div>
      <div class="product-system-artifact__surfaces">
        <div>
          <PerformanceWorkflowMiniArtifact kind="signal" ariaLabel="Signal mini artifact" />
          <strong>Signal</strong>
        </div>
        <div>
          <PerformanceWorkflowMiniArtifact kind="decision" ariaLabel="Decision mini artifact" />
          <strong>Decision</strong>
        </div>
        <div>
          <PerformanceWorkflowMiniArtifact kind="proof" ariaLabel="Proof mini artifact" />
          <strong>Proof</strong>
        </div>
      </div>
    </aside>
  {/snippet}
</PerformanceContrastChapter>

<PerformancePageSection
  variant="white"
  eyebrow="Product overview"
  title="Two products and one implementation service."
  description="Subscribe to Map by itself, use Build when you want CREATE SOMETHING to implement the approved definition, or subscribe to Control for governed operation with Map included."
>
  {#snippet after()}
    <PerformanceCardGrid
      items={familyItems}
      columns={3}
      ariaLabel="CREATE SOMETHING Map Build and Control family"
    />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Inside Control"
  title="Signal, Decision, and Proof are operator surfaces."
  description="They are not additive licenses. Together they let Control watch a change, route the judgment, and preserve the result against the workflow Map."
>
  {#snippet after()}
    <div class="product-surface-list" aria-label="CREATE SOMETHING product surfaces">
      {#each productSurfaceItems as item}
        <a class="product-surface-list__item" href={item.href}>
          <span class="product-surface-list__label">{item.label}</span>
          <div class="product-surface-list__visual" aria-hidden="true">
            {#if item.kind}
              <PerformanceWorkflowMiniArtifact kind={item.kind} />
            {:else}
              <span class="product-surface-list__atlas">
                <i></i>
                <b></b>
                <em></em>
              </span>
            {/if}
          </div>
          <strong>{item.title}</strong>
          <p>{item.detail}</p>
        </a>
      {/each}
    </div>
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Supporting proof"
  title="Framework and tool proof sit under the product system."
  description="Ground and Loom MCP are evidence of the same operating rule in public: watch the signal, verify before deciding, preserve ownership, and keep evidence with the work."
>
  {#snippet after()}
    <PerformanceCardGrid
      items={featured.map(productCard)}
      columns={2}
      ariaLabel="Flagship proof surfaces"
    />
  {/snippet}
</PerformancePageSection>

<PerformanceConversionHandoff
  eyebrow="Apply the proof"
  title="Start with the workflow your team still protects by hand."
  description="Use Map to define it, Build to connect it, or Control to operate it with approvals and proof. Control includes Map."
  handoff={{ owner: 'Workflow owner', authority: 'Human approval', proof: 'Map + state + receipt', state: 'ready' }}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.selfMapHref}>
      {agencyCoreMessaging.selfMapLabel}
    </Button>
    <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
  {/snippet}
</PerformanceConversionHandoff>

<style>
  .product-system-artifact {
    display: grid;
    gap: 0.95rem;
    padding: 1rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    box-shadow: 0 24px 70px rgb(10 14 25 / 0.08);
  }

  .product-system-artifact__header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .product-system-artifact__header span,
  .product-system-artifact__atlas span,
  .product-surface-list__label {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .product-system-artifact__header strong {
    color: var(--color-performance-ink, #090909);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold);
    line-height: 1.2;
    text-align: right;
    text-transform: uppercase;
  }

  .product-system-artifact__atlas {
    display: grid;
    gap: 0.25rem;
    padding: 0.95rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background:
      linear-gradient(var(--color-performance-grid, rgb(9 9 9 / 0.055)) 1px, transparent 1px),
      linear-gradient(90deg, var(--color-performance-grid, rgb(9 9 9 / 0.055)) 1px, transparent 1px),
      var(--color-performance-paper, #f3f3f0);
    background-size: 22px 22px;
  }

  .product-system-artifact__atlas strong {
    color: var(--color-performance-ink, #090909);
    font-size: 1.08rem;
    font-weight: var(--font-performance-medium);
    line-height: 1.15;
  }

  .product-system-artifact__atlas p {
    max-width: 24rem;
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.9rem;
    line-height: 1.42;
  }

  .product-system-artifact__surfaces {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.65rem;
  }

  .product-system-artifact__surfaces > div {
    display: grid;
    grid-template-columns: minmax(14.5rem, 1fr) auto;
    min-height: 6.4rem;
    align-items: center;
    gap: 0.9rem;
    padding: 0.72rem 0.9rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
  }

  .product-system-artifact__surfaces > div :global(.clear-workflow-mini-artifact) {
    justify-content: start;
    width: min(100%, 14.36rem);
    margin-inline: 0;
  }

  .product-system-artifact__surfaces > div :global(.clear-workflow-mini-artifact--proof) {
    width: min(100%, 13.18rem);
  }

  .product-system-artifact__surfaces strong {
    justify-self: end;
    color: var(--color-performance-ink, #090909);
    font-family: var(--font-performance-mono);
    font-size: 0.74rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .product-surface-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    overflow: hidden;
  }

  .product-surface-list__item {
    display: grid;
    grid-template-rows: auto 8rem auto 1fr;
    gap: 0.7rem;
    min-height: 19rem;
    padding: 1rem;
    border-right: 1px solid var(--color-performance-line, #d7d7d2);
    color: inherit;
    text-decoration: none;
  }

  .product-surface-list__item:last-child {
    border-right: 0;
  }

  .product-surface-list__item:hover {
    background: var(--color-performance-paper, #f3f3f0);
    opacity: 1;
  }

  .product-surface-list__visual {
    display: grid;
    min-height: 8rem;
    place-items: center;
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .product-surface-list__atlas {
    position: relative;
    display: block;
    width: min(100%, 11.5rem);
    height: 4.6rem;
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
    border-radius: var(--radius-performance-sm, 4px);
    background:
      linear-gradient(var(--color-performance-grid, rgb(9 9 9 / 0.055)) 1px, transparent 1px),
      linear-gradient(90deg, var(--color-performance-grid, rgb(9 9 9 / 0.055)) 1px, transparent 1px),
      var(--color-performance-panel, #ffffff);
    background-size: 14px 14px;
  }

  .product-surface-list__atlas i,
  .product-surface-list__atlas b,
  .product-surface-list__atlas em {
    position: absolute;
    display: block;
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
  }

  .product-surface-list__atlas i {
    width: 2.1rem;
    height: 1.45rem;
    left: 1.05rem;
    top: 0.9rem;
  }

  .product-surface-list__atlas b {
    width: 2.7rem;
    height: 1.65rem;
    left: 4.35rem;
    top: 2rem;
  }

  .product-surface-list__atlas em {
    width: 2.25rem;
    height: 1.35rem;
    right: 1rem;
    top: 1rem;
  }

  .product-surface-list__item strong {
    color: var(--color-performance-ink, #090909);
    font-size: 1rem;
    font-weight: var(--font-performance-medium);
    line-height: 1.2;
  }

  .product-surface-list__item p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.9rem;
    line-height: 1.43;
  }

  @media (max-width: 980px) {
    .product-surface-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .product-surface-list__item:nth-child(2n) {
      border-right: 0;
    }

    .product-surface-list__item:nth-child(-n + 2) {
      border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    }

  }

  @media (max-width: 640px) {
    .product-system-artifact__header {
      display: grid;
    }

    .product-system-artifact__header strong {
      text-align: left;
    }

    .product-system-artifact__surfaces > div {
      grid-template-columns: 1fr;
      min-height: 7.4rem;
      justify-items: center;
      text-align: center;
    }

    .product-system-artifact__surfaces > div :global(.clear-workflow-mini-artifact) {
      justify-content: center;
      margin-inline: auto;
    }

    .product-system-artifact__surfaces strong {
      justify-self: center;
    }

    .product-surface-list {
      grid-template-columns: 1fr;
    }

    .product-surface-list__item,
    .product-surface-list__item:nth-child(2n),
    .product-surface-list__item:nth-child(-n + 2) {
      grid-template-rows: auto auto auto;
      min-height: auto;
      border-right: 0;
      border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    }

    .product-surface-list__item:last-child {
      border-bottom: 0;
    }

    .product-surface-list__visual {
      min-height: 6.5rem;
    }

  }
</style>
