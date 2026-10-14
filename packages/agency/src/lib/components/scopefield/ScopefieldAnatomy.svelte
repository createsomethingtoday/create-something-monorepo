<script lang="ts">
  import { base, board, drawer, control, screws, drawerTravel } from './isometric';
  let { stage = 2, still = true }: { stage?: number; still?: boolean } = $props();
</script>

<div class="anatomy" class:still data-stage={still ? 2 : stage}>
  <svg viewBox="0 0 760 500" aria-hidden="true" focusable="false">
    <ellipse class="shadow" cx="355" cy="350" rx="260" ry="78" />
    <g class="base">{#each base as face}<path d={face.path} class={face.tone} />{/each}</g>
    <g class="drawer" style:--travel={drawerTravel}>{#each drawer as face}<path d={face.path} class={face.tone} />{/each}</g>
    <g class="board">{#each board as face}<path d={face.path} class={face.tone} />{/each}</g>
    <g class="control">{#each control as face}<path d={face.path} class={face.tone} />{/each}</g>
    {#each screws as [cx,cy]}<circle {cx} {cy} r="2.2" class="screw" /><circle {cx} {cy} r="0.65" class="screw-core" />{/each}
  </svg>
</div>

<style>
  .anatomy { --iso-top: var(--color-operator-raised); --iso-side: var(--color-operator-background); --iso-front: var(--color-operator-secondary); --iso-line: var(--color-operator-focus-ring-accessible); width: 100%; }
  svg { width: 100%; height: auto; display: block; overflow: visible; }
  path { stroke: var(--iso-line); stroke-width: 0.65; stroke-linejoin: round; }
  .top { fill: var(--iso-top); }
  .side { fill: var(--iso-side); }
  .front { fill: var(--iso-front); }
  .edge { fill: var(--color-operator-hover); }
  .paper { fill: var(--color-operator-foreground); }
  .ink { fill: none; stroke: var(--color-operator-background); stroke-width: 1.2; }
  .signal { fill: var(--color-operator-status-paused-text); stroke: var(--color-operator-status-paused-text); }
  .shadow { fill: var(--color-operator-background); opacity: 0.7; }
  .screw { fill: var(--iso-side); stroke: var(--iso-line); stroke-width: 0.6; }
  .screw-core { fill: var(--iso-line); }
  .drawer { transform: var(--travel); }
  .control { opacity: 1; }
  .anatomy:not(.still) .drawer { transition: transform var(--duration-complex) var(--ease-standard); }
  .anatomy:not(.still) .control { transition: opacity var(--duration-slow) var(--ease-standard); }
  .anatomy:not(.still)[data-stage='0'] .drawer { transform: translate(0,0); }
  .anatomy:not(.still):not([data-stage='2']) .control { opacity: 0.3; }
  @media (prefers-reduced-motion: reduce) { .drawer, .control { transition: none !important; } }
</style>
