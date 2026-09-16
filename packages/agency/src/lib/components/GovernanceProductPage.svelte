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

  const productScenes: PerformanceNarrativeScene[] = $derived([
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
      title: 'See what this view does and which records it keeps.',
      detail: `In production, ${product.name} is required because it owns ${product.owns.join(', ')}.`,
      tone: 'review',
      evidence: detailCards.map((item) => item.title),
      receipts: product.owns
    },
    {
      id: 'connected-loop',
      label: 'Connected loop',
      summary: 'Continue with context',
      title: 'Map shows how this view connects to the rest of the workflow.',
      detail:
        'Keep the workflow plan, incoming tasks, approvals, and results connected.',
      tone: 'allow',
      evidence: relatedCards.map((item) => item.title),
      receipts: relatedLinks.map((link) => link.label),
      actions: relatedLinks
    }
  ]);
</script>

<PerformancePageSection
  variant="hero"
  layout="split"
  titleLevel="h1"
  expression="editorial"
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
  description="Read what this view shows, how it works, and where to go next."
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
  expression="editorial"
  eyebrow={`${product.name} implementation`}
  title="Attach this surface to a real workflow."
  description="Start with one live task. Agree on who approves it and what record your team needs afterward."
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
