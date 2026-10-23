<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import content from '$lib/content/agency-home.html?raw';
  import { mountPreviewTrace } from '$lib/motion/previewWorkflowTrace';
  import FilmCollection from './films/FilmCollection.svelte';
  import BuiltWork from './BuiltWork.svelte';
  import SelectedClientWork from './SelectedClientWork.svelte';
  let root: HTMLDivElement;
  let libraryOpen = $state(false);
  $effect(() => { if ($page.url.searchParams.has('film') || $page.url.hash === '#work') libraryOpen = true; });
  onMount(() => {
    const cleanups = Array.from(root.querySelectorAll<HTMLElement>('.workflow-trace')).map(mountPreviewTrace);
    return () => cleanups.forEach(cleanup => cleanup());
  });
</script>

<svelte:head><link rel="stylesheet" href="/styles/agency/home.css" /><link rel="preload" as="image" href="/images/agency-sales/hero.webp" fetchpriority="high" /></svelte:head>
<div class="agency-home" bind:this={root}>
  {@html content}
  <details id="work" class="work-library" bind:open={libraryOpen}>
    <summary>Explore the work library <span>Films, source and field reports +</span></summary>
    {#if libraryOpen}<BuiltWork sectionId="engineering-work" /><FilmCollection /><SelectedClientWork />{/if}
    <noscript><a href="/products">Explore the product library</a> · <a href="/field-reports">Read field reports</a></noscript>
  </details>
</div>

<style>
  .work-library{padding:var(--space-performance-xl) 6vw;border-top:1px solid var(--color-performance-border-default)}
  .work-library>summary{cursor:pointer;min-height:44px;display:flex;justify-content:space-between;gap:var(--space-performance-md)}
  .work-library>summary:focus-visible{outline:2px solid currentColor;outline-offset:4px}
  @media(max-width:600px){.work-library>summary{flex-direction:column}}
</style>
