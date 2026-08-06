<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import type {
    ServicesDecisionGateRendererHandle,
    ServicesDecisionGateRendererMetrics
  } from '$lib/visual/servicesDecisionGateRenderer';

  type RendererState = 'fallback' | 'loading' | 'ready';

  interface Props {
    onStateChange?: (state: RendererState) => void;
  }

  let { onStateChange }: Props = $props();
  let hostEl: HTMLDivElement;
  let canvasEl: HTMLCanvasElement;
  let rendererHandle: ServicesDecisionGateRendererHandle | null = null;
  let rendererState = $state<RendererState>('loading');
  let rendererMetrics = $state<ServicesDecisionGateRendererMetrics | null>(null);
  let visible = false;
  let destroyed = false;
  let reducedMotionQuery: MediaQueryList | null = null;
  let compactQuery: MediaQueryList | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let intersectionObserver: IntersectionObserver | null = null;

  function setRendererState(nextState: RendererState): void {
    rendererState = nextState;
    onStateChange?.(nextState);
  }

  function forceFallback(): boolean {
    return new URLSearchParams(window.location.search).get('decision-gate') === 'fallback';
  }

  function prefersReducedMotion(): boolean {
    return reducedMotionQuery?.matches ?? false;
  }

  function disposeRenderer(forceContextLoss = true): void {
    rendererHandle?.dispose(forceContextLoss);
    rendererHandle = null;
    rendererMetrics = null;
  }

  function resize(): void {
    if (!rendererHandle || !hostEl) return;
    const bounds = hostEl.getBoundingClientRect();
    rendererHandle.resize(bounds.width, bounds.height, window.devicePixelRatio || 1);
    rendererMetrics = rendererHandle.getMetrics();
  }

  async function initialiseRenderer(): Promise<void> {
    if (
      destroyed ||
      !visible ||
      rendererHandle ||
      !canvasEl ||
      !hostEl ||
      forceFallback() ||
      prefersReducedMotion()
    ) {
      if (forceFallback() || prefersReducedMotion()) setRendererState('fallback');
      return;
    }

    setRendererState('loading');

    try {
      const { createServicesDecisionGateRenderer } =
        await import('$lib/visual/servicesDecisionGateRenderer');
      if (destroyed || !visible || rendererHandle || prefersReducedMotion()) return;

      rendererHandle = createServicesDecisionGateRenderer(canvasEl, hostEl, {
        compact: compactQuery?.matches ?? false
      });
      resize();
      rendererHandle.setVisible(visible && !document.hidden);
      rendererMetrics = rendererHandle.getMetrics();
      setRendererState('ready');
    } catch {
      disposeRenderer();
      setRendererState('fallback');
    }
  }

  function syncVisibility(): void {
    rendererHandle?.setVisible(visible && !document.hidden);
  }

  function handleVisibilityChange(): void {
    syncVisibility();
  }

  function handleMotionPreference(): void {
    if (prefersReducedMotion()) {
      disposeRenderer();
      setRendererState('fallback');
      return;
    }

    void initialiseRenderer();
  }

  function handleCompactChange(): void {
    if (!rendererHandle) return;
    disposeRenderer();
    setRendererState('loading');
    void initialiseRenderer();
  }

  function handleContextLost(event: Event): void {
    event.preventDefault();
    disposeRenderer(false);
    setRendererState('fallback');
  }

  onMount(() => {
    reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    compactQuery = window.matchMedia('(max-width: 47.99rem)');
    reducedMotionQuery.addEventListener('change', handleMotionPreference);
    compactQuery.addEventListener('change', handleCompactChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    canvasEl.addEventListener('webglcontextlost', handleContextLost, false);

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(hostEl);

    if ('IntersectionObserver' in window) {
      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          visible = entry?.isIntersecting ?? false;
          if (visible) void initialiseRenderer();
          syncVisibility();
        },
        { rootMargin: '160px 0px', threshold: 0.01 }
      );
      intersectionObserver.observe(hostEl);
    } else {
      visible = true;
      void initialiseRenderer();
    }
  });

  onDestroy(() => {
    destroyed = true;
    intersectionObserver?.disconnect();
    resizeObserver?.disconnect();
    reducedMotionQuery?.removeEventListener('change', handleMotionPreference);
    compactQuery?.removeEventListener('change', handleCompactChange);
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    canvasEl?.removeEventListener('webglcontextlost', handleContextLost);
    disposeRenderer();
  });
</script>

<div
  bind:this={hostEl}
  class="services-decision-gate-canvas"
  data-renderer-state={rendererState}
  data-renderer-profile={rendererMetrics?.profileId ?? 'unavailable'}
  data-renderer-budget={rendererMetrics
    ? rendererMetrics.withinBudget
      ? 'pass'
      : 'fail'
    : 'pending'}
  data-renderer-draw-calls={rendererMetrics?.drawCalls ?? 0}
  data-renderer-geometries={rendererMetrics?.geometries ?? 0}
  data-renderer-textures={rendererMetrics?.textures ?? 0}
  data-renderer-pixel-ratio={rendererMetrics?.pixelRatio ?? 0}
  aria-hidden="true"
>
  <canvas bind:this={canvasEl} aria-hidden="true"></canvas>
</div>

<style>
  .services-decision-gate-canvas {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--duration-performance-standard, 400ms)
      var(--ease-performance-standard, ease);
  }

  .services-decision-gate-canvas[data-renderer-state='ready'] {
    opacity: 1;
    background:
      radial-gradient(ellipse 48% 62% at 83% 74%, rgba(146, 112, 52, 0.18), transparent 72%),
      linear-gradient(
        90deg,
        var(--color-performance-paper, #f3f3f0) 0%,
        var(--color-performance-paper, #f3f3f0) 48%,
        #202325 66%,
        #0d0f10 100%
      );
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  @media (max-width: 47.99rem) {
    .services-decision-gate-canvas {
      inset: 46% 0 0;
    }

    .services-decision-gate-canvas[data-renderer-state='ready'] {
      background:
        radial-gradient(ellipse 78% 38% at 54% 86%, rgba(146, 112, 52, 0.18), transparent 78%),
        linear-gradient(180deg, rgba(243, 243, 240, 0) 0%, #202325 26%, #0d0f10 100%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .services-decision-gate-canvas {
      transition: none;
    }
  }
</style>
