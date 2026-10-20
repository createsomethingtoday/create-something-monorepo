<script lang="ts">
  let { active = null }: { active?: number | null } = $props();
  const stations = [
    { x: 0, title: 'Intent', group: 0 }, { x: 62, title: 'Access', group: 0 },
    { x: 124, title: 'Approval', group: 0 }, { x: 186, title: 'Work', group: 1 },
    { x: 248, title: 'Checks', group: 2 }, { x: 310, title: 'Receipt', group: 2 }
  ];
  const point = (x: number, y: number, z = 0) => `${40 + x + y * .45},${100 + y * .55 - z}`;
  const face = (x: number, y: number, w: number, d: number, z: number) => [point(x,y,z),point(x+w,y,z),point(x+w,y+d,z),point(x,y+d,z)].join(' ');
</script>

<svg viewBox="0 0 440 220" aria-hidden="true" focusable="false" class="workflow-bench">
  <path class="feet" d="M49 165v12h16v-12m330-2v12h16v-12" />
  <polygon class="base-side" points="47,155 426,155 426,165 47,165" />
  <polygon class="base-side" points="399,122 426,155 426,165 399,132" />
  <polygon class="base-top" points="20,122 399,122 426,155 47,155" />
  <path class="rail" d="M48 139h350" />
  {#each stations as station, i}
    <g class:lit={active === station.group} class="station">
      <polygon class="side" points={`${point(station.x,0,0)} ${point(station.x+45,0,0)} ${point(station.x+45,0,12)} ${point(station.x,0,12)}`} />
      <polygon class="side" points={`${point(station.x+45,0,0)} ${point(station.x+45,44,0)} ${point(station.x+45,44,12)} ${point(station.x+45,0,12)}`} />
      <polygon class="top" points={face(station.x,0,45,44,12)} />
      <g transform={`translate(${station.x+52} 89)`} class="mechanism">
        {#if i === 0}
          <path class="paper" d="M0-17h21l6 6v29H0z" /><path class="detail" d="M5-8h11M5-2h16M5 4h16M5 10h10" />
        {:else if i === 1}
          <path class="detail" d="M0 4h9m10 0h9M9-8v24h10V-8zM12-15v7m5-7v7" />
        {:else if i === 2}
          <path class="gate" d="M0 15v-30h27v30M0-8h27" /><path class="detail" d="M8-8v18m11-18v18" /><circle cx="27" cy="-8" r="4" class="knob" />
        {:else if i === 3}
          <rect x="0" y="-12" width="27" height="27" rx="2" class="paper" /><path class="detail" d="m11-4-6 6 6 6m5-12 6 6-6 6" />
        {:else if i === 4}
          <circle cx="11" cy="-2" r="11" class="paper" /><path class="detail" d="m19 7 10 12M5-2h12m-6-6v12" />
        {:else}
          <path class="paper" d="M-3-12h25v30H-3zM1-16h25v30H1zM5-20h25v30H5z" /><path class="detail" d="M10-12h15M10-6h15M10 0h10" />
        {/if}
      </g>
      <text x={station.x+64} y="145" text-anchor="middle">{String(i+1).padStart(2,'0')}</text>
    </g>
  {/each}
  <text class="bench-caption" x="220" y="205" text-anchor="middle">A WORKING AGREEMENT, MADE VISIBLE</text>
</svg>

<style>
  .workflow-bench { display: block; width: 100%; height: auto; overflow: visible; color: var(--color-performance-ink); }
  .feet, .base-side { fill: var(--color-performance-shell-surface); stroke: var(--color-performance-line-strong); }
  .base-top { fill: var(--color-performance-shell-surface-elevated); stroke: var(--color-performance-line-strong); }
  .rail, .detail, .gate { fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
  .rail { stroke: var(--color-performance-line-strong); }
  .side { fill: var(--color-performance-shell-surface); stroke: var(--color-performance-line-strong); }
  .top, .paper, .knob { fill: var(--color-performance-panel); stroke: currentColor; stroke-width: 1.2; }
  .station { color: var(--color-performance-muted); }
  .station.lit { color: var(--color-performance-ink); }
  .mechanism { transition: translate 180ms ease; }
  .lit .mechanism { translate: 0 -5px; }
  text { fill: currentColor; font: 10px var(--font-performance-mono); }
  .bench-caption { font-size: 8px; letter-spacing: 1px; }
  @media (prefers-reduced-motion: reduce) { .mechanism { transition: none; translate: none; } }
</style>
