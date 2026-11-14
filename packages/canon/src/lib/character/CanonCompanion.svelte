<script lang="ts">
  import { CANON_CHARACTER_ASSET_METADATA } from './assets';
  import type { CanonCompanionProps } from './types';

  /** The consumer owns the approved image URL; package assets are not auto-installed. */
  let { size = 96, headSrc }: CanonCompanionProps = $props();
  let failedSrc = $state<string>();
  const source = $derived(headSrc?.trim());
  const head = CANON_CHARACTER_ASSET_METADATA.head;
  const scale = head.displaySize / head.frame.extent;
  const showHead = $derived(size === head.displaySize && source && failedSrc !== source);
</script>

{#if showHead}
  <span class="art-frame" aria-hidden="true">
    <img
      src={source}
      alt=""
      width={head.width}
      height={head.height}
      onerror={() => { failedSrc = source; }}
      style:width={`${head.frame.sourceWidth * scale}px`}
      style:height={`${head.frame.sourceHeight * scale}px`}
      style:max-width="none"
      style:top={`${-head.frame.top * scale}px`}
      style:left={`${head.displaySize / 2 - head.frame.center * scale}px`}
    />
  </span>
{:else}
  <span>Canon</span>
{/if}

<style>
  span { font: inherit; }
  .art-frame { position: relative; display: block; width: 96px; height: 96px; overflow: hidden; flex-shrink: 0; }
  img { position: absolute; display: block; max-width: none; }
</style>
