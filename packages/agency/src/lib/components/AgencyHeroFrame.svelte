<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/stores';
  import { getAgencyPageFoundation } from '$lib/data/agencyPageFoundations';
  import { usesAgencyMeasuredPublicSurface } from '$lib/data/publicSurfacePolicy';
  import { agencyWelcomeScene, agencyQuietScene } from '$lib/data/canonAgencyScenes';
  import AgencyHeroPlate from './AgencyHeroPlate.svelte';
  type Scene = { src: string; mobileSrc?: string; aspectRatio?: number; mobileAspectRatio?: number; description?: string };
  let { children, after, compact = false, showPlate = true, scene, sceneInChild = false }: {children: Snippet; after?: Snippet; compact?: boolean; showPlate?: boolean; scene?: Scene; sceneInChild?: boolean} = $props();
  const foundation = $derived(getAgencyPageFoundation($page.url.pathname, $page.url.pathname === '/book' ? $page.url.searchParams.get('intent') : null));
  // Scopefield owns its released product identity and download framing.
  const productOwnsOpening = $derived($page.url.pathname.replace(/\/+$/, '') === '/scopefield');
  const usesScene = $derived(Boolean(foundation && showPlate && !productOwnsOpening && usesAgencyMeasuredPublicSurface($page.url.pathname)));
  const background = $derived(scene ?? (/^\/(?:field-reports|proof|security|stack|methodology|privacy|terms|support-brief)(?:\/|$)/.test($page.url.pathname) ? agencyQuietScene : agencyWelcomeScene));
  const image = (src: string) => `url(${JSON.stringify(src)})`;
</script>

<svelte:head>
  {#if usesScene && !sceneInChild}
    <link rel="preload" as="image" href={background.src} media={background.mobileSrc ? '(min-width: 48rem)' : undefined} />
    {#if background.mobileSrc}<link rel="preload" as="image" href={background.mobileSrc} media="(max-width: 47.99rem)" />{/if}
  {/if}
</svelte:head>

{#if foundation}
  <div class="agency-hero-frame" class:agency-hero-frame--compact={compact} data-agency-scene={usesScene ? 'true' : undefined} data-measured-opening data-scroll-entrance-skip>
    {#if usesScene && !sceneInChild}
      <div class="agency-hero-scene" style:--agency-scene={image(background.src)} style:--agency-scene-mobile={image(background.mobileSrc ?? background.src)} style:--agency-scene-ratio={background.aspectRatio ?? 16 / 9} style:--agency-scene-mobile-ratio={background.mobileAspectRatio ?? background.aspectRatio ?? 16 / 9}>
        <div class="agency-hero-scene__art" role={background.description ? 'img' : undefined} aria-label={background.description} aria-hidden={background.description ? undefined : 'true'}></div>
        <div class="agency-hero-frame__copy agency-hero-scene__copy">{@render children()}</div>
        <div class="agency-hero-scene__reserve" aria-hidden="true"></div>
      </div>
    {:else}
      <div class="agency-hero-frame__copy">{@render children()}</div>
    {/if}
    {#if showPlate}
      <AgencyHeroPlate {foundation} {compact} />
    {/if}
    {#if after}<div class="agency-hero-frame__artifact performance-campaign-opening__artifact">{@render after()}</div>{/if}
  </div>
{:else}
  {@render children()}
{/if}

<style>
  .agency-hero-scene { container-type:inline-size; position:relative; isolation:isolate; display:grid; grid-template-columns:minmax(0,1fr); grid-template-rows:auto auto; background:var(--color-performance-paper); color:var(--color-performance-ink); }
  .agency-hero-scene__art { position:relative; grid-area:1 / 1 / 3 / 2; align-self:end; width:100%; height:calc(100cqw / var(--agency-scene-ratio)); z-index:-1; pointer-events:none; background:var(--agency-scene) center bottom / 100% auto no-repeat; }
  .agency-hero-scene__art::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,var(--color-performance-paper),color-mix(in srgb,var(--color-performance-paper) 92%,transparent) 40%,transparent 54%); mask-image:linear-gradient(#000 0 55%,transparent 78%); }
  .agency-hero-scene__copy { grid-area:1 / 1; box-sizing:border-box; width:44%; min-width:0; padding:clamp(1.25rem,3cqw,3rem); overflow-wrap:anywhere; }
  .agency-hero-scene__reserve { grid-area:2 / 1; height:calc(25cqw / var(--agency-scene-ratio)); }
  @media(max-width:47.99rem) {
    .agency-hero-scene__copy { width:100%; padding:1.25rem; }
    .agency-hero-scene__art { position:relative; grid-area:2 / 1; height:calc(100cqw / var(--agency-scene-mobile-ratio)); background-image:var(--agency-scene-mobile); }
    .agency-hero-scene__art::after { display:none; }
    .agency-hero-scene__reserve { height:calc(100cqw / var(--agency-scene-mobile-ratio)); }
  }
</style>
