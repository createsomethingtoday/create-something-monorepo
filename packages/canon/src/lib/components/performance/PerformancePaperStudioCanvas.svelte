<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte';
  import type { PerformancePaperProperty, PerformancePaperStage } from './media/paper-studio';
  import type {
    PerformancePaperMotionMode,
    PerformancePaperStudioHandle,
    PerformancePaperStudioMetrics
  } from './media/paper-studio-renderer';

  interface Props {
    shot: PerformancePaperProperty;
    stage?: PerformancePaperStage;
    embedded?: boolean;
    onStateChange?: (state: 'loading' | 'ready' | 'fallback' | 'recovering') => void;
  }

  let { shot, stage = 'control', embedded = false, onStateChange }: Props = $props();
  let hostEl: HTMLDivElement;
  let canvasEl: HTMLCanvasElement;
  let rendererHandle: PerformancePaperStudioHandle | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let intersectionObserver: IntersectionObserver | null = null;
  let compactQuery: MediaQueryList | null = null;
  let reducedMotionQuery: MediaQueryList | null = null;
  let visible = true;
  let destroyed = false;
  let recoveryInFlight = false;
  let rendererState = $state<'loading' | 'ready' | 'fallback' | 'recovering'>('loading');
  let rendererMetrics = $state<PerformancePaperStudioMetrics | null>(null);

  function setRendererState(nextState: typeof rendererState): void {
    rendererState = nextState;
    onStateChange?.(nextState);
  }

  function motionMode(): PerformancePaperMotionMode {
    return reducedMotionQuery?.matches ? 'reduced' : 'full';
  }

  function forcedFallback(): boolean {
    return new URLSearchParams(window.location.search).get('paper-studio') === 'fallback';
  }

  function syncMetrics(): void {
    if (!rendererHandle) return;
    rendererMetrics = rendererHandle.getMetrics();
  }

  async function initialiseRenderer(): Promise<void> {
    if (destroyed || rendererHandle || !canvasEl || !hostEl || forcedFallback()) {
      if (forcedFallback()) setRendererState('fallback');
      return;
    }
    try {
      const { createPerformancePaperStudioRenderer } =
        await import('./media/paper-studio-renderer');
      if (destroyed) return;
      rendererHandle = createPerformancePaperStudioRenderer(canvasEl, hostEl, {
        shot,
        stage,
        motionMode: motionMode(),
        compact: compactQuery?.matches ?? false
      });
      resize();
      rendererHandle.setVisible(visible && !document.hidden);
      setRendererState('ready');
      syncMetrics();
    } catch (error) {
      console.warn('[PerformancePaperStudio] WebGL unavailable; keeping semantic fallback.', error);
      setRendererState('fallback');
    }
  }

  function resize(): void {
    if (!rendererHandle || !hostEl) return;
    const bounds = hostEl.getBoundingClientRect();
    rendererHandle.resize(bounds.width, bounds.height, window.devicePixelRatio || 1);
    rendererHandle.renderStatic();
    syncMetrics();
  }

  function syncVisibility(): void {
    rendererHandle?.setVisible(visible && !document.hidden);
  }

  async function handleContextLost(event: Event): Promise<void> {
    event.preventDefault();
    if (recoveryInFlight) return;
    recoveryInFlight = true;
    setRendererState('recovering');
  }

  async function handleContextRestored(): Promise<void> {
    if (destroyed) return;
    setRendererState('recovering');
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    recoveryInFlight = false;
    if (rendererHandle) {
      resize();
      setRendererState('ready');
      return;
    }
    await initialiseRenderer();
  }

  function handleVisibilityChange(): void {
    syncVisibility();
  }

  function handleMotionPreference(): void {
    rendererHandle?.setMotionMode(motionMode());
    syncMetrics();
  }

  $effect(() => {
    stage;
    if (!rendererHandle) return;
    rendererHandle.setStage(stage);
    syncMetrics();
  });

  onMount(() => {
    compactQuery = window.matchMedia('(max-width: 47.99rem)');
    reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionQuery.addEventListener('change', handleMotionPreference);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    canvasEl.addEventListener('webglcontextlost', handleContextLost);
    canvasEl.addEventListener('webglcontextrestored', handleContextRestored);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(hostEl);

    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          visible = entry?.isIntersecting ?? true;
          syncVisibility();
        },
        { rootMargin: '160px' }
      );
      intersectionObserver.observe(hostEl);
    }

    void initialiseRenderer();
  });

  onDestroy(() => {
    destroyed = true;
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    reducedMotionQuery?.removeEventListener('change', handleMotionPreference);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    canvasEl?.removeEventListener('webglcontextlost', handleContextLost);
    canvasEl?.removeEventListener('webglcontextrestored', handleContextRestored);
    rendererHandle?.dispose();
    rendererHandle = null;
  });
</script>

<div
  class="performance-paper-studio"
  class:performance-paper-studio--embedded={embedded}
  data-paper-studio
  data-paper-shot={shot}
  data-paper-stage={stage}
  data-renderer-state={rendererState}
  data-renderer-profile={rendererMetrics?.profileId}
  data-renderer-budget={rendererMetrics?.withinBudget === false ? 'exceeded' : 'within'}
  data-renderer-draw-calls={rendererMetrics?.drawCalls}
  data-renderer-geometries={rendererMetrics?.geometries}
  data-renderer-textures={rendererMetrics?.textures}
  bind:this={hostEl}
  aria-hidden="true"
>
  <canvas bind:this={canvasEl}></canvas>
</div>

<style>
  .performance-paper-studio {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  .performance-paper-studio canvas {
    display: block;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity var(--duration-performance-standard, 400ms)
      var(--ease-performance-standard, ease);
  }

  .performance-paper-studio[data-renderer-state='ready'] canvas {
    opacity: 1;
  }

  .performance-paper-studio--embedded {
    inset: 0;
  }

  @media (max-width: 47.99rem) {
    .performance-paper-studio:not(.performance-paper-studio--embedded) {
      top: 55%;
      height: 22%;
    }

    .performance-paper-studio--embedded {
      inset: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .performance-paper-studio canvas {
      transition: none;
    }
  }
</style>
