<script lang="ts">
  import { onMount } from 'svelte';

  import { getHeroArtifactScene, type HeroArtifactSceneId } from './physical-artifact.js';
  import type {
    PhysicalArtifactRendererHandle,
    PhysicalArtifactRendererMetrics,
    PhysicalArtifactMotionMode
  } from './physical-artifact-renderer.js';

  interface Props {
    scene: HeroArtifactSceneId;
    /** Enable only where a runtime state makes the motion meaningful. */
    live?: boolean;
    embedded?: boolean;
    onStateChange?: (state: 'loading' | 'ready' | 'fallback' | 'recovering') => void;
  }

  let { scene, live, embedded = false, onStateChange }: Props = $props();
  let hostEl: HTMLDivElement;
  let canvasEl: HTMLCanvasElement;
  let rendererHandle: PhysicalArtifactRendererHandle | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let intersectionObserver: IntersectionObserver | null = null;
  let reducedMotionQuery: MediaQueryList | null = null;
  let compactQuery: MediaQueryList | null = null;
  let visible = true;
  let destroyed = false;
  let recovering = false;
  let rendererState = $state<'loading' | 'ready' | 'fallback' | 'recovering'>('loading');
  let rendererMetrics = $state<PhysicalArtifactRendererMetrics | null>(null);

  const definition = $derived(getHeroArtifactScene(scene));
  const liveEnabled = $derived(live ?? definition.liveEnhancement);

  function setRendererState(nextState: typeof rendererState): void {
    rendererState = nextState;
    onStateChange?.(nextState);
  }

  function motionMode(): PhysicalArtifactMotionMode {
    return reducedMotionQuery?.matches ? 'reduced' : 'full';
  }

  function fallbackRequested(): boolean {
    return new URLSearchParams(window.location.search).get('artifact') === 'fallback';
  }

  function syncMetrics(): void {
    rendererMetrics = rendererHandle?.getMetrics() ?? null;
  }

  function resize(): void {
    if (!rendererHandle || !hostEl) return;
    const bounds = hostEl.getBoundingClientRect();
    rendererHandle.resize(bounds.width, bounds.height, window.devicePixelRatio || 1);
    rendererHandle.renderStatic();
    syncMetrics();
  }

  async function initialiseRenderer(): Promise<void> {
    if (destroyed || rendererHandle || !canvasEl || !hostEl) return;
    if (fallbackRequested()) {
      setRendererState('fallback');
      return;
    }
    try {
      const { createPhysicalArtifactRenderer } = await import('./physical-artifact-renderer.js');
      if (destroyed) return;
      rendererHandle = createPhysicalArtifactRenderer(canvasEl, hostEl, {
        scene,
        live: liveEnabled,
        motionMode: motionMode(),
        compact: compactQuery?.matches ?? false
      });
      resize();
      rendererHandle.setVisible(visible && !document.hidden);
      setRendererState('ready');
      syncMetrics();
    } catch (error) {
      console.warn('[HeroArtifact] WebGL unavailable; keeping the authored artifact fallback.', error);
      setRendererState('fallback');
    }
  }

  function syncVisibility(): void {
    rendererHandle?.setVisible(visible && !document.hidden);
  }

  function handleMotionChange(): void {
    rendererHandle?.setMotionMode(motionMode());
    syncMetrics();
  }

  function handleContextLost(event: Event): void {
    event.preventDefault();
    if (recovering) return;
    recovering = true;
    setRendererState('recovering');
  }

  async function handleContextRestored(): Promise<void> {
    if (destroyed) return;
    setRendererState('recovering');
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    recovering = false;
    if (rendererHandle) {
      resize();
      setRendererState('ready');
      return;
    }
    await initialiseRenderer();
  }

  function disposeRenderer(): void {
    destroyed = true;
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    reducedMotionQuery?.removeEventListener('change', handleMotionChange);
    document.removeEventListener('visibilitychange', syncVisibility);
    canvasEl?.removeEventListener('webglcontextlost', handleContextLost);
    canvasEl?.removeEventListener('webglcontextrestored', handleContextRestored);
    rendererHandle?.dispose();
    rendererHandle = null;
  }

  onMount(() => {
    compactQuery = window.matchMedia('(max-width: 47.99rem)');
    reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionQuery.addEventListener('change', handleMotionChange);
    document.addEventListener('visibilitychange', syncVisibility);
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
    return disposeRenderer;
  });
</script>

<div
  class="hero-artifact"
  class:hero-artifact--embedded={embedded}
  data-hero-artifact
  data-hero-artifact-scene={scene}
  data-hero-artifact-subject={definition.subject}
  data-hero-artifact-state={rendererState}
  data-hero-artifact-mode={liveEnabled ? 'live' : 'poster'}
  data-hero-artifact-desktop-recipe={definition.poster.desktop.recipeHash}
  data-hero-artifact-mobile-recipe={definition.poster.mobile.recipeHash}
  data-hero-artifact-budget={rendererMetrics?.withinBudget === false ? 'exceeded' : 'within'}
  data-hero-artifact-profile={rendererMetrics?.profileId}
  data-hero-artifact-draw-calls={rendererMetrics?.drawCalls}
  aria-hidden="true"
  bind:this={hostEl}
