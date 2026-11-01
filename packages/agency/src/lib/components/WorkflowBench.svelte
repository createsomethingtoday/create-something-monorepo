<script lang="ts">
  let { active = 0 }: { active?: number | null } = $props();
  const stage = $derived(active ?? 0);
</script>

<svg viewBox="0 0 520 330" aria-hidden="true" focusable="false" class="workflow-bench" data-workpiece-stage={stage}>
  <path class="paper-edge" d="M64 51h392v251H64z" />
  <path class="workpiece" d="M56 35h354l38 38v221H56z" />
  <path class="fold" d="M410 35v38h38" />
  <text class="board-title" x="82" y="81">Intake handoff</text>
  <path class="rule" d="M82 99h340" />

  <g class="phase" class:shown={stage === 0} data-workpiece-phase="0">
    <path class="sketch" d="M129 164h91m69 0h91" />
    <rect class="node" x="82" y="127" width="94" height="74" />
    <path class="ink" d="M111 143h28l8 8v30h-36zM118 154h15m-15 8h20m-20 8h15" />
    <rect class="sketch" x="213" y="127" width="94" height="74" />
    <rect class="sketch" x="344" y="127" width="78" height="74" />
    <text class="node-label" x="129" y="230" text-anchor="middle">Request</text>
    <text class="muted-label" x="260" y="230" text-anchor="middle">Draft</text>
    <text class="muted-label" x="383" y="230" text-anchor="middle">Review</text>
    <path class="ink" d="M85 262h48m10 0h80" />
    <text class="annotation" x="420" y="267" text-anchor="end">Agree the boundary</text>
  </g>

  <g class="phase" class:shown={stage === 1} data-workpiece-phase="1">
    <path class="connection" d="M176 164h37m94 0h37" />
    <path class="ink" d="m204 157 9 7-9 7m131-14 9 7-9 7" />
    <rect class="node" x="82" y="127" width="94" height="74" />
    <path class="ink" d="M111 143h28l8 8v30h-36zM118 154h15m-15 8h20m-20 8h15" />
    <rect class="node" x="213" y="127" width="94" height="74" />
    <path class="ink" d="m251 151-11 12 11 12m18-24 11 12-11 12" />
    <rect class="gate" x="344" y="127" width="78" height="74" />
    <path class="ink" d="M359 181v-36h47v36m-47-27h47m-30 0v27m13-27v27" />
    <text class="node-label" x="129" y="230" text-anchor="middle">Request</text>
    <text class="node-label" x="260" y="230" text-anchor="middle">Draft</text>
    <text class="node-label" x="383" y="230" text-anchor="middle">Review</text>
    <text class="annotation" x="82" y="267">Sending waits for approval</text>
  </g>

  <g class="phase" class:shown={stage === 2} data-workpiece-phase="2">
    <path class="connection" d="M113 136h285" />
    <circle class="node" cx="112" cy="136" r="17" /><circle class="node" cx="252" cy="136" r="17" /><circle class="gate" cx="392" cy="136" r="17" />
    <path class="ink" d="m104 136 6 6 10-12m124 6 6 6 10-12m124 6 6 6 10-12" />
    <text class="node-label" x="82" y="192">Check the agreed result</text>
    <path class="ink" d="m84 220 6 6 10-12m-16 40 6 6 10-12M113 220h135m-135 34h102" />
    <path class="guide-back" d="M322 197h100v88H322z" />
    <path class="guide" d="M308 187h100v88H308zM321 187v88" />
    <text class="guide-label" x="365" y="223" text-anchor="middle">Guide</text>
    <path class="ink" d="M338 238h51m-51 12h34" />
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
  .gate { fill: var(--color-performance-shell-surface-elevated); stroke: currentColor; stroke-width: 2.5; }
  text { fill: currentColor; font-family: var(--font-performance-interface); }
  .board-title { font-size: 23px; letter-spacing: -.03em; }
  .node-label { font-size: 17px; }
  .muted-label { font-size: 17px; fill: var(--color-performance-fg-tertiary); }
  .annotation { font: 13px var(--font-performance-mono); fill: var(--color-performance-fg-secondary); }
  .guide-label { font-size: 19px; }
  .phase { display: none; }
  .phase.shown { display: inline; }
</style>
