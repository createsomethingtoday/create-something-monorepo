<script lang="ts">
  import type { Snippet } from 'svelte';
  import { page } from '$app/stores';
  import { getAgencyPageFoundation } from '$lib/data/agencyPageFoundations';
  import { getAgencyHeroTreatment } from '$lib/data/agencyHeroTreatment';
  import AgencyHeroPlate from './AgencyHeroPlate.svelte';
  let { children, after, compact = false, showPlate = true }: {children: Snippet; after?: Snippet; compact?: boolean; showPlate?: boolean} = $props();
  const foundation = $derived(getAgencyPageFoundation($page.url.pathname, $page.url.pathname === '/book' ? $page.url.searchParams.get('intent') : null));
  const treatment = $derived(getAgencyHeroTreatment($page.url.pathname) as {image?:string|null;caption?:string;focus?:string;width?:number;height?:number}|undefined);
</script>

{#if foundation}
  <div class="agency-hero-frame" class:agency-hero-frame--compact={compact} data-measured-opening data-scroll-entrance-skip>
    <div class="agency-hero-frame__copy">{@render children()}</div>
    {#if showPlate}
      <AgencyHeroPlate {foundation} {compact} image={treatment?.image ?? 'macro'} caption={treatment?.caption ?? 'Concept illustration · make the work and its boundaries clear.'} focus={treatment?.focus} width={treatment?.width} height={treatment?.height} />
    {/if}
    {#if after}<div class="agency-hero-frame__artifact performance-campaign-opening__artifact">{@render after()}</div>{/if}
  </div>
{:else}
  {@render children()}
{/if}
