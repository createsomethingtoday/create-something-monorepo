<script lang="ts">
  import type { Snippet } from 'svelte';
  import { CanonTaskOpening } from '@create-something/canon/character';
  import { canonTaskScenes, type CanonTaskSceneKey } from '$lib/canon-task-scenes';
  let { scene, caption, children }: { scene: CanonTaskSceneKey; caption: string; children: Snippet } = $props();
  const art = $derived(canonTaskScenes[scene]);
</script>

<CanonTaskOpening {art} {scene} {caption} {children} />

<style>
  :global(.canon-task-opening .canon-task-opening__copy > div) { display: block !important; margin: 0 !important; padding: 0 !important; width: 100% !important; max-width: none !important; min-height: 0 !important; border: 0 !important; background: transparent !important; color: inherit !important; }
  :global(.canon-task-opening .canon-task-opening__copy .hero-grid),
  :global(.canon-task-opening .canon-task-opening__copy .research-index-inner),
  :global(.canon-task-opening .canon-task-opening__copy .story-opening),
  :global(.canon-task-opening .canon-task-opening__copy .io-reference-copy),
  :global(.canon-task-opening .canon-task-opening__copy .max-w-4xl),
  :global(.canon-task-opening .canon-task-opening__copy .max-w-6xl),
  :global(.canon-task-opening .canon-task-opening__copy .max-w-7xl),
  :global(.canon-task-opening .canon-task-opening__copy .wrap) { display: block !important; grid-template-columns: minmax(0, 1fr) !important; width: 100%; max-width: none; margin: 0; }
  :global(.canon-task-opening .canon-task-opening__copy .research-metrics),
  :global(.canon-task-opening .canon-task-opening__copy .ltd-operator-hero__proof) { grid-column: auto; margin-top: 2rem; }
</style>
