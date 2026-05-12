<script lang="ts">
  import PropertyArtifactCard from './PropertyArtifactCard.svelte';
  import {
    getArtifactHref,
    type PropertyArtifact,
    type PropertyArtifactKind
  } from './property-artifacts.js';

  interface Props {
    artifacts: PropertyArtifact[];
    title?: string;
    subtitle?: string;
    basePath?: string;
    kind?: PropertyArtifactKind;
    actionLabel?: string;
    emptyTitle?: string;
    emptyText?: string;
    columns?: 2 | 3 | 4;
  }

  let {
    artifacts,
    title,
    subtitle,
    basePath = '/experiments',
    kind = 'artifact',
    actionLabel = 'Open artifact',
    emptyTitle = 'No artifacts found',
    emptyText = 'Adjust the filters and try again.',
    columns = 3
  }: Props = $props();
</script>

<section class="property-artifact-section">
  <div class="shell-inner-pad">
    {#if title || subtitle}
      <div class="property-section-lead">
        {#if title}
          <h2>{title}</h2>
        {/if}
        {#if subtitle}
          <p>{subtitle}</p>
        {/if}
      </div>
    {/if}

    {#if artifacts.length > 0}
      <div
        class="property-artifact-grid"
        class:propertyArtifactGrid2={columns === 2}
        class:propertyArtifactGrid4={columns === 4}
      >
        {#each artifacts as artifact, index (artifact.id ?? artifact.slug ?? index)}
          <PropertyArtifactCard
            {artifact}
            href={getArtifactHref(artifact, basePath)}
            {kind}
            {index}
            {actionLabel}
          />
        {/each}
      </div>
    {:else}
      <div class="product-surface product-surface--soft property-artifact-empty">
        <h2>{emptyTitle}</h2>
        <p>{emptyText}</p>
      </div>
    {/if}
  </div>
</section>

<style>
  .property-artifact-section {
    padding-top: 1rem;
    padding-bottom: clamp(3.5rem, 6vw, 5rem);
  }

  .property-artifact-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }

  .propertyArtifactGrid2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .propertyArtifactGrid4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .property-artifact-empty {
    display: grid;
    gap: 0.7rem;
    justify-items: center;
    text-align: center;
    padding: clamp(1.5rem, 4vw, 2.5rem);
  }

  .property-artifact-empty h2,
  .property-artifact-empty p {
    margin: 0;
  }

  .property-artifact-empty h2 {
    color: var(--color-fg-primary);
    line-height: 1.1;
  }

  .property-artifact-empty p {
    color: var(--color-fg-secondary);
    line-height: 1.65;
  }

  @media (max-width: 1180px) {
    .property-artifact-grid,
    .propertyArtifactGrid2,
    .propertyArtifactGrid4 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .property-artifact-grid,
    .propertyArtifactGrid2,
    .propertyArtifactGrid4 {
      grid-template-columns: 1fr;
    }
  }
</style>
