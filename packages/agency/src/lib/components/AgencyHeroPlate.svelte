<script lang="ts">
  import type { AgencyPageFoundation } from '$lib/data/agencyPageFoundations';
  let { foundation, image, caption, focus = 'center', width = 1536, height = 1024, compact = false, showImage = true }: {
    foundation: AgencyPageFoundation; image: string; caption: string; focus?: string;
    width?: number; height?: number; compact?: boolean; showImage?: boolean;
  } = $props();
  const src = $derived(image.startsWith('original-stories/')
    ? `/images/agency-stories/${image.slice('original-stories/'.length)}.webp`
    : `/images/agency-sales/${image}.webp`);
  const destinations = $derived(foundation.chapters.filter(c => !['main-content','agency-directory'].includes(c.id)).slice(0,3));
</script>

<div class="agency-hero-plate" class:agency-hero-plate--compact={compact} data-page-hero-plate style:--spine-count={foundation.spine.length}>
  <div class="agency-hero-plate__register"><span>{foundation.label}</span><span>{showImage ? 'People, tools & a useful task' : 'Continue through the page'}</span></div>
  {#if showImage}
  <div class="agency-hero-plate__composition">
    <div class="agency-hero-plate__spine" aria-hidden="true">{foundation.spine}</div>
    <figure>
      <img {src} alt={caption} {width} {height} fetchpriority="high" style:object-position={focus} />
      <figcaption>{caption}</figcaption>
    </figure>
  </div>
  {/if}
  {#if !compact && destinations.length}
    <nav class="agency-hero-plate__destinations" aria-label="Continue through this page">
      {#each destinations as destination, index}
        <a href={`#${destination.id}`}><span class="agency-hero-plate__index">{String(index+1).padStart(2,'0')}</span><span>{destination.label}<small>{destination.note}</small></span><span aria-hidden="true">↘</span></a>
      {/each}
    </nav>
  {/if}
</div>
