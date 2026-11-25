<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { CanonTaskSceneKey } from '$lib/canon-task-scenes';
  import { journalArtwork, type JournalIllustration } from '$lib/config/journalArtwork';
  let { scene, illustration, caption: _caption, children }: { scene: CanonTaskSceneKey; illustration?: JournalIllustration; caption: string; children: Snippet } = $props();
  const artwork = $derived(journalArtwork(scene, illustration));
</script>

<section class="io-journal-opening">
  <div class="io-journal-opening__copy">{@render children()}</div>
  <figure>
    <img src={artwork.src} srcset={artwork.srcset} sizes="(max-width: 760px) calc(100vw - 40px), 560px" alt={artwork.alt} width={artwork.width} height={artwork.height} fetchpriority="high" />
    <figcaption>Concept illustration · {artwork.caption}</figcaption>
  </figure>
</section>

<style>
  .io-journal-opening { width: min(1184px, calc(100% - 64px)); margin: 0 auto; padding-block: 72px 56px; display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 64px; align-items: center; border-bottom: 1px solid var(--color-performance-line); }
  .io-journal-opening__copy { min-width: 0; }
  .io-journal-opening__copy :global(> div) { display: block !important; margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: none !important; min-height: 0 !important; border: 0 !important; background: transparent !important; color: inherit !important; }
  .io-journal-opening__copy :global(.research-index-inner),
  .io-journal-opening__copy :global(.hero-grid),
  .io-journal-opening__copy :global(.story-opening),
  .io-journal-opening__copy :global(.io-reference-copy),
  .io-journal-opening__copy :global(.max-w-4xl),
  .io-journal-opening__copy :global(.max-w-6xl),
  .io-journal-opening__copy :global(.max-w-7xl),
  .io-journal-opening__copy :global(.wrap) { display: block !important; width: 100%; max-width: none; margin: 0; padding: 0; }
  .io-journal-opening__copy :global(h1) { color: var(--color-performance-ink); font-family: 'IO STIX',Georgia,serif; font-size: clamp(40px,5vw,72px); font-weight: 400; line-height: 1.04; letter-spacing: -.035em; }
  .io-journal-opening__copy :global(p) { color: var(--color-performance-muted); }
  figure { margin: 0; min-width: 0; }
  img { width: 100%; height: auto; border-radius: 3px; }
  figcaption { margin-top: 10px; color: var(--color-performance-muted); font-size: 11px; line-height: 1.6; }
  @media(max-width:760px) {
    .io-journal-opening { width: calc(100% - 40px); padding-block: 44px 32px; grid-template-columns: minmax(0,1fr); gap: 32px; }
  }
</style>
