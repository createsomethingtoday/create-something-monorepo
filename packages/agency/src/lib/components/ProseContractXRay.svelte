<script lang="ts">
  import { flushSync, onMount } from 'svelte';
  import {
    parts,
    handoffs,
    enclosure,
    initialCamera,
    project,
    screen,
    bounded,
    port,
    route,
    box,
    ring,
    surfaces,
    type Point,
    type View,
    type Camera
  } from '$lib/diagrams/contract-xray';

  let ready = false;
  let selected = 'host';
  let view: View = 'isometric';
  let cutaway = false;
  let inspect = false;
  let camera: Camera = { ...initialCamera };
  let viewport: HTMLDivElement;
  $: part = parts.find((p) => p.id === selected)!;
  $: anchor = screen(
    project([part.x + part.w / 2, part.y + part.d / 2, part.z + part.h / 2], view),
    camera
  );
  $: outside = anchor[0] < 0 || anchor[0] > 440 || anchor[1] < 0 || anchor[1] > 520;
  $: ordered = [...parts].sort((a, b) =>
    view === 'front' ? a.y - b.y : a.x + a.y + a.z - (b.x + b.y + b.z)
  );
  const points = (ps: Point[]) => ps.map((p) => project(p, view).join(',')).join(' ');
  const path = (ps: Point[]) => 'M' + ps.map((p) => project(p, view).join(',')).join(' L');
  const move = (x: number, y: number) =>
    (camera = bounded({ ...camera, x: camera.x + x, y: camera.y + y }));
  const zoom = (factor: number) => (camera = bounded({ ...camera, zoom: camera.zoom * factor }));
  const fit = () => (camera = { ...initialCamera });
  function reset() {
    fit();
    selected = 'host';
    view = 'isometric';
    cutaway = false;
    inspect = false;
  }

  onMount(() => {
    ready = true;
    const pointers = new Map<number, { x: number; y: number }>();
    let last: { x: number; y: number; d: number } | null = null;
    let frame = 0;
    let pending: Camera | null = null;
    const queue = (next: Camera) => {
      pending = bounded(next);
      if (!frame)
        frame = requestAnimationFrame(() => {
          if (pending) camera = pending;
          pending = null;
          frame = 0;
        });
    };
    const measure = () => {
      const ps = [...pointers.values()];
      return {
        x: ps.reduce((n, p) => n + p.x, 0) / ps.length,
        y: ps.reduce((n, p) => n + p.y, 0) / ps.length,
        d: ps.length === 2 ? Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) : 0
      };
    };
    const wheel = (event: WheelEvent) => {
      if (!event.altKey) return;
      event.preventDefault();
      zoom(event.deltaY < 0 ? 1.12 : 1 / 1.12);
    };
    const key = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (
        !['+', '=', '-', '0', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape'].includes(
          event.key
        )
      )
        return;
      event.preventDefault();
      if (event.key === 'Escape') {
        inspect = false;
        return;
      }
      if (event.key === '0') {
        fit();
        return;
      }
      if (event.key === '+' || event.key === '=') zoom(1.25);
      else if (event.key === '-') zoom(0.8);
      else {
        const delta: Record<string, [number, number]> = {
          ArrowLeft: [-30, 0],
          ArrowRight: [30, 0],
          ArrowUp: [0, -30],
          ArrowDown: [0, 30]
        };
        move(...delta[event.key]);
      }
    };
    const down = (event: PointerEvent) => {
      if (!inspect || event.button !== 0) return;
      viewport.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      last = measure();
    };
    const drag = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const next = measure(),
        rect = viewport.querySelector('svg')!.getBoundingClientRect(),
        scale = Math.min(rect.width / 440, rect.height / 520);
      if (last) {
        const base = pending ?? camera;
        queue({
          ...base,
          x: base.x + (next.x - last.x) / scale,
          y: base.y + (next.y - last.y) / scale,
          zoom: base.zoom * (next.d && last.d ? next.d / last.d : 1)
        });
      }
      last = next;
    };
    const end = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      last = pointers.size ? measure() : null;
    };
    const release = () => {
      for (const id of pointers.keys())
        if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
      pointers.clear();
      last = null;
    };
    let prior: Camera | null = null;
    const beforePrint = () => {
      prior = { ...camera };
      flushSync(fit);
    };
    const afterPrint = () => {
      if (prior) camera = prior;
      prior = null;
    };
    viewport.addEventListener('wheel', wheel, { passive: false });
    viewport.addEventListener('keydown', key);
    viewport.addEventListener('pointerdown', down);
    viewport.addEventListener('pointermove', drag);
    viewport.addEventListener('pointerup', end);
    viewport.addEventListener('pointercancel', end);
    viewport.addEventListener('lostpointercapture', end);
    window.addEventListener('blur', release);
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      release();
      viewport.removeEventListener('wheel', wheel);
      viewport.removeEventListener('keydown', key);
      viewport.removeEventListener('pointerdown', down);
      viewport.removeEventListener('pointermove', drag);
      viewport.removeEventListener('pointerup', end);
      viewport.removeEventListener('pointercancel', end);
      viewport.removeEventListener('lostpointercapture', end);
      window.removeEventListener('blur', release);
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  });
</script>

