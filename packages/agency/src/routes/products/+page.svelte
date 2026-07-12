<script lang="ts">
  import {
    Button,
    PerformanceCampaignOpening,
    PerformanceCardGrid,
    PerformanceContrastChapter,
    PerformanceConversionHandoff,
    PerformancePageSection,
    PerformanceProofStrip,
    PerformanceThesisConditions,
    PerformanceWorkflowMiniArtifact,
    SEO,
    type PerformanceCardItem,
    type PerformanceCondition,
    type PerformanceProofItem
  } from '@create-something/canon';
  import { listGovernanceProducts, type GovernanceProduct } from '@create-something/canon/governance';
  import WorkflowSignalIcon from '$lib/components/WorkflowSignalIcon.svelte';
  import { products, type Product } from '$lib/data/services';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';

  type ProofStateIconName = 'objects' | 'actions' | 'states' | 'receipts';
  type ProofStateItem = PerformanceProofItem & { icon: ProofStateIconName };
  type ProductSurfaceKind = 'signal' | 'decision' | 'proof';

  const featured = products.filter((product) => product.category === 'featured');
  const governanceProducts = listGovernanceProducts();

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

  const proofStripItems: ProofStateItem[] = [
    {
      icon: 'objects',
      value: 'Map',
      label: 'Atlas shows where the decision sits, which systems it touches, and who owns the path.'
    },
    {
      icon: 'actions',
      value: 'Signal',
      label: 'Slack posts, API changes, PRs, schema diffs, tool calls, and exceptions enter one queue.'
    },
    {
      icon: 'states',
      value: 'Decision',
      label: 'Human, agent, or policy judgment routes the next action before risk moves downstream.'
    },
    {
      icon: 'receipts',
      value: 'Proof',
      label: 'Evidence, policy, owner, outcome, receipt, and rollback notes stay with the work.'
    }
  ];

  const productSurfaceItems: Array<{
    kind?: ProductSurfaceKind;
    label: string;
    title: string;
    detail: string;
    href: string;
  }> = governanceProducts.map((product) => ({
    kind: miniArtifactKind(product),
    label: product.name,
    title: surfaceTitle(product),
    detail: product.description,
    href: product.id === 'atlas' ? '/atlas' : `/products/${product.id}`
  }));

  const proofPathItems = [
    {
      label: 'Map',
      detail: 'Show the affected systems, downstream impact, and review owner before action.'
    },
    {
      label: 'Signal',
      detail: 'Name the source, change, account owner, and authority boundary.'
    },
    {
      label: 'Decision',
      detail: 'Route the judgment to the right human, agent, policy, or workflow state.'
    },
    {
      label: 'Proof',
      detail: 'Record the evidence, outcome, receipt, and recovery path the operator can inspect.'
    }
  ];

  const productProtocol: PerformanceCondition[] = [
    {
      label: 'Map',
      title: 'Objects / owners / gates',
      detail: 'Atlas holds the workflow boundary before an operating surface acts.',
      tone: 'signal'
    },
    {
      label: 'State',
      title: 'Run / Wait / Stop',
      detail: 'Signal and Decision keep intervention legible without collapsing authority.',
      tone: 'pressure'
    },
    {
      label: 'Proof',
      title: 'Receipt + recovery',
      detail: 'Proof preserves outcome, owner, evidence, and the path back.',
      tone: 'growth'
    }
  ];

  const productHierarchy = [
    {
      layer: 'Foundation',
      name: 'Substrate',
      detail: 'Owned objects, state, permissions, events, approvals, runs, and receipts.'
    },
    {
      layer: 'Design surface',
      name: 'Atlas',
      detail: 'The workflow map: systems, owners, handoffs, constraints, and required evidence.'
    },
    {
      layer: 'Runtime surfaces',
      name: 'Signal / Decision / Proof',
      detail: 'Watch the change, route the judgment, and preserve the evidence and outcome.'
    },
    {
      layer: 'Delivery method',
      name: 'Map / Pilot / Operate',
      detail: 'Understand one handoff, prove one controlled lane, then maintain the live system.'
    }
  ] as const;

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

  function proofStateIcon(icon: string | undefined): ProofStateIconName {
    if (icon === 'objects' || icon === 'actions' || icon === 'states' || icon === 'receipts') {
      return icon;
    }

    return 'receipts';
  }

  function miniArtifactKind(product: GovernanceProduct): ProductSurfaceKind | undefined {
    if (product.id === 'signal' || product.id === 'decision' || product.id === 'proof') {
      return product.id;
    }

    return undefined;
  }

  function surfaceTitle(product: GovernanceProduct): string {
    if (product.id === 'atlas') return 'Map the workflow';
    if (product.id === 'signal') return 'Watch the source';
    if (product.id === 'decision') return 'Route the judgment';
    return 'Preserve the record';
  }
