<script lang="ts">
  import type { BrandSize } from '../types.js';
  import { BRAND_SIZE_MAP } from '../types.js';

  interface Props {
    /** Canon token or exact pixel size for the compact CREATE SOMETHING ring. */
    size?: BrandSize | number;
    class?: string;
  }

  let { size = 'md', class: className = '' }: Props = $props();

  const sizeInPx = $derived(
    typeof size === 'number' ? size : BRAND_SIZE_MAP[size as BrandSize]
  );
</script>

<!--
  The supplied CREATE SOMETHING ring mark. It inherits currentColor so the
  compact identity stays legible on both clear and dark property shells.
-->
<svg
  viewBox="0 0 100 100"
  class="ring-mark {className}"
  style="--ring-mark-size: {sizeInPx}px"
  aria-hidden="true"
  focusable="false"
>
  <circle cx="53" cy="50" r="41.5" />
  <circle cx="43.5" cy="50" r="31.5" />
</svg>

<style>
  .ring-mark {
    display: inline-block;
    width: var(--ring-mark-size, 32px);
    height: var(--ring-mark-size, 32px);
    overflow: visible;
    fill: none;
    stroke: currentColor;
    stroke-width: 8.5;
    vertical-align: middle;
  }
</style>
