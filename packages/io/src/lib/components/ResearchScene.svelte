<script lang="ts">
  import type { CanonTaskSceneKey } from '$lib/canon-task-scenes';
  import { journalArtwork, type JournalIllustration } from '$lib/config/journalArtwork';
  let { scene, illustration, caption: _caption, eager = true, sizes = '94vw' }: { scene: CanonTaskSceneKey; illustration?: JournalIllustration; caption: string; eager?: boolean; sizes?: string } = $props();
  const artwork = $derived(journalArtwork(scene, illustration));
</script>
<figure>
  <img src={artwork.src} srcset={artwork.srcset} {sizes} width={artwork.width} height={artwork.height} alt={artwork.alt} loading={eager ? 'eager' : 'lazy'} fetchpriority={eager ? 'high' : 'auto'} decoding="async" />
  <figcaption>Concept illustration · {artwork.caption}</figcaption>
</figure>
<style>
  figure { margin: 1.5rem 0 0; min-width: 0; }
  img { display: block; width: 100%; height: auto; border-radius: 3px; }
  figcaption { padding-block: .75rem; font: 11px/1.6 'IO Switzer',Arial,sans-serif; color: var(--color-performance-muted); }
</style>