<div class="xray" data-contract-xray>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (This viewport implements documented keyboard zoom/pan; adjacent native buttons provide the same actions.) -->
  <div
    class="viewport"
    class:inspect
    bind:this={viewport}
    role="application"
    aria-label="Contract reader inspection. Plus and minus zoom, arrow keys pan, zero fits, Escape restores page gestures."
    tabindex={ready ? 0 : undefined}
  >
    <svg viewBox="0 0 440 520" role="img" aria-labelledby="contract-xray-title contract-xray-desc">
      <title id="contract-xray-title">Look inside the contract reader</title>
      <desc id="contract-xray-desc"
        >Schematic four-part model: contract, orchestration, host controls and receipt. Translucent
        walls and routed connections explain their relationship. Depth is illustrative, not
        measured. The full explanation follows beside or below the figure.</desc
      >
      <g
        class="world"
        transform={`translate(${220 + camera.x} ${260 + camera.y}) scale(${camera.zoom}) translate(-220 -260)`}
      >
        <g class="rear">
          <polygon points={points(ring(0))} />
          {#each ring(0) as point, i}<path d={path([point, ring(enclosure.h)[i]])} />{/each}
          {#each [75, 150, 225] as z}<polygon class="depth-guide" points={points(ring(z))} />{/each}
        </g>
        {#each handoffs as [from, to]}
          <g class="handoff" class:active={from === selected || to === selected}>
            <path class="wire-shadow" d={path(route(from, to))} /><path
              class="wire"
              d={path(route(from, to))}
            />
          </g>
        {/each}
        {#each ordered as item}
          <g class="assembly" class:selected={item.id === selected} data-assembly={item.id}>
            {#each surfaces(item) as face, i}<polygon
                class:top={i === 0}
                points={points(face)}
              />{/each}
            {#if item.kind === 'board'}
              {#each [14, 26, 38] as y}<path
                  class="detail"
                  d={path([
                    [item.x + 10, item.y + y, item.z + item.h],
                    [item.x + item.w - 10, item.y + y, item.z + item.h]
                  ])}
                />{/each}
            {:else if item.kind === 'gate'}
              {#each box( { ...item, x: item.x + 12, y: item.y + 10, z: item.z + item.h, w: item.w - 24, d: item.d - 20, h: 4 } ) as face}<polygon
                  class="gate-plane"
                  points={points(face)}
                />{/each}
              {#each [20, 48, 76, 104] as x}<path
                  class="detail"
                  d={path([
                    [item.x + x, item.y, item.z],
                    [item.x + x, item.y, item.z + item.h]
                  ])}
                />{/each}
            {/if}
            <circle
              class="port"
              cx={project(port(item), view)[0]}
              cy={project(port(item), view)[1]}
              r="4"
            />
          </g>
        {/each}
        <g class="shell">
          {#each [3, 4, 5, 6, 7].filter((i) => !cutaway || i > 5) as i}<polygon
              class="glass"
              points={points([
                ring(0)[i],
                ring(0)[(i + 1) % 8],
                ring(enclosure.h)[(i + 1) % 8],
                ring(enclosure.h)[i]
              ])}
            />{/each}
          <polygon class="cap" points={points(ring(enclosure.h))} /><polygon
            class="rim"
            points={points(ring(0))}
          />
        </g>
      </g>
      <g class="annotation"
        ><path d={`M150,48 L${anchor[0]},${anchor[1]}`} /><rect
          x="12"
          y="12"
          width="310"
          height="38"
          rx="3"
        /><text x="24" y="37">0{parts.indexOf(part) + 1} / {part.name}</text></g
      >
      <text class="schematic" x="14" y="504">ILLUSTRATIVE DEPTH · NO LIVE RUN</text>
    </svg>
  </div>
  {#if ready}
    <div class="controls" aria-label="Contract reader view">
      <label
        >View <select bind:value={view}
          ><option value="isometric">Isometric</option><option value="front">Front</option></select
        ></label
      >
      <button aria-pressed={cutaway} onclick={() => (cutaway = !cutaway)}>Cutaway</button>
      <button onclick={reset}>Reset</button>
    </div>
    <div class="controls" aria-label="Contract reader navigation">
      <button aria-label="Zoom out" disabled={camera.zoom <= 1} onclick={() => zoom(0.8)}>−</button
      ><output aria-live="polite">{Math.round(camera.zoom * 100)}%</output><button
        aria-label="Zoom in"
        disabled={camera.zoom >= 4}
        onclick={() => zoom(1.25)}>+</button
      ><button onclick={fit}>Fit</button>
      <button aria-label="Pan left" onclick={() => move(-30, 0)}>←</button><button
        aria-label="Pan right"
        onclick={() => move(30, 0)}>→</button
      ><button aria-label="Pan up" onclick={() => move(0, -30)}>↑</button><button
        aria-label="Pan down"
        onclick={() => move(0, 30)}>↓</button
      >
      <button aria-pressed={inspect} onclick={() => (inspect = !inspect)}>Pan & pinch</button>
    </div>
    <p class="hint">
      {inspect
        ? 'Drag or pinch inside the view. Turn Pan & pinch off, or press Escape, to restore page gestures.'
        : 'Page scrolling stays enabled. Use buttons, focused-view keys, or Alt + wheel to inspect.'}
    </p>
    <div class="parts" aria-label="Inspect a contract reader part">
      {#each parts as item, i}<button
          aria-pressed={selected === item.id}
          onclick={() => (selected = item.id)}>{i + 1}. {item.name}</button
        >{/each}
    </div>
    <div class="inspection" aria-live="polite">
      <p><strong>{part.name}.</strong> {part.detail}</p>
      <p class="source">Source: {part.source}</p>
      {#if outside}<p>Selected part is outside this view. Choose Fit to locate it.</p>{/if}
    </div>
  {/if}
  <p class="legend">
    A pale outline identifies the selected part and its handoffs. Translucency shows schematic
    depth, not measured activity. Read the four-part explanation for the full meaning and limits.
  </p>
</div>

<style>
  .xray {
    color: var(--color-performance-fg-primary);
  }
  .viewport {
    overflow: hidden;
    touch-action: pan-y pinch-zoom;
  }
  .viewport.inspect {
    touch-action: none;
    cursor: grab;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .rear polygon,
  .rear path {
    fill: none;
    stroke: currentColor;
    stroke-width: 1;
    opacity: 0.2;
  }
  .rear .depth-guide {
    opacity: 0.1;
    stroke-dasharray: 2 6;
  }
  .assembly polygon {
    fill: var(--color-performance-fg-primary);
    fill-opacity: 0.08;
    stroke: currentColor;
    stroke-opacity: 0.5;
    stroke-width: 1;
    stroke-linejoin: round;
  }
  .assembly .top {
    fill-opacity: 0.14;
  }
  .assembly.selected polygon {
    fill-opacity: 0.19;
    stroke-opacity: 1;
    stroke-width: 1.8;
  }
  .assembly .gate-plane {
    fill-opacity: 0.12;
  }
  .detail {
    stroke: currentColor;
    stroke-width: 1;
    opacity: 0.6;
  }
  .port {
    fill: var(--color-performance-shell-surface);
    stroke: currentColor;
    stroke-width: 1.3;
  }
  .wire,
  .wire-shadow {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .wire-shadow {
    stroke: var(--color-performance-shell-surface-secondary);
    stroke-width: 5;
  }
  .wire {
    stroke: currentColor;
    stroke-width: 1.7;
    opacity: 0.3;
  }
  .active .wire {
    stroke-width: 2.5;
    opacity: 0.9;
  }
  .glass {
    fill: var(--color-performance-fg-primary);
    fill-opacity: 0.025;
    stroke: currentColor;
    stroke-opacity: 0.2;
  }
  .cap {
    fill: var(--color-performance-fg-primary);
    fill-opacity: 0.045;
    stroke: currentColor;
    stroke-opacity: 0.6;
  }
  .rim {
    fill: none;
    stroke: currentColor;
    stroke-opacity: 0.6;
  }
  .annotation path {
    fill: none;
    stroke: currentColor;
    stroke-width: 1;
    opacity: 0.6;
  }
  .annotation rect {
    fill: var(--color-performance-shell-surface-secondary);
    stroke: currentColor;
    stroke-opacity: 0.6;
  }
  .annotation text {
    fill: currentColor;
    font: 24px var(--font-performance-mono);
  }
  .schematic {
    fill: currentColor;
    opacity: 0.65;
    font: 11px var(--font-performance-mono);
    letter-spacing: 0.04em;
  }
  .controls,
  .parts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.65rem 0;
    align-items: center;
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.75rem;
  }
  button,
  select {
    min-width: 44px;
    min-height: 44px;
    border: 1px solid var(--color-performance-shell-border-strong);
    border-radius: var(--radius-sm);
    background: var(--color-performance-shell-surface);
    color: inherit;
    font: 0.75rem var(--font-performance-interface);
    padding: 0.5rem 0.6rem;
  }
  button {
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  button[aria-pressed='true'] {
    background: var(--color-performance-fg-primary);
    color: var(--color-performance-shell-surface);
  }
  output {
    font: 0.75rem var(--font-performance-mono);
    min-width: 3rem;
    text-align: center;
  }
  .hint,
  .legend,
  .source {
    font-size: 0.75rem;
    line-height: 1.6;
    color: var(--color-performance-fg-secondary);
  }
  .inspection {
    border-left: 2px solid currentColor;
    padding-left: 0.75rem;
    margin: 1rem 0;
  }
  .inspection p {
    font-size: 0.8125rem;
    line-height: 1.6;
    margin: 0.5rem 0;
  }
  .inspection .source {
    font-size: 0.7rem;
  }
  button:focus-visible,
  select:focus-visible,
  .viewport:focus-visible {
    outline: 2px solid var(--color-performance-focus);
    outline-offset: 3px;
  }
  @media print {
    .controls,
    .parts,
    .hint,
    .inspection {
      display: none;
    }
    .viewport {
      max-width: 20rem;
    }
  }
</style>