</script>

<SEO
  title="AI Workflow Product System | CREATE SOMETHING .agency"
  description="The CREATE SOMETHING product system for controlled AI workflows: Atlas maps the work, Signal watches changes, Decision routes judgment, and Proof preserves the record."
  keywords="AI workflow product system, workflow control layer, Signal Decision Proof, Atlas workflow map, operator surfaces, workflow audit trail"
  ogImage="/og-image.png"
  propertyName="agency"
  {faqItems}
/>

<PerformanceCampaignOpening
  eyebrow="Product system"
  title="One workflow. Four visible jobs."
  lede="Map the work. Watch changes. Route decisions. Keep the record. Atlas, Signal, Decision, and Proof each own one job so automation never hides who is responsible."
  media={{ src: '/images/performance-lab/product-system-natural.webp', mobileSrc: '/images/performance-lab/product-system-natural-mobile.webp', alt: 'Aerial black-and-white view of one water-control structure dividing flow across three channels' }}
  proof={[{ label: 'Atlas', value: 'Map' }, { label: 'Signal', value: 'Watch' }, { label: 'Decision', value: 'Route' }, { label: 'Proof', value: 'Record' }]}
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

<PerformancePageSection
  variant="white"
  eyebrow="Product hierarchy"
  title="One system, from record to operation."
  description="Each name has one stable job. The foundation stores the operating record, Atlas designs the boundary, the runtime surfaces make work inspectable, and the delivery method moves one workflow into service."