>
  <div class="hero-artifact__fallback" data-hero-artifact-fallback={definition.fallback.kind}>
    <svg viewBox="0 0 720 440" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="artifact-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f4f4ef" />
          <stop offset="1" stop-color="#bfc0b9" />
        </linearGradient>
        <linearGradient id="artifact-field" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#111313" />
          <stop offset="1" stop-color="#050606" />
        </linearGradient>
      </defs>
      <rect width="720" height="440" fill="url(#artifact-field)" />
      <g opacity="0.14" stroke="#f4f4ef" stroke-width="1">
        <path d="M 0 86 H 720 M 0 220 H 720 M 0 354 H 720" />
        <path d="M 120 0 V 440 M 360 0 V 440 M 600 0 V 440" />
      </g>
      {#if definition.subject === 'folded-playbook' || definition.subject === 'three-path'}
        <g fill="url(#artifact-panel)" stroke="#080909" stroke-width="4">
          <path d="M 278 105 L 396 132 L 372 320 L 252 292 Z" />
          <path d="M 396 132 L 516 105 L 548 264 L 372 320 Z" />
          <path d="M 252 292 L 372 320 L 348 370 L 224 340 Z" />
        </g>
        <path d="M 150 266 C 254 210 334 295 464 170" fill="none" stroke="#0057b8" stroke-width="8" />
        <circle cx="466" cy="170" r="16" fill="none" stroke="#007a4d" stroke-width="8" />
      {:else if definition.subject === 'gated-route'}
        <g fill="url(#artifact-panel)" stroke="#080909" stroke-width="4">
          <rect x="164" y="224" width="96" height="78" rx="6" />
          <rect x="328" y="224" width="96" height="78" rx="6" />
          <rect x="492" y="224" width="96" height="78" rx="6" />
        </g>
        <path d="M 208 190 H 390 V 116 H 444" fill="none" stroke="#c62026" stroke-width="12" />
        <path d="M 180 258 H 552" fill="none" stroke="#0057b8" stroke-width="8" />
      {:else if definition.subject === 'runtime-rig'}
        <circle cx="382" cy="228" r="116" fill="none" stroke="url(#artifact-panel)" stroke-width="42" />
        <circle cx="382" cy="228" r="52" fill="none" stroke="#007a4d" stroke-width="14" />
        <path d="M 254 228 H 110 M 448 174 L 570 102 M 448 282 L 582 356" stroke="#0057b8" stroke-width="9" />
        <path d="M 588 104 V 358" stroke="#e54800" stroke-width="12" />
      {:else if definition.subject === 'basketball-court'}
        <rect x="140" y="108" width="442" height="244" rx="8" fill="url(#artifact-panel)" stroke="#080909" stroke-width="5" />
        <path d="M 361 108 V 352 M 140 230 H 582" stroke="#f4f4ef" stroke-width="4" fill="none" />
        <circle cx="361" cy="230" r="31" fill="none" stroke="#f4f4ef" stroke-width="4" />
        <path d="M 175 292 C 290 238 383 283 512 172" stroke="#0057b8" stroke-width="8" fill="none" />
        <circle cx="350" cy="246" r="21" fill="#e54800" stroke="#080909" stroke-width="5" />
      {:else}
        <g fill="url(#artifact-panel)" stroke="#080909" stroke-width="4">
          <path d="M 230 119 H 469 L 520 296 H 280 Z" />
          <path d="M 248 143 H 488 L 508 310 H 268 Z" opacity="0.8" />
          <path d="M 264 168 H 504 L 528 328 H 288 Z" opacity="0.65" />
        </g>
        <path d="M 215 282 C 307 184 389 288 508 172" fill="none" stroke="#0057b8" stroke-width="8" />
        <path d="M 535 126 V 332" stroke="#c62026" stroke-width="10" />
        <circle cx="426" cy="264" r="20" fill="none" stroke="#007a4d" stroke-width="9" />
      {/if}
    </svg>
  </div>
  <canvas bind:this={canvasEl}></canvas>
</div>

<style>
  .hero-artifact {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .hero-artifact--embedded {
    position: absolute;
    inset: 0;
  }

  .hero-artifact__fallback,
  .hero-artifact canvas {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }

  .hero-artifact__fallback {
    opacity: 1;
    transition: opacity var(--duration-performance-standard, 400ms)
      var(--ease-performance-standard, ease);
  }

  .hero-artifact__fallback svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .hero-artifact canvas {
    opacity: 0;
    transition: opacity var(--duration-performance-standard, 400ms)
      var(--ease-performance-standard, ease);
  }

  .hero-artifact[data-hero-artifact-state='ready'] canvas {
    opacity: 1;
  }

  .hero-artifact[data-hero-artifact-state='ready'] .hero-artifact__fallback {
    opacity: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-artifact__fallback,
    .hero-artifact canvas {
      transition: none;
    }
  }

  @media (max-width: 47.99rem) {
    .hero-artifact--embedded {
      position: relative;
      inset: auto;
      min-height: clamp(17rem, 62vw, 24rem);
    }
  }
</style>
