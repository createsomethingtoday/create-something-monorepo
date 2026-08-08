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
  let rendererHandle: ServicesDecisionGateRendererHandle | null = null;
  let rendererState = $state<RendererState>('loading');
  let rendererMetrics = $state<ServicesDecisionGateRendererMetrics | null>(null);
  let visible = false;
  let destroyed = false;
  let reducedMotionQuery: MediaQueryList | null = null;
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
    if (destroyed || !visible || rendererHandle || !hostEl || forceFallback()) {
      if (forceFallback()) setRendererState('fallback');
      return;
    }

    setRendererState('loading');

    try {
      const { createServicesDecisionGateRenderer } =
        await import('$lib/visual/servicesDecisionGateRenderer');
      if (destroyed || !visible || rendererHandle) return;

      rendererHandle = createServicesDecisionGateRenderer(hostEl, {
        reducedMotion: prefersReducedMotion()
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
    disposeRenderer();
    setRendererState('loading');
    void initialiseRenderer();
  }

  onMount(() => {
    reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionQuery.addEventListener('change', handleMotionPreference);
    document.addEventListener('visibilitychange', handleVisibilityChange);

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
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
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
></div>

<style>
  .services-decision-gate-canvas {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    opacity: 0;
    pointer-events: auto;
    transition: opacity var(--duration-performance-standard, 400ms)
      var(--ease-performance-standard, ease);
  }

  .services-decision-gate-canvas[data-renderer-state='ready'] {
    opacity: 1;
    background: #0e1113;
  }

  :global(.services-decision-gate-canvas canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }

  @media (prefers-reduced-motion: reduce) {
    .services-decision-gate-canvas {
      transition: none;
    }
  }
</style>
