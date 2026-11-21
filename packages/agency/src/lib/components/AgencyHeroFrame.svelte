<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/stores';
  import { getAgencyPageFoundation } from '$lib/data/agencyPageFoundations';
  type Scene = { src:string; mobileSrc?:string; aspectRatio?:number; mobileAspectRatio?:number; description?:string };
  let { children, after, compact = false, showPlate = true, scene, sceneInChild = false }: {children:Snippet; after?:Snippet; compact?:boolean; showPlate?:boolean; scene?:Scene; sceneInChild?:boolean} = $props();
  const foundation = $derived(getAgencyPageFoundation($page.url.pathname));
  const image = $derived('/agency/editorial/connected-tools-1280.webp');
</script>
{#if foundation}
  <div class="editorial-hero-frame" class:editorial-hero-frame--compact={compact} data-measured-opening data-editorial-frame>
    <div class="editorial-frame-grid">
      <div class="editorial-frame-copy">{@render children()}</div>
      {#if showPlate && !sceneInChild}
        <figure><img src={image} srcset="/agency/editorial/connected-tools-640.webp 640w, /agency/editorial/connected-tools-1280.webp 1280w" sizes="(min-width: 1024px) 536px, calc(100vw - 32px)" alt="A ceramic paper reel connects two instruments with a shared paper path." width="1280" height="721" fetchpriority="high" /><figcaption>Pause, inspect, and learn. Conceptual illustration.</figcaption></figure>
      {/if}
    </div>
    {#if after}<div class="editorial-frame-artifact">{@render after()}</div>{/if}
  </div>
{:else}
  {@render children()}
{/if}
<style>
  .editorial-hero-frame { box-sizing:border-box; max-width:1152px; margin:auto; padding:6rem 1rem; }
  .editorial-frame-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:3rem; align-items:center; }
  .editorial-frame-copy { min-width:0; }
  .editorial-frame-copy :global(section),.editorial-frame-copy :global(.clear-page-section__inner),.editorial-frame-copy :global(.clear-page-section__copy) { padding:0; margin:0; max-width:none; width:100%; min-height:0; }
  .editorial-frame-copy :global(h1) { font-size:clamp(2.5rem,4.5vw,3.75rem); line-height:1.05; max-width:19ch; }
  figure { margin:0; min-width:0; } img { display:block; width:100%; height:auto; border-radius:1rem; }
  figcaption { margin-top:1rem; font-size:.75rem; color:var(--color-performance-muted); }
  .editorial-frame-artifact { margin-top:3rem; }
  @media(max-width:767px) { .editorial-frame-grid { grid-template-columns:1fr; } .editorial-hero-frame { padding-block:4rem; } }
</style>
