<script lang="ts">
  interface Props {
    kind?: 'inspection' | 'findings';
    portraitOnMobile?: boolean;
    priority?: boolean;
  }

  let { kind = 'inspection', portraitOnMobile = false, priority = false }: Props = $props();
  const imageRoot = '/images/performance-lab/technical-review';
</script>

<figure class="review-visual" class:portrait={portraitOnMobile && kind === 'inspection'}>
  <picture>
    {#if portraitOnMobile && kind === 'inspection'}
      <source media="(max-width: 47.99rem)" srcset={`${imageRoot}-inspection-mobile.webp`} width="1024" height="1536" />
    {/if}
    <img
      src={`${imageRoot}-${kind}.webp`}
      alt={kind === 'inspection'
        ? 'An ivory model of a connected system, with one part lifted into an inspection frame while its neighbors remain in place.'
        : 'Three findings in a metal tray: a disconnected joint to fix, an adjustable connection to improve later, and an intact connection to retain.'}
      width="1536"
      height="1024"
      loading={priority ? 'eager' : 'lazy'}
      fetchpriority={priority ? 'high' : 'auto'}
      decoding="async"
    />
  </picture>
  <figcaption>
    <span>Concept illustration</span>
    {#if kind === 'inspection'}
      Inspect the agreed part. Keep the rest in view.
    {:else}
      From left: fix before the pilot, improve later, leave alone for now.
    {/if}
  </figcaption>
</figure>

<style>
  .review-visual { margin: 0; min-width: 0; }
  picture, img { display: block; width: 100%; }
  img { height: auto; aspect-ratio: 3 / 2; object-fit: contain; background: var(--color-performance-ink); }
  figcaption { padding-top: .85rem; color: var(--color-performance-ink); font-size: var(--text-body-sm); line-height: 1.5; }
  figcaption span { display: block; margin-bottom: .25rem; font-family: var(--font-mono); font-size: var(--text-body-sm); }
  @media (max-width: 47.99rem) { .portrait img { aspect-ratio: 2 / 3; } }
</style>
