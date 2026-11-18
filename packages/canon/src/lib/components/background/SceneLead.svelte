<script lang="ts">
 import type {Snippet} from 'svelte';
 import BackgroundScene from './BackgroundScene.svelte';
 import type {CanonBackgroundScene} from './scene.js';
 let {scene,children,enhancement,colorMode="natural"}: {scene:CanonBackgroundScene;children:Snippet;enhancement?:Snippet;colorMode?:"natural"|"monochrome"}=$props();
</script>
<div class="canon-scene-lead" style:--scene-ratio={scene.aspectRatio??16/9} style:--scene-mobile-ratio={scene.mobileAspectRatio??(scene.mobileSrc?9/16:scene.aspectRatio??16/9)}>
 <div class="canon-scene-lead__art" data-color-mode={colorMode}><BackgroundScene {scene}/>{#if enhancement}<div class="canon-scene-lead__enhancement">{@render enhancement()}</div>{/if}</div>
 <div class="canon-scene-lead__copy"><div class="canon-scene-lead__content">{@render children()}</div></div>
 <div class="canon-scene-lead__reserved" aria-hidden="true"></div>
</div>
<style>
 .canon-scene-lead{container-type:inline-size;position:relative;isolation:isolate;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto;background:var(--color-performance-paper);color:var(--color-performance-ink);}
 .canon-scene-lead__art{position:relative;grid-area:1 / 1 / 3 / 2;align-self:end;width:100%;height:calc(100cqw / var(--scene-ratio));pointer-events:none;z-index:-1;}
 .canon-scene-lead__art[data-color-mode="monochrome"] :global(.canon-background-scene),.canon-scene-lead__art[data-color-mode="monochrome"] :global(video){filter:grayscale(1) contrast(1.08);}
 .canon-scene-lead__art::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,color-mix(in srgb,var(--color-performance-paper) 94%,transparent),color-mix(in srgb,var(--color-performance-paper) 90%,transparent) 40%,transparent 48%);mask-image:linear-gradient(180deg,#000 0%,#000 58%,transparent 74%);pointer-events:none;}
 .canon-scene-lead__content{display:grid;justify-items:start;gap:1rem;min-width:0;width:100%;}
 .canon-scene-lead__copy{grid-area:1 / 1;box-sizing:border-box;display:grid;align-content:start;justify-items:start;gap:1rem;width:44%;min-height:0;padding:clamp(1.25rem,3cqw,3.5rem);overflow-wrap:anywhere;}
 .canon-scene-lead .canon-scene-lead__copy :global(header){display:grid;gap:1rem;width:100%;max-width:none;min-height:0;padding:0;background:none;border:0;border-radius:0;}
 .canon-scene-lead .canon-scene-lead__copy :global(h1),.canon-scene-lead .canon-scene-lead__copy :global(h2){margin:0;max-width:none;font-family:var(--font-performance-sans);font-size:clamp(1.75rem,4.4cqw,4.5rem) !important;font-weight:500;line-height:1.1;letter-spacing:-.035em;text-wrap:pretty;background:none;padding:0;}
 .canon-scene-lead .canon-scene-lead__copy :global(p){margin:0;color:var(--color-performance-muted);font-size:clamp(.9375rem,1.3cqw,1.125rem);line-height:1.5;background:none;padding:0;}
 .canon-scene-lead__copy :global([data-scene-eyebrow]){font:500 .875rem/1.4 var(--font-performance-mono);color:var(--color-performance-muted);}
 .canon-scene-lead__copy :global([data-scene-actions]){display:flex;flex-wrap:wrap;gap:.75rem;min-width:0;max-width:100%;}
 .canon-scene-lead__copy :global(.btn){max-width:100%;white-space:normal;}
 .canon-scene-lead__enhancement{position:absolute;inset:0;}
 .canon-scene-lead__enhancement :global(video){width:100%;height:100%;object-fit:contain;}
 /* Intrinsic grid rows reserve the artwork before hydration. Long copy grows
    the quiet wall upward; the lower quarter stays clear of text. */
 .canon-scene-lead__reserved{grid-area:2 / 1;height:calc(25cqw / var(--scene-ratio));}
 @media(max-width:47.99rem){
  .canon-scene-lead__content{gap:.75rem;}
  .canon-scene-lead__reserved{height:calc(55cqw / var(--scene-mobile-ratio));}
  .canon-scene-lead__art::after{background:linear-gradient(180deg,color-mix(in srgb,var(--color-performance-paper) 96%,transparent),color-mix(in srgb,var(--color-performance-paper) 94%,transparent) 44%,transparent 49%);mask-image:none;}
  .canon-scene-lead__art{height:calc(100cqw / var(--scene-mobile-ratio));}
  .canon-scene-lead__copy{width:100%;min-height:calc(45cqw / var(--scene-mobile-ratio));padding:1.25rem;align-content:start;gap:.75rem;}
  .canon-scene-lead .canon-scene-lead__copy :global(h1),.canon-scene-lead .canon-scene-lead__copy :global(h2){font-size:clamp(1.6rem,7cqw,2.1rem) !important;}
 }
</style>
