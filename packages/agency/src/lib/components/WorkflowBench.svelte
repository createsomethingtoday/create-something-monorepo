<script lang="ts">
  import { workpieceMotion } from '$lib/motion/workpieceMotion';
  let { active = 0 }: { active?: number | null } = $props();
  const stage = $derived(active ?? 0);
</script>

<svg viewBox="0 0 520 330" aria-hidden="true" focusable="false" class="workflow-bench" data-workpiece-stage={stage} use:workpieceMotion={stage}>
  <path class="paper-edge" d="M64 51h392v251H64z" />
  <path class="workpiece" d="M56 35h354l38 38v221H56z" />
  <path class="fold" d="M410 35v38h38" />
  <text class="board-title" x="82" y="81">Intake handoff</text>
  <path class="rule" d="M82 99h340" />

  <!-- The same request, draft and review boundary persist through all chapters. -->
  <path class="sketch" d="M176 159h37m94 0h37" />
  <g data-workpiece-connect class="connected">
    <path class="connection" pathLength="1" data-workpiece-line d="M176 159h37m94 0h37" />
    <path class="ink" d="m204 152 9 7-9 7m131-14 9 7-9 7" />
  </g>
  <g data-workpiece-request>
    <rect class="node" x="82" y="122" width="94" height="74" />
    <path class="ink" d="M111 138h28l8 8v30h-36zM118 149h15m-15 8h20m-20 8h15" />
  </g>
  <rect class="node future-node" x="213" y="122" width="94" height="74" />
  <rect class="node future-node gate" x="344" y="122" width="78" height="74" />
  <g data-workpiece-build class="connected">
    <path class="ink" d="m251 146-11 12 11 12m18-24 11 12-11 12" />
    <path class="ink" d="M359 176v-36h47v36m-47-27h47m-30 0v27m13-27v27" />
  </g>
  <text class="node-label" x="129" y="222" text-anchor="middle">Request</text>
  <text class="node-label" x="260" y="222" text-anchor="middle">Draft</text>
  <text class="node-label" x="383" y="222" text-anchor="middle">Review</text>

  <g data-workpiece-check class="checked">
    <path class="check ink" pathLength="1" d="m153 132 5 5 9-10" />
    <path class="check ink" pathLength="1" d="m284 132 5 5 9-10" />
    <path class="check ink" pathLength="1" d="m399 132 5 5 9-10" />
  </g>
  <g data-workpiece-guide class="checked">
    <path class="guide-back" d="M326 246h96v35h-96z" />
    <path class="guide" d="M318 238h96v35h-96zM331 238v35" />
    <text class="guide-label" x="371" y="261" text-anchor="middle">Guide</text>
  </g>
  <text class="annotation agree-note" x="82" y="267">Agree the boundary</text>
  <text class="annotation work-note" x="82" y="267">Sending waits for approval</text>
  <g class="handoff-note">
    <text class="annotation" x="82" y="251">Check the agreed result</text>
    <text class="annotation" x="82" y="272">Keep the guide + open questions</text>
  </g>
</svg>

<style>
  .workflow-bench { display: block; width: 100%; height: auto; overflow: visible; color: var(--color-performance-fg-primary); }
  .paper-edge, .guide-back { fill: var(--color-performance-shell-surface-elevated); stroke: var(--color-performance-shell-border-strong); }
  .workpiece { fill: var(--color-performance-shell-surface); stroke: var(--color-performance-shell-border-strong); stroke-width: 1.5; }
  .fold, .ink, .connection, .rule { fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .fold, .rule { stroke: var(--color-performance-shell-border-strong); }
  .sketch { fill: none; stroke: var(--color-performance-fg-tertiary); stroke-width: 1.5; stroke-dasharray: 4 6; }
  .node, .guide { fill: var(--color-performance-shell-surface-elevated); stroke: currentColor; stroke-width: 1.5; }
  .gate { stroke-width: 2.5; }
  text { fill: currentColor; font-family: var(--font-performance-interface); }
  .board-title { font-size: 23px; letter-spacing: -.03em; }
  .node-label { font-size: 17px; }
  .annotation { font: 12px var(--font-performance-mono); fill: var(--color-performance-fg-secondary); }
  .guide-label { font-size: 18px; }
  .connected, .checked, .work-note, .handoff-note { opacity: 0; }
  [data-workpiece-stage='0'] .future-node { stroke: var(--color-performance-fg-tertiary); stroke-dasharray: 4 6; }
  [data-workpiece-stage='1'] .connected, [data-workpiece-stage='2'] .connected,
  [data-workpiece-stage='2'] .checked { opacity: 1; }
  [data-workpiece-stage='1'] .agree-note, [data-workpiece-stage='2'] .agree-note { opacity: 0; }
  [data-workpiece-stage='1'] .work-note, [data-workpiece-stage='2'] .handoff-note { opacity: 1; }
  /* GSAP owns these properties; a global transition reset must not animate cleanup. */
  [data-workpiece-connect], [data-workpiece-build], [data-workpiece-check], [data-workpiece-guide],
  [data-workpiece-line], .check { transition: none !important; }
</style>
