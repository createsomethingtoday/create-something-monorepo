<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import type { PaperWorkflowStageId } from '$lib/data/paperWorkflow';
  import type {
    PaperPressureMotionMode,
    PaperPressureRendererHandle,
    PaperPressureRendererMetrics
  } from '$lib/visual/paperPressureRenderer';

  export let stage: PaperWorkflowStageId;

  let hostEl: HTMLDivElement;
  let canvasEl: HTMLCanvasElement;
  let canvasGeneration = 0;
  let rendererHandle: PaperPressureRendererHandle | null = null;
  let rendererState: 'fallback' | 'loading' | 'ready' = 'fallback';
  let rendererMetrics: PaperPressureRendererMetrics | null = null;
  let visible = false;
  let destroyed = false;
  let intersectionObserver: IntersectionObserver | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let reducedMotionQuery: MediaQueryList | null = null;
  let compactQuery: MediaQueryList | null = null;
  let contextRecoveries = 0;
  let contextRecoveryInFlight = false;
  const MAX_CONTEXT_RECOVERIES = 2;

  function motionMode(): PaperPressureMotionMode {
    return reducedMotionQuery?.matches ? 'reduced' : 'full';
  }

  function resize(): void {
    if (!rendererHandle || !hostEl) return;
    const rect = hostEl.getBoundingClientRect();
    rendererHandle.resize(rect.width, rect.height, window.devicePixelRatio || 1);
    rendererMetrics = rendererHandle.getMetrics();
  }

  function disposeRenderer(forceContextLoss = true): void {
    rendererHandle?.dispose(forceContextLoss);
    rendererHandle = null;
    rendererMetrics = null;
  }

  async function initializeRenderer(): Promise<void> {
    if (destroyed || rendererHandle || !canvasEl || !hostEl) return;
    rendererState = 'loading';

    try {
      const { createPaperPressureRenderer } = await import('$lib/visual/paperPressureRenderer');
      if (destroyed || rendererHandle || !canvasEl || !hostEl) return;
      rendererHandle = createPaperPressureRenderer(canvasEl, hostEl, {
        stage,
        motionMode: motionMode(),
        compact: compactQuery?.matches ?? false
      });
      rendererHandle.setVisible(visible && !document.hidden);
      resize();
      rendererState = 'ready';
    } catch {
      disposeRenderer();
      rendererState = 'fallback';
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

  async function handleContextLost(event: Event): Promise<void> {
    event.preventDefault();
    if (contextRecoveryInFlight) return;
    contextRecoveryInFlight = true;
    disposeRenderer(false);
    rendererState = 'fallback';

    if (destroyed || contextRecoveries >= MAX_CONTEXT_RECOVERIES) {
      contextRecoveryInFlight = false;
      return;
    }

    contextRecoveries += 1;
    canvasGeneration += 1;
    await tick();
    if (destroyed || !visible) {
      contextRecoveryInFlight = false;
      return;
    }
    await initializeRenderer();
    contextRecoveryInFlight = false;
  }

  function canvasListeners(node: HTMLCanvasElement) {
    node.addEventListener('webglcontextlost', handleContextLost, false);
    return {
      destroy(): void {
        node.removeEventListener('webglcontextlost', handleContextLost, false);
      }
    };
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

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(hostEl);

    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          visible = entries.some((entry) => entry.isIntersecting);
          if (visible) void initializeRenderer();
          rendererHandle?.setVisible(visible && !document.hidden);
        },
        { rootMargin: '180px 0px', threshold: 0.01 }
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
    disposeRenderer();
  });
</script>

<div
  bind:this={hostEl}
  class="paper-pressure-canvas"
  data-renderer-state={rendererState}
  data-render-profile={rendererMetrics?.profileId ?? 'unavailable'}
  data-render-budget={rendererMetrics
    ? rendererMetrics.withinBudget
      ? 'pass'
      : 'fail'
    : 'pending'}
  data-draw-calls={rendererMetrics?.drawCalls ?? 0}
  data-geometries={rendererMetrics?.geometries ?? 0}
  data-textures={rendererMetrics?.textures ?? 0}
  data-pixel-ratio={rendererMetrics?.pixelRatio ?? 0}
  aria-hidden="true"
>
  {#key canvasGeneration}
    <canvas bind:this={canvasEl} use:canvasListeners aria-hidden="true"></canvas>
  {/key}
</div>

<style>
  .paper-pressure-canvas {
    position: absolute;
    inset: 4% 3% 5%;
    z-index: 1;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--duration-performance-standard, 400ms)
      var(--ease-performance-standard, ease);
  }

  .paper-pressure-canvas[data-renderer-state='ready'] {
    opacity: 0.92;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  @media (prefers-reduced-motion: reduce) {
    .paper-pressure-canvas {
      transition: none;
    }
  }
</style>
