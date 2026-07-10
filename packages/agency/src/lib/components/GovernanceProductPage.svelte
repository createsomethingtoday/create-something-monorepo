<script lang="ts">
  import {
    Button,
    PerformanceCardGrid,
    PerformanceConversionHandoff,
    PerformancePageSection,
    PerformanceProofStrip,
    PerformanceWorkflowMiniArtifact,
    type PerformanceCardItem,
    type PerformanceCtaItem,
    type PerformanceProofItem
  } from '@create-something/canon';
  import type { GovernanceProduct } from '@create-something/canon/governance';
  import WorkflowSignalIcon from '$lib/components/WorkflowSignalIcon.svelte';

  type ProofStateIconName = 'objects' | 'actions' | 'states' | 'receipts';
  type ProductProofItem = PerformanceProofItem & { icon: ProofStateIconName };

  interface RelatedLink {
    label: string;
    href: string;
  }

  interface Props {
    product: GovernanceProduct;
    title: string;
    description: string;
    heroCards: PerformanceCardItem[];
    pathItems: ProductProofItem[];
    detailCards: PerformanceCardItem[];
    relatedCards: PerformanceCardItem[];
    ctaItems: PerformanceCtaItem[];
    primaryAction: string;
    primaryHref: string;
    secondaryAction: string;
    secondaryHref: string;
    relatedLinks: RelatedLink[];
  }

  let {
    product,
    title,
    description,
    heroCards,
    pathItems,
    detailCards,
    relatedCards,
    ctaItems,
    primaryAction,
    primaryHref,
    secondaryAction,
    secondaryHref,
    relatedLinks
  }: Props = $props();

  function proofStateIcon(icon: string | undefined): ProofStateIconName {
    if (icon === 'objects' || icon === 'actions' || icon === 'states' || icon === 'receipts') {
      return icon;
    }

    return 'receipts';
  }

  function miniArtifactKind(productId: string): 'signal' | 'decision' | 'proof' | undefined {
    if (productId === 'signal' || productId === 'decision' || productId === 'proof') {
      return productId;
    }

    return undefined;
  }
</script>

<PerformancePageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  eyebrow={product.name}
  {title}
  {description}
>
  {#snippet actions()}
    <Button href={primaryHref}>{primaryAction}</Button>
    <Button href={secondaryHref} variant="secondary">{secondaryAction}</Button>
  {/snippet}

  {#snippet aside()}
    <PerformanceCardGrid
      items={heroCards}
      columns={1}
      density="compact"
      ariaLabel={`${product.name} operating cards`}
    />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow={`${product.name} surface`}
  title={`${product.name} owns the ${product.surface.replace('-', ' ')}.`}
  description={product.description}
>
  {#snippet after()}
    {@const artifactKind = miniArtifactKind(product.id)}
    {#if artifactKind}
      <div class="governance-product-artifact">
        <PerformanceWorkflowMiniArtifact
          kind={artifactKind}
          ariaLabel={`${product.name} workflow mini artifact`}
        />
      </div>
    {/if}

    <PerformanceProofStrip items={pathItems} ariaLabel={`${product.name} composition path`}>
      {#snippet icon(item)}
        <WorkflowSignalIcon name={proofStateIcon(item.icon)} />
      {/snippet}
    </PerformanceProofStrip>
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="soft"
  eyebrow="Production contract"
  title="The product boundary stays small enough for operators to inspect."
  description={`In production, ${product.name} is required because it owns ${product.owns.join(', ')}.`}
>
  {#snippet after()}
    <PerformanceCardGrid items={detailCards} columns={3} ariaLabel={`${product.name} production contract`} />
  {/snippet}
</PerformancePageSection>

<PerformancePageSection
  variant="white"
  eyebrow="Connected products"
  title="Atlas connects this product to the rest of the governance loop."
  description="Each page describes one product surface, but production workflows need the four surfaces attached to the same map: Atlas, Signal, Decision, and Proof."
>
  {#snippet after()}
    <PerformanceCardGrid items={relatedCards} columns={3} ariaLabel="Related governance product surfaces" />

    <nav class="governance-product-links" aria-label="Governance product links">
      {#each relatedLinks as link}
        <a href={link.href}>{link.label}</a>
      {/each}
    </nav>
  {/snippet}
</PerformancePageSection>

<PerformanceConversionHandoff
  eyebrow={`${product.name} implementation`}
  title="Attach this surface to a real workflow."
  description="Start with one live workflow, connect the source signal, name the decision owner, and decide which proof record must survive the action."
  steps={ctaItems}
  handoff={{
    owner: `${product.name} operator`,
    authority: `${product.name} production contract`,
    proof: 'Connected workflow receipt',
    state: 'review'
  }}
>
  {#snippet actions()}
    <Button href={primaryHref}>{primaryAction}</Button>
    <Button href={secondaryHref} variant="secondary">{secondaryAction}</Button>
  {/snippet}
</PerformanceConversionHandoff>

<style>
  .governance-product-artifact {
    display: grid;
    justify-items: center;
    margin-bottom: 0.95rem;
    padding: 1.1rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
  }

  .governance-product-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.7rem;
    margin-top: 1rem;
  }

  .governance-product-links a {
    display: inline-flex;
    min-height: 2.35rem;
    align-items: center;
    padding: 0.4rem 0.72rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
    font-size: 0.92rem;
    text-decoration: none;
  }

  .governance-product-links a:hover {
    border-color: var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-paper, #f3f3f0);
    opacity: 1;
  }
</style>
