<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    PerformanceWorkflowMiniArtifact,
    SEO,
    type PerformanceNarrativeScene
  } from '@create-something/canon';
  import {
    listGovernanceProducts,
    type GovernanceProduct
  } from '@create-something/canon/governance';
  import { products, type Product } from '$lib/data/services';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { PUBLIC_PRODUCT_SEQUENCE, getPublicProduct } from '$lib/data/productFamily';

  type ProductSurfaceKind = 'signal' | 'decision' | 'proof';

  const familyProducts = PUBLIC_PRODUCT_SEQUENCE.map(getPublicProduct);
  const featured = products.filter((product) => product.category === 'featured');
  const governanceProducts = listGovernanceProducts();
  const productSurfaceItems: Array<{
    kind?: ProductSurfaceKind;
    label: string;
    title: string;
    detail: string;
    href: string;
  }> = governanceProducts
    .filter((product) => product.id !== 'atlas')
    .map((product) => ({
      kind: miniArtifactKind(product),
      label: product.name,
      title: surfaceTitle(product),
      detail: product.description,
      href: `/products/${product.id}`
    }));

  const productScenes: PerformanceNarrativeScene[] = [
    {
      id: 'map',
      label: 'Map the workflow',
      summary: 'Define',
      title: 'Make the system legible before implementation.',
      detail:
        'Map is a standalone subscription for systems, owners, approvals, stops, proof requirements, versions, and handoff.',
      tone: 'neutral',
      evidence: [
        'Living typed definition',
        'Useful before or after implementation',
        'Included with Control'
      ],
      receipts: ['Standalone', 'Monthly / yearly'],
      actions: [{ label: 'Explore Map', href: getPublicProduct('map').route }]
    },
    {
      id: 'build',
      label: 'Build the approved system',
      summary: 'Connect',
      title: 'Turn the agreed map into an owned implementation.',
      detail:
        'Build is the scoped service for connecting the approved workflow, its policy boundaries, verification, and handoff.',
      tone: 'review',
      evidence: ['Approved definition', 'Connected implementation', 'Operating handoff'],
      receipts: ['Scoped service', 'Quoted separately'],
      actions: [{ label: 'Explore Build', href: getPublicProduct('build').route }]
    },
    {
      id: 'control',
      label: 'Control live operation',
      summary: 'Operate',
      title: 'Watch the signal. Route the decision. Preserve proof.',
      detail:
        'Control is the governed operating product. It includes Map and keeps delegated work inside explicit authority, approval, evidence, and recovery boundaries.',
      tone: 'allow',
      evidence: ['Signal watches change', 'Decision routes judgment', 'Proof preserves the result'],
      receipts: ['Map included', 'Monthly / yearly'],
      actions: [{ label: 'Explore Control', href: getPublicProduct('control').route }]
    },
    {
      id: 'proof',
      label: 'Inspect public proof',
      summary: 'Verify',
      title: 'See the operating rule working in public.',
      detail:
        'Ground and the Loom archive show the same discipline beneath the commercial system: verify before claiming, preserve ownership, and keep evidence with the work.',
      tone: 'neutral',
      evidence: ['Ground checks before it claims', 'Loom preserves historical coordination proof'],
      receipts: ['Open source', 'Inspectable'],
      actions: [{ label: 'Read field reports', href: '/field-reports' }]
    }
  ];

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

  function productCard(product: Product) {
    return {
      label: product.badge ?? product.category ?? 'Proof',
      title: product.title,
      detail: product.description,
      href: product.href ?? '/field-reports',
      receipt: product.npmPackage ?? product.timeline
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

  function familyPoints(index: number) {
    if (index === 0)
      return ['Living workflow definition', 'Standalone subscription', 'Included with Control'];
    if (index === 1) return ['Scoped implementation', 'Owned system', 'Verified handoff'];
    return ['Inbox / Map / Proof', 'Human approvals', 'Recurring review'];
  }
</script>

<SEO
  title="Map, Build, and Control | CREATE SOMETHING .agency"
  description="Choose the CREATE SOMETHING path that fits: Map defines the workflow, Build connects it, and Control operates it with explicit authority and proof."
  keywords="workflow mapping subscription, AI workflow control, governed execution, workflow implementation service, operator surfaces"
  ogImage="/og-image.png"
  propertyName="agency"
  {faqItems}
/>

<PerformanceCampaignOpening
  eyebrow="Product system"
  title="Map the system. Control the work."
  lede="CREATE SOMETHING Map stands alone as the living definition. CREATE SOMETHING Control stands alone as the governed operating product and includes Map. Build connects the approved system."
  density="compact"
  media={{
    src: '/images/performance-lab/product-system-natural.webp',
    mobileSrc: '/images/performance-lab/product-system-natural-mobile.webp',
    alt: 'Aerial black-and-white view of one water-control structure dividing flow across three channels'
  }}
  proof={[
    { label: 'Map', value: 'Define' },
    { label: 'Build', value: 'Connect' },
    { label: 'Control', value: 'Operate' }
  ]}
>
  {#snippet actions()}
    <Button href="#choose-product">Choose the right path</Button>
  {/snippet}
</PerformanceCampaignOpening>

<PerformanceNarrativeStage
  id="choose-product"
  eyebrow="Product chooser"
  title="Map -> Build -> Control"
  description="Two products and one implementation service. Signal, Decision, and Proof are operator surfaces. They sit inside Control—not as additive licenses."
  scenes={productScenes}
  ariaLabel="Choose a CREATE SOMETHING product or proof path"
>
  {#snippet artifact(_scene, index)}
    {#if index < familyProducts.length}
      {@const product = familyProducts[index]}
      <article class="product-choice" data-product={product.id}>
        <div class="product-choice__identity">
          <span
            >{product.kind === 'subscription'
              ? 'Standalone subscription'
              : 'Implementation service'}</span
          >
          <strong>{product.name}</strong>
          <p>{product.customerJob}</p>
        </div>
        <ul>
          {#each familyPoints(index) as point}<li>{point}</li>{/each}
        </ul>
      </article>

      {#if product.id === 'control'}
        <div class="control-surfaces" aria-label="Operator surfaces included in Control">
          {#each productSurfaceItems as item}
            <a href={item.href}>
              <span>{item.label}</span>
              {#if item.kind}
                <PerformanceWorkflowMiniArtifact kind={item.kind} />
              {/if}
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </a>
          {/each}
        </div>
      {/if}
    {:else}
      <div class="proof-chooser" aria-label="Public product proof">
        {#each featured.map(productCard) as item}
          <a href={item.href}>
            <span>{item.label}</span>
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
            <small>{item.receipt}</small>
          </a>
        {/each}
      </div>
    {/if}
  {/snippet}
</PerformanceNarrativeStage>

<PerformanceConversionHandoff
  eyebrow="Apply the system"
  title="Start with the workflow your team still protects by hand."
  description="Use Map to define it, Build to connect it, or Control to operate it with approvals and proof. Control includes Map."
  handoff={{
    owner: 'Workflow owner',
    authority: 'Human approval',
    proof: 'Map + state + receipt',
    state: 'ready'
  }}
>
  {#snippet actions()}
    <Button href={agencyCoreMessaging.selfMapHref}>{agencyCoreMessaging.selfMapLabel}</Button>
    <Button href={agencyCoreMessaging.workflowMappingSessionHref} variant="secondary">
      {agencyCoreMessaging.bookMappingSessionLabel}
    </Button>
  {/snippet}
</PerformanceConversionHandoff>

<style>
  .product-choice,
  .control-surfaces,
  .proof-chooser {
    min-width: 0;
  }

  .product-choice {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(12rem, 0.65fr);
    gap: 1rem;
    padding: 1rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #fff);
  }

  .product-choice__identity {
    display: grid;
    gap: 0.5rem;
  }

  .product-choice span,
  .control-surfaces span,
  .proof-chooser span,
  .proof-chooser small {
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    text-transform: uppercase;
  }

  .product-choice strong {
    font-family: var(--font-performance-display);
    font-size: clamp(1.45rem, 2vw, 2rem);
    font-weight: var(--font-performance-display-weight);
    letter-spacing: var(--tracking-performance-display);
  }

  .product-choice p,
  .control-surfaces p,
  .proof-chooser p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.45;
  }

  .product-choice ul {
    display: grid;
    align-content: start;
    gap: 0.45rem;
    margin: 0;
    padding-left: 1rem;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.85rem;
  }

  .control-surfaces,
  .proof-chooser {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-top: 0;
  }

  .proof-chooser {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .control-surfaces a,
  .proof-chooser a {
    display: grid;
    gap: 0.65rem;
    min-width: 0;
    padding: 0.9rem;
    color: inherit;
    text-decoration: none;
  }

  .control-surfaces a + a,
  .proof-chooser a + a {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .control-surfaces a:hover,
  .proof-chooser a:hover {
    background: var(--color-performance-paper, #f3f3f0);
  }

  .control-surfaces a:focus-visible,
  .proof-chooser a:focus-visible {
    outline: 3px solid var(--color-performance-signal, #0057b8);
    outline-offset: -3px;
  }

  .control-surfaces strong,
  .proof-chooser strong {
    font-size: 1rem;
    font-weight: var(--font-performance-semibold);
  }

  .control-surfaces :global(.performance-workflow-mini-artifact) {
    max-height: 7rem;
    overflow: hidden;
  }

  @media (max-width: 48rem) {
    .product-choice {
      grid-template-columns: 1fr;
    }

    .control-surfaces,
    .proof-chooser {
      grid-template-columns: none;
      grid-auto-flow: column;
      grid-auto-columns: minmax(15rem, 82vw);
      max-width: 100%;
      overflow-x: auto;
      overscroll-behavior-inline: contain;
      scroll-snap-type: inline mandatory;
    }

    .control-surfaces a,
    .proof-chooser a {
      scroll-snap-align: start;
    }

    .control-surfaces a + a,
    .proof-chooser a + a {
      border-left: 1px solid var(--color-performance-line, #d7d7d2);
    }
  }
</style>
