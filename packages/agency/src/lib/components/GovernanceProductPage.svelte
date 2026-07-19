<script lang="ts">
  import {
    Button,
    PerformanceCardGrid,
    PerformanceConversionHandoff,
    PerformanceNarrativeStage,
    PerformancePageSection,
    PerformanceProofStrip,
    PerformanceWorkflowMiniArtifact,
    type PerformanceCardItem,
    type PerformanceCtaItem,
    type PerformanceNarrativeScene,
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

  const productScenes: PerformanceNarrativeScene[] = [
    {
      id: 'surface',
      label: 'Surface and path',
      summary: 'See the boundary',
      title: `${product.name} owns the ${product.surface.replace('-', ' ')}.`,
      detail: product.description,
      tone: 'neutral',
      evidence: pathItems.map((item) => `${item.value}: ${item.label}`),
      receipts: [`Surface: ${product.surface}`, `${pathItems.length} connected states`]
    },
    {
      id: 'contract',
      label: 'Production contract',
      summary: 'Inspect ownership',
      title: 'The boundary stays small enough for operators to inspect.',
      detail: `In production, ${product.name} is required because it owns ${product.owns.join(', ')}.`,
      tone: 'review',
      evidence: detailCards.map((item) => item.title),
      receipts: product.owns
    },
    {
      id: 'connected-loop',
      label: 'Connected loop',
      summary: 'Continue with context',
      title: 'Atlas connects this surface to the rest of the governance loop.',
      detail:
        'Production workflows need Map, Signal, Decision, and Proof attached to the same operating boundary.',
      tone: 'allow',
      evidence: relatedCards.map((item) => item.title),
      receipts: relatedLinks.map((link) => link.label),
      actions: relatedLinks
    }
  ];
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

<PerformanceNarrativeStage
  id={`${product.id}-operating-boundary`}
  eyebrow={`${product.name} operating boundary`}
  title="One surface. Three questions."
  description="See what the surface owns, inspect its production contract, then continue through the connected governance loop."
  scenes={productScenes}
  ariaLabel={`${product.name} operating boundary`}
>
  {#snippet artifact(_scene, index)}
    {#if index === 0}
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
    {:else if index === 1}
      <PerformanceCardGrid
        items={detailCards}
        columns={3}
        density="compact"
        ariaLabel={`${product.name} production contract`}
      />
    {:else}
      <PerformanceCardGrid
        items={relatedCards}
        columns={3}
        density="compact"
        ariaLabel="Related governance product surfaces"
      />
    {/if}
  {/snippet}
</PerformanceNarrativeStage>

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
</style>
