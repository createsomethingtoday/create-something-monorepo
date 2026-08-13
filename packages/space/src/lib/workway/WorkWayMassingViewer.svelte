<script lang="ts">
  import { onMount } from 'svelte';

  import type {
    WorkWayMassingGeometry,
    WorkWayMassingGuide,
    WorkWayMassingVertex
  } from './threshold-dwelling-massing';

  let {
    geometry,
    guide
  }: {
    geometry: WorkWayMassingGeometry;
    guide: WorkWayMassingGuide;
  } = $props();

  type ProjectedPoint = { x: number; y: number; depth: number };

  let canvas: HTMLCanvasElement;
  let yaw = $state(-0.78);
  let pitch = $state(-0.56);
  let zoom = $state(1);
  let dragging = $state<{ pointerId: number; x: number; y: number } | null>(null);
  let resizeObserver: ResizeObserver | undefined;

  function project(vertex: WorkWayMassingVertex, width: number, height: number): ProjectedPoint {
    const x = (vertex.xIn - guide.dimensions.widthIn / 2) / guide.dimensions.widthIn;
    const y = vertex.yIn / guide.dimensions.widthIn;
    const z = (vertex.zIn - guide.dimensions.depthIn / 2) / guide.dimensions.widthIn;
    const yawCos = Math.cos(yaw);
    const yawSin = Math.sin(yaw);
    const pitchCos = Math.cos(pitch);
    const pitchSin = Math.sin(pitch);
    const rotatedX = x * yawCos - z * yawSin;
    const yawDepth = x * yawSin + z * yawCos;
    const rotatedY = y * pitchCos - yawDepth * pitchSin;
    const depth = y * pitchSin + yawDepth * pitchCos;
    const perspective = (Math.min(width, height) * 2.35 * zoom) / (3 + depth);

    return {
      x: width / 2 + rotatedX * perspective,
      y: height * 0.57 - rotatedY * perspective,
      depth
    };
  }

  function tracePolygon(
    context: CanvasRenderingContext2D,
    vertices: readonly WorkWayMassingVertex[],
    width: number,
    height: number
  ): number {
    const points = vertices.map((vertex) => project(vertex, width, height));
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) context.lineTo(point.x, point.y);
    context.closePath();
    return points.reduce((total, point) => total + point.depth, 0) / points.length;
  }

  function resizeAndDraw() {
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(bounds.width * pixelRatio));
    const height = Math.max(1, Math.round(bounds.height * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    draw();
  }

  function draw() {
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const { width, height } = canvas;

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#11130f';
    context.fillRect(0, 0, width, height);

    const horizon = Math.round(height * 0.57);
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1b1d18');
    gradient.addColorStop(1, '#0d0f0c');
    context.fillStyle = gradient;
    context.fillRect(0, horizon, width, height - horizon);

    const floors = geometry.floors
      .map((floor) => ({
        floor,
        depth: floor.vertices.reduce((total, vertex) => total + project(vertex, width, height).depth, 0) /
          floor.vertices.length
      }))
      .sort((a, b) => b.depth - a.depth);
    for (const { floor } of floors) {
      tracePolygon(context, floor.vertices, width, height);
      context.fillStyle = floor.materialColor;
      context.globalAlpha = floor.type === 'open' ? 0.78 : 0.67;
      context.fill();
      context.globalAlpha = 1;
      context.strokeStyle = 'rgba(245, 241, 226, 0.23)';
      context.lineWidth = Math.max(1, width / 1000);
      context.stroke();
    }

    const walls = geometry.walls
      .map((wall) => ({
        wall,
        depth: wall.vertices.reduce((total, vertex) => total + project(vertex, width, height).depth, 0) /
          wall.vertices.length
      }))
      .sort((a, b) => b.depth - a.depth);
    for (const { wall } of walls) {
      tracePolygon(context, wall.vertices, width, height);
      context.fillStyle = wall.materialColor;
      context.fill();
      context.strokeStyle = wall.exterior ? 'rgba(255, 246, 219, 0.92)' : 'rgba(240, 240, 232, 0.54)';
      context.lineWidth = wall.exterior ? Math.max(2, width / 500) : Math.max(1, width / 900);
      context.stroke();
    }

    context.fillStyle = 'rgba(244, 242, 233, 0.78)';
    context.font = `${Math.max(10, width / 88)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    context.fillText('N', width * 0.5, Math.max(18, height * 0.08));
  }

  function startDrag(event: PointerEvent) {
    const target = event.currentTarget as HTMLCanvasElement | null;
    if (!target) return;
    dragging = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    target.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent) {
    if (!dragging || dragging.pointerId !== event.pointerId) return;
    yaw += (event.clientX - dragging.x) / 180;
    pitch = Math.max(-1.15, Math.min(-0.16, pitch + (event.clientY - dragging.y) / 230));
    dragging = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function endDrag(event: PointerEvent) {
    const target = event.currentTarget as HTMLCanvasElement | null;
    if (dragging?.pointerId !== event.pointerId) return;
    dragging = null;
    if (target?.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  }

  function adjustZoom(amount: number) {
    zoom = Math.max(0.72, Math.min(1.45, zoom + amount));
  }

  function resetCamera() {
    yaw = -0.78;
    pitch = -0.56;
    zoom = 1;
  }

  $effect(() => {
    yaw;
    pitch;
    zoom;
    geometry;
    guide;
    resizeAndDraw();
  });

  onMount(() => {
    resizeObserver = new ResizeObserver(resizeAndDraw);
    resizeObserver.observe(canvas);
    resizeAndDraw();
    return () => resizeObserver?.disconnect();
  });
</script>

<section class="massing-viewer" aria-label="Interactive 3D design-intent massing guide">
  <div class="canvas-shell">
    <canvas
      bind:this={canvas}
      aria-label="Interactive 3D massing guide based on the Threshold Dwelling Rev 0.8 floor plan"
      data-testid="massing-canvas"
      onpointerdown={startDrag}
      onpointermove={moveDrag}
      onpointerup={endDrag}
      onpointercancel={endDrag}
    ></canvas>
    <div class="canvas-stamp">
      <p>Horizontal geometry</p>
      <strong>{guide.dimensions.widthIn / 12} ft × {guide.dimensions.depthIn / 12} ft</strong>
      <span>from the Rev 0.8 plan</span>
      <p class="material-contract" title={guide.materialContract.scheduleId}>Material schedule · Rev 0.8</p>
      <span>material roles codified · products unselected</span>
    </div>
  </div>

  <div class="viewer-footer">
    <p>
      Drag to orbit. Floor, zone, and wall placement are derived from the 2D plan; the {guide.dimensions.verticalMassingHeightIn / 12} ft vertical mass is illustrative only.
    </p>
    <div class="controls" aria-label="3D massing controls">
      <button type="button" onclick={() => adjustZoom(-0.1)} aria-label="Zoom out">−</button>
      <button type="button" onclick={resetCamera}>Reset view</button>
      <button type="button" onclick={() => adjustZoom(0.1)} aria-label="Zoom in">+</button>
    </div>
  </div>
</section>

<style>
  .massing-viewer {
    display: grid;
    min-height: 25rem;
    overflow: hidden;
    border: 1px solid #5a594f;
    background: #11130f;
  }

  .canvas-shell {
    position: relative;
    min-height: 22rem;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 22rem;
    cursor: grab;
    touch-action: none;
  }

  canvas:active {
    cursor: grabbing;
  }

  .canvas-stamp {
    position: absolute;
    right: 0.85rem;
    bottom: 0.85rem;
    display: grid;
    gap: 0.15rem;
    max-width: 14rem;
    padding: 0.65rem 0.7rem;
    color: #f2eee1;
    background: rgba(15, 17, 13, 0.87);
    font-size: 0.7rem;
  }

  .canvas-stamp p,
  .canvas-stamp span {
    margin: 0;
    color: #c1bdae;
  }

  .canvas-stamp strong {
    font: 0.86rem ui-monospace, SFMono-Regular, Menlo, monospace;
  }

  .viewer-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    padding: 0.75rem 0.85rem;
    border-top: 1px solid #45463f;
    background: #191b17;
  }

  .viewer-footer > p {
    flex: 1 1 20rem;
    margin: 0;
    color: #bab6aa;
    font-size: 0.73rem;
    line-height: 1.45;
  }

  .controls {
    display: flex;
    border: 1px solid #666459;
  }

  .controls button {
    min-height: 2rem;
    padding: 0.4rem 0.65rem;
    border: 0;
    border-right: 1px solid #666459;
    color: #ebe7da;
    background: #242620;
    font-size: 0.72rem;
  }

  .controls button:last-child {
    border-right: 0;
  }

  .controls button:hover {
    background: #34362e;
  }
</style>
