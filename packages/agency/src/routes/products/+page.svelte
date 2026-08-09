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
  import PlaybookField from '$lib/components/PlaybookField.svelte';
  import {
    listGovernanceProducts,
    type GovernanceProduct
  } from '@create-something/canon/governance';
  import { products, type Product } from '$lib/data/services';
  import AgencyPerformanceReadback from '$lib/components/AgencyPerformanceReadback.svelte';
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
      receipts: ['Standalone', getPublicProduct('map').accessLabel],
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
      receipts: ['Scoped service', getPublicProduct('build').accessLabel],
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
      receipts: ['Map included', getPublicProduct('control').accessLabel],
      actions: [{ label: 'Explore Control', href: getPublicProduct('control').route }]
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
  title="One playbook. Three operating paths."
  lede="Map defines the client-owned Playbook. Build makes its approved Runbooks executable. Control operates and improves the system with visible authority and proof."
  density="compact"
  artifactOwnsMedia
  proof={[
    { label: 'Map', value: 'Define' },
    { label: 'Build', value: 'Connect' },
    { label: 'Control', value: 'Operate' }
  ]}
>
  {#snippet actions()}
    <Button href="#choose-product">Choose the right path</Button>
  {/snippet}
  {#snippet artifact()}
    <PlaybookField variant="products" />
  {/snippet}
</PerformanceCampaignOpening>

<PerformanceNarrativeStage
  id="choose-product"
  eyebrow="Product chooser"
  title="Choose where the workflow is now."
  description="Two products and one implementation service. Signal, Decision, and Proof are operator surfaces. They sit inside Control—not as additive licenses."
  scenes={productScenes}
  ariaLabel="Choose a CREATE SOMETHING product path"
>
  {#snippet artifact(_scene, index)}
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
        <small>{product.accessLabel}</small>
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
  {/snippet}
</PerformanceNarrativeStage>

<AgencyPerformanceReadback embedded={true} />

<section class="product-proof-shelf" aria-labelledby="product-proof-title">
  <div class="product-proof-shelf__heading">
    <div>
      <span>Technical proof</span>
      <h2 id="product-proof-title">Inspect the discipline beneath the system.</h2>
    </div>
    <p>
      Historical and open tools are evidence, not additional commercial products. Ground and the
      Loom archive show the discipline beneath Map, Build, and Control.
    </p>
  </div>
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
</section>

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
  .product-choice small,
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

  .product-choice small {
    width: fit-content;
    padding-top: 0.55rem;
    border-top: 1px solid var(--color-performance-line, #d7d7d2);
    color: var(--color-performance-muted, #5e6268);
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

  .product-proof-shelf {
    padding: clamp(3.5rem, 7vw, 6rem) clamp(1.25rem, 5vw, 6rem);
    border-block: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #fff);
  }

  .product-proof-shelf__heading,
  .product-proof-shelf > .proof-chooser {
    width: min(var(--content-width-performance, 85rem), 100%);
    margin-inline: auto;
  }

  .product-proof-shelf__heading {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(20rem, 0.9fr);
    align-items: end;
    gap: clamp(2rem, 6vw, 7rem);
    margin-bottom: clamp(2rem, 4vw, 3.5rem);
  }

  .product-proof-shelf__heading span {
    color: var(--color-performance-signal, #0f62fe);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold, 650);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .product-proof-shelf__heading h2 {
    max-width: 15ch;
    margin: 0.65rem 0 0;
    font-size: clamp(2.5rem, 5vw, 5rem);
    font-weight: var(--font-performance-regular, 400);
    letter-spacing: -0.05em;
    line-height: 0.96;
  }

  .product-proof-shelf__heading p {
    max-width: 40rem;
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: clamp(1rem, 1.35vw, 1.2rem);
    line-height: 1.55;
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
    .product-proof-shelf__heading {
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }

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

    .proof-chooser {
      grid-template-columns: 1fr;
      grid-auto-flow: row;
      grid-auto-columns: auto;
      overflow-x: visible;
      scroll-snap-type: none;
    }

    .proof-chooser a + a {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }
  }
</style>
