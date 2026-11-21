<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import { page } from '$app/stores';
  import { dev } from '$app/environment';
  import { agencyEditorialAssetUrl } from '$lib/data/agencyEditorialPresentation';
  import { PerformanceCampaignOpening } from '@create-something/canon';
  import { getAgencyHeroTreatment } from '$lib/data/agencyHeroTreatment';
  import { usesAgentReadinessStudyCopy } from '$lib/data/agentReadinessStudyVariants';
  let props: ComponentProps<typeof PerformanceCampaignOpening> = $props();
  const treatment = $derived(getAgencyHeroTreatment($page.url.pathname) as {title?:string;lede?:string}|undefined);
  const useBaseline = $derived(!usesAgentReadinessStudyCopy($page.url.pathname,$page.url.searchParams.get('study')));
  const title = $derived(useBaseline ? treatment?.title ?? props.title : props.title);
  const lede = $derived(useBaseline ? treatment?.lede ?? props.lede : props.lede);
  // Real product screenshots and recorded media keep their own identity. Legacy
  // conceptual stage art adopts the current Agency site's approved stills.
  const ownsVisual = $derived(Boolean(props.media && !/^\/images\/(?:canon-agency-v1|performance-lab)\//.test(props.media.src)));
  const imagePath = $derived(ownsVisual && props.media ? props.media.src : $page.url.pathname === '/dispatch' ? '/agency/editorial/field-note-1280.webp' : /^\/(products|workflows|arcs)\/?$/.test($page.url.pathname) ? '/agency/editorial/reference-index-1280.webp' : '/agency/editorial/connected-tools-1280.webp');
  const image = $derived(agencyEditorialAssetUrl(imagePath, dev));
  const alt = $derived(ownsVisual && props.media ? props.media.alt : $page.url.pathname === '/dispatch' ? 'A felt workshop companion folds a field note into an envelope.' : /^\/(products|workflows|arcs)\/?$/.test($page.url.pathname) ? 'An orderly reference index of workshop cards and objects.' : 'A ceramic paper reel connects two instruments with a shared paper path.');
</script>

{#if $page.url.searchParams.has('study')}
  <PerformanceCampaignOpening {...props} />
{:else}
<section class="agency-editorial-opening" aria-label={props.eyebrow} data-editorial-opening data-mobile-search-boundary={props.mobileSearchBoundary ? 'true' : undefined}>
  <div class="editorial-opening-grid">
    <header>
      <h1>{title}</h1>
      {#if lede}<p class="opening-description">{lede}</p>{/if}
      {#if props.actions}<div class="opening-actions">{@render props.actions()}</div>{/if}
    </header>
    {#if props.artifactOwnsMedia && props.artifact}
      <div class="opening-visual">{@render props.artifact()}</div>
    {:else if props.media?.video}
      <figure class="opening-visual">
        <video controls playsinline preload="metadata" poster={props.media.video.poster ?? image} aria-label={props.media.alt}>
          {#if props.media.video.webm}<source src={props.media.video.webm} type="video/webm" />{/if}
          <source src={props.media.video.mp4} type="video/mp4" />
        </video>
        <figcaption>{props.media.alt}</figcaption>
      </figure>
    {:else}
      <figure class="opening-visual">
        <img src={image} srcset={ownsVisual ? undefined : image.replace('-1280.webp','-640.webp') + ' 640w, ' + image + ' 1280w'} sizes={ownsVisual ? undefined : '(min-width: 1024px) 536px, calc(100vw - 32px)'} {alt} width={ownsVisual ? props.media?.width ?? 1280 : 1280} height={ownsVisual ? props.media?.height ?? 721 : 721} fetchpriority={props.priority === false ? 'auto' : 'high'} />
        <figcaption>{ownsVisual ? props.media?.alt : 'Pause, inspect, and learn. Conceptual illustration.'}</figcaption>
      </figure>
    {/if}
  </div>
  {#if props.proof?.length}
    <dl class="opening-facts">{#each props.proof as fact}<div><dt>{fact.label}</dt><dd>{fact.value}</dd></div>{/each}</dl>
  {/if}
  {#if props.artifact && !props.artifactOwnsMedia}<div class="opening-artifact">{@render props.artifact()}</div>{/if}
  {#if props.ornament}<div class="opening-ornament">{@render props.ornament()}</div>{/if}
</section>
{/if}

<style>
  .agency-editorial-opening { box-sizing:border-box; max-width:1152px; margin:auto; padding:6rem 1rem; color:var(--color-performance-ink); }
  .editorial-opening-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:3rem; align-items:center; }
  header { min-width:0; }
  h1 { max-width:18ch; margin:0; font:400 clamp(2.5rem,4.5vw,3.75rem)/1.02 var(--font-performance-display); letter-spacing:-.055em; }
  .opening-description { max-width:40ch; margin:1rem 0 0; font-size:1.2rem; line-height:1.5; color:var(--color-performance-muted); }
  .opening-actions { display:flex; flex-wrap:wrap; gap:.75rem; margin-top:2rem; }
  .opening-actions :global(a) { min-height:44px; border-radius:.4rem; }
  .opening-visual { min-width:0; margin:0; }
  .opening-visual img,.opening-visual video { display:block; width:100%; height:auto; border-radius:1rem; box-shadow:0 1px 3px #00000016; }
  figcaption { margin-top:1rem; font-size:.75rem; line-height:1.5; color:var(--color-performance-muted); }
  .opening-facts { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:2rem; margin:3rem 0 0; padding:1.5rem; background:var(--color-performance-panel); border-radius:1rem; }
  dt { font-size:.8rem; color:var(--color-performance-muted); } dd { margin:.25rem 0 0; font-weight:500; }
  .opening-artifact,.opening-ornament { margin-top:3rem; min-width:0; }
  @media(max-width:767px) { .editorial-opening-grid { grid-template-columns:1fr; gap:3rem; } .agency-editorial-opening { padding-block:4rem; } h1 { max-width:22ch; } }
</style>
