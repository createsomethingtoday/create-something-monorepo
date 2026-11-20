<script lang="ts">
  import type { AgencyPageFoundation } from '$lib/data/agencyPageFoundations';
  let { foundation, compact = false }: { foundation: AgencyPageFoundation; compact?: boolean } = $props();
  const destinations = $derived(foundation.chapters.filter(c => !['main-content','agency-directory'].includes(c.id)).slice(0,3));
</script>

<div class="agency-hero-plate" class:agency-hero-plate--compact={compact} data-page-hero-plate>
  <div class="agency-hero-plate__register"><span>{foundation.label}</span><span>Continue through the page</span></div>
  {#if !compact && destinations.length}
    <nav class="agency-hero-plate__destinations" aria-label="Continue through this page">
      {#each destinations as destination, index}
        <a href={`#${destination.id}`}><span class="agency-hero-plate__index">{String(index+1).padStart(2,'0')}</span><span>{destination.label}<small>{destination.note}</small></span><span aria-hidden="true">↘</span></a>
      {/each}
    </nav>
  {/if}
</div>
