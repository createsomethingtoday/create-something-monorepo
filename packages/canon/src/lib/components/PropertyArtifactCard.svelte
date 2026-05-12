<script lang="ts">
  import {
    getArtifactCategory,
    getArtifactDate,
    getArtifactDescription,
    getArtifactDifficulty,
    getArtifactReadingTime,
    getArtifactTags,
    getArtifactTitle,
    type PropertyArtifact,
    type PropertyArtifactKind
  } from './property-artifacts.js';

  interface Props {
    artifact: PropertyArtifact;
    href: string;
    kind?: PropertyArtifactKind;
    index?: number;
    actionLabel?: string;
    featured?: boolean;
  }

  let {
    artifact,
    href,
    kind = 'artifact',
    index = 0,
    actionLabel = 'Open artifact',
    featured = false
  }: Props = $props();

  const title = $derived(getArtifactTitle(artifact));
  const description = $derived(getArtifactDescription(artifact));
  const category = $derived(getArtifactCategory(artifact, kind));
  const readingTime = $derived(getArtifactReadingTime(artifact));
  const difficulty = $derived(getArtifactDifficulty(artifact));
  const date = $derived(getArtifactDate(artifact));
  const tags = $derived(getArtifactTags(artifact));
  const isFeatured = $derived(Boolean(featured || artifact.featured));
  const hasInteractive = $derived(Boolean(artifact.interactive_demo_url));
</script>

<a
  {href}
  class="product-surface property-artifact-card"
  class:propertyArtifactCardFeatured={isFeatured}
  style:--artifact-index={index}
>
  <div class="property-artifact-card__header">
    <span class="property-content-meta">{category}</span>
    {#if date}
      <span>{date}</span>
    {/if}
  </div>

  <div class="property-artifact-card__body">
    <h3>{title}</h3>
    {#if description}
      <p>{description}</p>
    {/if}
  </div>

  <div class="property-artifact-card__meta" aria-label="Artifact metadata">
    {#if readingTime}
      <span>{readingTime} min</span>
    {/if}
    {#if difficulty}
      <span>{difficulty}</span>
    {/if}
    {#if hasInteractive}
      <span>Interactive</span>
    {/if}
  </div>

  {#if tags.length > 0}
    <div class="property-artifact-card__tags">
      {#each tags as tag}
        <span>{tag}</span>
      {/each}
    </div>
  {/if}

  <span class="property-content-link">{actionLabel}</span>
</a>

<style>
  .property-artifact-card {
    display: grid;
    gap: 1rem;
    min-height: 22rem;
    align-content: space-between;
    text-decoration: none;
    opacity: 1;
    transition:
      transform var(--duration-micro) var(--ease-standard),
      border-color var(--duration-micro) var(--ease-standard),
      background var(--duration-micro) var(--ease-standard);
  }

  .property-artifact-card:hover {
    opacity: 1;
    transform: translateY(-2px);
    border-color: var(--color-shell-border-strong);
    background: var(--color-shell-surface-hover);
  }

  .propertyArtifactCardFeatured {
    border-color: var(--color-brand-primary-border);
    background:
      linear-gradient(180deg, var(--color-brand-primary-soft), var(--color-brand-primary-muted)),
      var(--color-shell-surface-secondary);
  }

  .property-artifact-card__header,
  .property-artifact-card__meta,
  .property-artifact-card__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    align-items: center;
  }

  .property-artifact-card__header {
    justify-content: space-between;
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .property-artifact-card__body {
    display: grid;
    gap: 0.8rem;
  }

  .property-artifact-card h3 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: 1.65rem;
    line-height: 1.08;
    text-wrap: balance;
  }

  .property-artifact-card p {
    margin: 0;
    color: var(--color-fg-secondary);
    line-height: 1.68;
  }

  .property-artifact-card__meta span,
  .property-artifact-card__tags span {
    display: inline-flex;
    align-items: center;
    min-height: 1.85rem;
    padding: 0.34rem 0.58rem;
    border: 1px solid var(--color-shell-border-subtle);
    border-radius: var(--radius-full);
    color: var(--color-fg-secondary);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.04em;
  }

  .property-artifact-card__tags span {
    color: var(--color-fg-muted);
    background: rgba(255, 255, 255, 0.025);
  }

  @media (max-width: 720px) {
    .property-artifact-card h3 {
      font-size: 1.35rem;
    }
  }
</style>
