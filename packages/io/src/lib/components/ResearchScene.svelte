<script lang="ts">
  import { canonTaskScenes, type CanonTaskSceneKey } from '$lib/canon-task-scenes';
  let { scene, caption, eager = true, sizes = '94vw' }: { scene: CanonTaskSceneKey; caption: string; eager?: boolean; sizes?: string } = $props();
  const art = $derived(canonTaskScenes[scene]);
</script>
<figure>
  <img src={art.src} srcset={art.srcset} {sizes} width={art.width} height={art.height} alt={caption} loading={eager ? 'eager' : 'lazy'} fetchpriority={eager ? 'high' : 'auto'} decoding="async" />
  <figcaption>Concept illustration · {caption}</figcaption>
</figure>
<style>
  figure { margin: 1.5rem 0 0; min-width: 0; }
  img { display: block; width: 100%; height: auto; border: 1px solid var(--color-performance-line); }
  figcaption { padding-block: .75rem; font: .75rem/1.6 var(--font-performance-mono); color: var(--color-performance-fg-secondary); }
</style>
