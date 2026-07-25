<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type { PublicProductId } from '$lib/data/productFamily';
  import type {
    PipelineMotionMode,
    PipelineRendererHandle,
    PipelineRendererMetrics
  } from '$lib/visual/pipelineRenderer';

  export let stage: PublicProductId;
  export let onstatechange: ((state: 'fallback' | 'loading' | 'ready') => void) | undefined =
    undefined;

  let hostEl: HTMLDivElement;
  let canvasEl: HTMLCanvasElement;
  let rendererHandle: PipelineRendererHandle | null = null;
  let rendererState: 'fallback' | 'loading' | 'ready' = 'fallback';
  let rendererMetrics: PipelineRendererMetrics | null = null;
  let visible = false;
  let destroyed = false;
  let intersectionObserver: IntersectionObserver | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let reducedMotionQuery: MediaQueryList | null = null;
  let compactQuery: MediaQueryList | null = null;

  function setRendererState(state: 'fallback' | 'loading' | 'ready'): void {
    rendererState = state;
    onstatechange?.(state);
  }

  function motionMode(): PipelineMotionMode {
    return reducedMotionQuery?.matches ? 'reduced' : 'full';
  }

  function resize(): void {
    if (!rendererHandle || !hostEl) return;
    const rect = hostEl.getBoundingClientRect();
    rendererHandle.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    rendererMetrics = rendererHandle.getMetrics();
  }

  function disposeRenderer(): void {
    rendererHandle?.dispose();
    rendererHandle = null;
    rendererMetrics = null;
  }

  async function initializeRenderer(): Promise<void> {
    if (destroyed || rendererHandle || !canvasEl || !hostEl) return;
    setRendererState('loading');

    try {
      const { createPipelineRenderer } = await import('$lib/visual/pipelineRenderer');
      if (destroyed || rendererHandle || !canvasEl || !hostEl) return;
      rendererHandle = createPipelineRenderer(canvasEl, hostEl, {
        stage,
        motionMode: motionMode(),
        compact: compactQuery?.matches ?? false
      });
      rendererHandle.setVisible(visible && !document.hidden);
      resize();
      setRendererState('ready');
    } catch {
      disposeRenderer();
      setRendererState('fallback');
    }
  }

  function handleMotionChange(): void {
    rendererHandle?.setMotionMode(motionMode());
    if (motionMode() === 'reduced') rendererHandle?.renderStatic();
    rendererMetrics = rendererHandle?.getMetrics() ?? null;
  }

  function handleVisibilityChange(): void {
    rendererHandle?.setVisible(visible && !document.hidden);
  }

  function handleContextLost(event: Event): void {
    event.preventDefault();
    disposeRenderer();
    setRendererState('fallback');
  }

  function handleContextRestored(): void {
    void initializeRenderer();
  }

  $: if (rendererHandle) {
    rendererHandle.setStage(stage);
    rendererMetrics = rendererHandle.getMetrics();
  }

  onMount(() => {
    reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    compactQuery = window.matchMedia('(max-width: 760px)');
    reducedMotionQuery.addEventListener('change', handleMotionChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    canvasEl.addEventListener('webglcontextlost', handleContextLost, false);
    canvasEl.addEventListener('webglcontextrestored', handleContextRestored, false);

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(hostEl);

    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          if (visible) void initializeRenderer();
          rendererHandle?.setVisible(visible && !document.hidden);
        },
        { rootMargin: '240px 0px', threshold: 0.01 }
      );
      intersectionObserver.observe(hostEl);
    } else {
      visible = true;
      void initializeRenderer();
    }
  });

  onDestroy(() => {
    destroyed = true;
    if (typeof document === 'undefined') return;
    intersectionObserver?.disconnect();
    resizeObserver?.disconnect();
    reducedMotionQuery?.removeEventListener('change', handleMotionChange);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    canvasEl?.removeEventListener('webglcontextlost', handleContextLost, false);
    canvasEl?.removeEventListener('webglcontextrestored', handleContextRestored, false);
    disposeRenderer();
  });
</script>

<div
  bind:this={hostEl}
  class="pipeline-canvas"
  data-renderer-state={rendererState}
  data-scene-stage={stage}
  data-draw-calls={rendererMetrics?.drawCalls ?? 0}
  data-geometries={rendererMetrics?.geometries ?? 0}
  data-textures={rendererMetrics?.textures ?? 0}
  data-pixel-ratio={rendererMetrics?.pixelRatio ?? 0}
  aria-hidden="true"
>
  <canvas bind:this={canvasEl} aria-hidden="true"></canvas>
  <div class="pipeline-canvas__scan" aria-hidden="true"></div>
</div>

<style>
  .pipeline-canvas {
    position: absolute;
    inset: 0;
    z-index: 1;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--duration-performance-standard, 400ms)
      var(--ease-performance-standard, ease);
  }

  .pipeline-canvas[data-renderer-state='ready'] {
    opacity: 1;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .pipeline-canvas__scan {
    position: absolute;
    inset: 12% 3%;
    border-top: 1px solid color-mix(in srgb, var(--waterway-signal) 36%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--waterway-panel) 10%, transparent);
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in srgb, var(--waterway-signal) 8%, transparent) 52%,
      transparent
    );
    mix-blend-mode: screen;
    opacity: 0.56;
    animation: pipeline-scan calc(var(--duration-performance-slow, 700ms) * 8) linear infinite;
  }

  @keyframes pipeline-scan {
    0%,
    100% {
      transform: translateY(-4%);
      opacity: 0.32;
    }
    50% {
      transform: translateY(4%);
      opacity: 0.62;
    }
  }

  @media (max-width: 760px) {
    .pipeline-canvas {
      position: relative;
      inset: auto;
      height: 15rem;
      margin: 0 -1rem 1rem;
      border-block: 1px solid color-mix(in srgb, var(--waterway-panel) 12%, transparent);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pipeline-canvas {
      transition: none;
    }

    .pipeline-canvas__scan {
      animation: none;
      transform: none;
    }
  }
</style>
