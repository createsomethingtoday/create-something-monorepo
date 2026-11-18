<script lang="ts">
  import { page } from '$app/stores';
  import { getAgencyHero } from '$lib/data/agencyHeroCoverage';
  import backgroundStyles from '$lib/styles/hero-background.css?raw';
  import { agencyHeroStyles } from '$lib/data/agencyHeroStyles';

  const hero = $derived($page.status < 400 ? getAgencyHero($page.url.pathname) : undefined);
  // Only repository-owned selectors and asset paths enter this CSS. Never
  // interpolate pathname, query parameters, CMS content or user-supplied URLs.
  const stylesheet = $derived(agencyHeroStyles(hero, backgroundStyles));
</script>

<svelte:head>
  {#if hero}
    <link rel="preload" as="image" href={hero.src} media={hero.mobileSrc ? '(width > 800px)' : undefined} fetchpriority="high" />
    {#if hero.mobileSrc}
      <link rel="preload" as="image" href={hero.mobileSrc} media="(max-width: 800px)" fetchpriority="high" />
    {/if}
    {@html stylesheet}
  {/if}
</svelte:head>
