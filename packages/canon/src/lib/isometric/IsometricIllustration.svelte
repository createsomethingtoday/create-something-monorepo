<script lang="ts">
  import { isometricModel, isometricDescriptions, type IsometricKind } from './model.js';
  let { kind, label, size = 144 }: { kind: IsometricKind; label?: string; size?: number | string } = $props();
  const shapes = $derived(isometricModel(kind));
</script>

<!-- These diagrams explain a concept; they are never evidence of a live result. -->
<svg viewBox="0 0 240 240" width={size} height={size} role={label ? 'img' : undefined}
  aria-label={label} aria-hidden={label ? undefined : 'true'} focusable="false" data-isometric={kind}>
  {#if label}<title>{label}</title><desc>{isometricDescriptions[kind]}</desc>{/if}
  {#each shapes as shape}
    <path d={'M'+shape.points.replaceAll(' ', ' L')+(shape.closed ? ' Z' : '')} class={shape.tone} />
  {/each}
</svg>

<style>
  svg { display: block; max-width: 100%; height: auto; overflow: visible; color: inherit; }
  path { stroke: currentColor; stroke-width: 1.1; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; fill: none; }
  .top { fill: var(--isometric-surface, var(--color-performance-paper)); }
  .side { fill: color-mix(in srgb, currentColor 12%, var(--isometric-surface, var(--color-performance-paper))); }
  .edge { fill: color-mix(in srgb, currentColor 23%, var(--isometric-surface, var(--color-performance-paper))); }
</style>
