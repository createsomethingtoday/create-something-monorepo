<script lang="ts">
  import {
    Button,
    ClearCardGrid,
    ClearCtaBand,
    ClearPageSection,
    ClearProofStrip,
    type ClearCardItem,
    type ClearCtaItem,
    type ClearProofItem
  } from '@create-something/canon';
  import type { GovernanceProduct } from '@create-something/canon/governance';
  import WorkflowSignalIcon from '$lib/components/WorkflowSignalIcon.svelte';

  type ProofStateIconName = 'objects' | 'actions' | 'states' | 'receipts';
  type ProductProofItem = ClearProofItem & { icon: ProofStateIconName };

  interface RelatedLink {
    label: string;
    href: string;
  }

  interface Props {
    product: GovernanceProduct;
    title: string;
    description: string;
    heroCards: ClearCardItem[];
    pathItems: ProductProofItem[];
    detailCards: ClearCardItem[];
    relatedCards: ClearCardItem[];
    ctaItems: ClearCtaItem[];
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
</script>

<ClearPageSection
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
    <ClearCardGrid
      items={heroCards}
      columns={1}
      density="compact"
      ariaLabel={`${product.name} operating cards`}
    />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow={`${product.name} surface`}
  title={`${product.name} owns the ${product.surface.replace('-', ' ')}.`}
  description={product.description}
>
  {#snippet after()}
    <ClearProofStrip items={pathItems} ariaLabel={`${product.name} composition path`}>
      {#snippet icon(item)}
        <WorkflowSignalIcon name={proofStateIcon(item.icon)} />
      {/snippet}
    </ClearProofStrip>
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="soft"
  eyebrow="Production contract"
  title="The product boundary stays small enough for operators to inspect."
  description={`In production, ${product.name} is required because it owns ${product.owns.join(', ')}.`}
>
  {#snippet after()}
    <ClearCardGrid items={detailCards} columns={3} ariaLabel={`${product.name} production contract`} />
  {/snippet}
</ClearPageSection>

<ClearPageSection
  variant="white"
  eyebrow="Connected products"
  title="Atlas connects this product to the rest of the governance loop."
  description="Each page describes one product surface, but production workflows need the four surfaces attached to the same map: Atlas, Signal, Decision, and Proof."
>
  {#snippet after()}
    <ClearCardGrid items={relatedCards} columns={3} ariaLabel="Related governance product surfaces" />

    <nav class="governance-product-links" aria-label="Governance product links">
      {#each relatedLinks as link}
        <a href={link.href}>{link.label}</a>
      {/each}
    </nav>
  {/snippet}
</ClearPageSection>

<ClearCtaBand
  eyebrow={`${product.name} implementation`}
  title="Attach this surface to a real workflow."
  description="Start with one live workflow, connect the source signal, name the decision owner, and decide which proof record must survive the action."
  items={ctaItems}
>
  {#snippet actions()}
    <Button href={primaryHref}>{primaryAction}</Button>
    <Button href={secondaryHref} variant="secondary">{secondaryAction}</Button>
  {/snippet}
</ClearCtaBand>

<style>
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
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-radius: var(--radius-clear-sm, 4px);
    background: var(--color-clear-panel, #ffffff);
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 0.92rem;
    text-decoration: none;
  }

  .governance-product-links a:hover {
    border-color: var(--color-clear-border-strong, #cecece);
    background: var(--color-clear-porcelain, #f9f9f9);
    opacity: 1;
  }
</style>
