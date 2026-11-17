<script lang="ts">
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
</script>

<div id="agency-illustrated-opening">{@render children()}</div>

<style>
  /* Route-only framing: preserve the approved master and keep live copy clear. */
  #agency-illustrated-opening :global(.performance-campaign-opening),
  #agency-illustrated-opening :global(.canon-scene-lead) {
    --color-performance-paper: #000;
    --color-performance-ink: #f5f5f3;
    --color-performance-muted: #dededb;
    background: #000;
    color: #f5f5f3;
  }
  #agency-illustrated-opening :global(.canon-scene-lead__copy) {
    width: 40%;
    padding: clamp(2rem, 4vw, 4rem) 0 2rem 5vw;
  }
  #agency-illustrated-opening :global(.canon-scene-lead__art::after) { display: none; }
  #agency-illustrated-opening :global(.canon-scene-lead__reserved) { height: 12vw; }
  @media (max-width: 1024px) {
    #agency-illustrated-opening :global(.canon-scene-lead__copy) {
      width: 100%;
      min-height: 0;
      padding: 2rem 5vw 0;
    }
    #agency-illustrated-opening :global(.canon-scene-lead__art) {
      grid-area: 2 / 1;
      height: 65cqw;
      z-index: 0;
    }
    #agency-illustrated-opening :global(.canon-scene-lead__reserved) { height: 65cqw; }
    #agency-illustrated-opening :global(.canon-background-scene) {
      background-size: auto 100%;
      background-position: right bottom;
    }
  }
  @media (max-width: 600px) {
    #agency-illustrated-opening :global(.canon-scene-lead__art),
    #agency-illustrated-opening :global(.canon-scene-lead__reserved) { height: 88cqw; }
  }

</style>