>
  {#snippet after()}
    <div class="product-hierarchy" aria-label="CREATE SOMETHING product hierarchy">
      {#each productHierarchy as item, index}
        <article class="product-hierarchy__item">
          <span>{String(index + 1).padStart(2, '0')} · {item.layer}</span>
          <strong>{item.name}</strong>
          <p>{item.detail}</p>
        </article>
      {/each}
    </div>
  {/snippet}
</PerformancePageSection>

<PerformanceContrastChapter
  eyebrow="System anatomy"
  title="One map coordinates three operating surfaces."
  description="Atlas holds the map. Signal watches, Decision routes, and Proof records. Each surface owns one part of the operating path without pretending to be the whole system."
  intervention={{ label: 'Product system', title: 'Atlas → Signal / Decision / Proof', detail: 'Map the work once, then watch the change, route the judgment, and preserve the record.' }}
>
  {#snippet artifact()}
    <aside class="product-system-artifact" aria-label="CREATE SOMETHING product system">
      <div class="product-system-artifact__header">
        <span>AI workflow system</span>
        <strong>Atlas / Signal / Decision / Proof</strong>
      </div>
      <div class="product-system-artifact__atlas">
        <span>Atlas</span>
        <strong>Workflow map</strong>
        <p>Systems, owners, approvals, stops, and proof requirements.</p>
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

<PerformanceThesisConditions
  eyebrow="Product protocol"
  title="The map and operating surfaces stay distinct."
  description="Atlas defines the boundary. Signal, Decision, and Proof operate inside it without hiding ownership inside one interface."
  conditions={productProtocol}
  ariaLabel="Product system protocol"
/>

<PerformancePageSection
  variant="white"
  eyebrow="Product overview"
  title="The product line follows the workflow."
  description="This page is the index: each product surface has one job, a clear owner, and a visible relationship to the others."
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
  variant="soft"
  eyebrow="Operating sequence"
  title="The surfaces stay useful because they stay separate."
  description="Signal, Decision, Map, and Proof are not decorative categories. They are the sequence that keeps a workflow legible while tools and agents do bounded work."
>
  {#snippet after()}
    <PerformanceProofStrip items={proofStripItems} ariaLabel="Workflow proof states">
      {#snippet icon(item)}
        <WorkflowSignalIcon name={proofStateIcon(item.icon)} />
      {/snippet}
    </PerformanceProofStrip>

    <div class="proof-path" aria-label="Inspectable workflow path">
      {#each proofPathItems as step, index}
        <article class="proof-path__item">
          <span class="proof-path__index">{String(index + 1).padStart(2, '0')}</span>
          <div>
            <strong>{step.label}</strong>
            <p>{step.detail}</p>
          </div>
        </article>
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
  title="Apply the proof to the workflow your team still protects by hand."
  description="I’ll map the first workflow, identify the safest signal source, define who decides, and name what proof the control layer should leave behind."
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
  .product-hierarchy {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-block: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .product-hierarchy__item {
    display: grid;
    align-content: start;
    gap: 0.62rem;
    min-height: 14rem;
    padding: 1.3rem;
  }

  .product-hierarchy__item + .product-hierarchy__item {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .product-hierarchy__item span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-mono);
    font-size: 0.69rem;
    font-weight: var(--font-semibold);
    text-transform: uppercase;
  }

  .product-hierarchy__item strong {
    color: var(--color-performance-ink, #090909);
    font-size: 1.08rem;
    font-weight: var(--font-medium);
  }

  .product-hierarchy__item p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.91rem;
    line-height: 1.5;
  }

  .product-system-artifact {
    display: grid;
    gap: 0.95rem;
    padding: 1rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    box-shadow: 0 24px 70px rgb(10 14 25 / 0.08);
  }

  @media (max-width: 800px) {
    .product-hierarchy {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .product-hierarchy__item:nth-child(3) {
      border-left: 0;
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
    }

    .product-hierarchy__item:nth-child(4) {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
    }
  }

  @media (max-width: 520px) {
    .product-hierarchy {
      grid-template-columns: 1fr;
    }

    .product-hierarchy__item {
      min-height: 0;
    }

    .product-hierarchy__item + .product-hierarchy__item {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }
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
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .product-system-artifact__header strong {
    color: var(--color-performance-ink, #090909);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: var(--font-semibold);
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
    font-weight: var(--font-medium);
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
    font-family: var(--font-mono);
    font-size: 0.74rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .product-surface-list {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
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
    font-weight: var(--font-medium);
    line-height: 1.2;
  }

  .product-surface-list__item p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.9rem;
    line-height: 1.43;
  }

  .proof-path {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0;
    margin-top: 0.85rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    overflow: hidden;
  }

  .proof-path__item {
    display: grid;
    grid-template-columns: 2.35rem minmax(0, 1fr);
    gap: 0.8rem;
    min-height: 7.25rem;
    align-items: start;
    padding: 0.95rem;
    border-right: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .proof-path__item:last-child {
    border-right: 0;
  }

  .proof-path__index {
    display: inline-grid;
    place-items: center;
    width: 2.35rem;
    height: 2.35rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-mono);
    font-size: 0.74rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    line-height: 1;
  }

  .proof-path strong {
    display: block;
    color: var(--color-performance-ink, #090909);
    font-size: 1rem;
    font-weight: var(--font-medium);
    line-height: 1.18;
  }

  .proof-path p {
    margin: 0.38rem 0 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.88rem;
    line-height: 1.4;
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

    .proof-path {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .proof-path__item:nth-child(2n) {
      border-right: 0;
    }

    .proof-path__item:nth-child(-n + 2) {
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

    .proof-path {
      grid-template-columns: 1fr;
    }

    .proof-path__item,
    .proof-path__item:nth-child(2n),
    .proof-path__item:nth-child(-n + 2) {
      min-height: auto;
      border-right: 0;
      border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    }

    .proof-path__item:last-child {
      border-bottom: 0;
    }
  }
</style>
