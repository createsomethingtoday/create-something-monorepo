<script lang="ts">
  import { onMount } from 'svelte';
  import AgencyChapterDial from './AgencyChapterDial.svelte';
  import paperMarkup from '$lib/content/agency-paper-example.html?raw';
  import { enhancePaperExample } from '$lib/motion/paperExample';
  import AgencyWorkshopPlate from './AgencyWorkshopPlate.svelte';
  import { webflowStages } from '$lib/data/webflowMarketplace';
  import { enhanceEvidenceDisclosure } from '$lib/motion/evidenceDisclosure';
  import { page } from '$app/stores';
  import rawContent from '$lib/content/agency-story-home.html?raw';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';
  const renderedContent = rawContent.replaceAll('$900/month', PUBLIC_PRICING.membership.focused.label).replaceAll('$2,500/month', PUBLIC_PRICING.membership.team.label);
  const heroEnd = renderedContent.indexOf('</section>') + '</section>'.length;
  const heroContent = renderedContent.slice(0, heroEnd);
  const content = renderedContent.slice(heroEnd).replace('<!-- agency-paper-example -->', `<div class="paper-example" role="region" aria-labelledby="paper-example-title">${paperMarkup}</div>`);

  import { filmOverlayOpen } from '$lib/motion/filmPlayback';
  import FilmCollection from './films/FilmCollection.svelte';
  import BuiltWork from './BuiltWork.svelte';
  import SelectedClientWork from './SelectedClientWork.svelte';
  import { enhanceWalkthroughEntrance } from '$lib/motion/walkthroughEntrance';
  import { enhanceStoryHome } from '$lib/motion/storyHome';
  import { enhanceChapterEntrances } from '$lib/motion/chapterEntrance';
  import { alignScrollProgress } from '$lib/motion/scrollProgress';
  let root: HTMLDivElement;
  let libraryOpen = $state(false);
  $effect(() => { if ($page.url.searchParams.has('film') || $page.url.hash === '#work') libraryOpen = true; });
  onMount(() => {
    const abort = new AbortController();
    const paperRoot = root.querySelector<HTMLElement>('.paper-example');
    const disposePaper = paperRoot ? enhancePaperExample(paperRoot) : () => {};
    const story = enhanceStoryHome(root);
    const chapters = enhanceChapterEntrances(root);
    const progress = alignScrollProgress(root);
    const disposeEvidence = Array.from(root.querySelectorAll<HTMLDetailsElement>('details'), enhanceEvidenceDisclosure);
    const dialog = root.querySelector<HTMLDialogElement>('#work-dialog');
    const entrance = enhanceWalkthroughEntrance(root, dialog);
    let originalOverflow = '';
    let walkthroughOpen = false;
    let opener: HTMLElement | null = null;
    const video = dialog?.querySelector('video');
    const chapterButtons = root.querySelectorAll<HTMLButtonElement>('[data-work-chapter]');
    const contextTitle = dialog?.querySelector<HTMLElement>('[data-work-context-title]');
    const contextEvidence = dialog?.querySelector<HTMLElement>('[data-work-context-evidence]');
    let activeChapter = -1;
    const showChapter = (index: number) => {
      if (index === activeChapter) return;
      activeChapter = index;
      const stage = webflowStages[index];
      if (contextTitle) contextTitle.textContent = `${stage.label} / ${stage.title}`;
      if (contextEvidence) contextEvidence.textContent = stage.evidence;
      chapterButtons.forEach((button, i) => button.setAttribute('aria-current', i === index ? 'step' : 'false'));
    };
    const restoreWalkthrough = () => {
      if (!walkthroughOpen) return;
      walkthroughOpen = false;
      video?.pause();
      filmOverlayOpen.set(false);
      document.body.style.overflow = originalOverflow;
      opener?.focus({ preventScroll: true });
    };
    const closeWalkthrough = () => {
      dialog?.close();
      // Native close events are queued. Restore this session before another
      // opening can capture its scroll lock or receive a stale close event.
      restoreWalkthrough();
    };
    let requestedTime = 0;
    const openWalkthrough = (trigger: HTMLElement, time = 0) => {
      if (!dialog || !video || dialog.open) return;
      restoreWalkthrough(); // Also handles an external native close before its event arrives.
      const sourceFrame = entrance.capture();
      opener = trigger;
      requestedTime = time;
      showChapter(Math.max(0, webflowStages.findIndex(stage => time >= stage.start && time < stage.end)));
      originalOverflow = document.body.style.overflow;
      dialog.showModal();
      walkthroughOpen = true;
      filmOverlayOpen.set(true);
      document.body.style.overflow = 'hidden';
      entrance.enter(sourceFrame);
      if (video.readyState >= 1) video.currentTime = requestedTime;
      void video.play().catch(() => {});
    };
    video?.addEventListener('loadedmetadata', () => { video.currentTime = requestedTime; }, { signal: abort.signal });
    const updateChapter = () => {
      if (!video) return;
      const index = webflowStages.findIndex(stage => video.currentTime + .00001 >= stage.start && video.currentTime + .00001 < stage.end);
      showChapter(index < 0 ? webflowStages.length - 1 : index);
    };
    video?.addEventListener('timeupdate', updateChapter, { signal: abort.signal });
    video?.addEventListener('seeked', updateChapter, { signal: abort.signal });
    chapterButtons.forEach((button, index) => {
      button.disabled = false;
      button.addEventListener('click', () => openWalkthrough(button, webflowStages[index].start), { signal: abort.signal });
    });
    const watchButton = root.querySelector<HTMLButtonElement>('[data-home-open="work-dialog"]');
    if (watchButton) watchButton.disabled = false;
    watchButton?.addEventListener('click', event => {
      openWalkthrough(event.currentTarget as HTMLElement);
    }, { signal: abort.signal });
    dialog?.querySelector<HTMLButtonElement>('[data-home-close]')?.addEventListener('click', closeWalkthrough, { signal: abort.signal });
    dialog?.addEventListener('cancel', event => {
      event.preventDefault();
      closeWalkthrough();
    }, { signal: abort.signal });
    dialog?.addEventListener('close', () => {
      if (!dialog.open) restoreWalkthrough();
    }, { signal: abort.signal });
    return () => {
      abort.abort();
      disposePaper();
      entrance.destroy();
      story.destroy();
      chapters.destroy();
      progress.destroy();
      disposeEvidence.forEach(dispose => dispose());
      dialog?.querySelector('video')?.pause();
      if (walkthroughOpen) {
        filmOverlayOpen.set(false);
        document.body.style.overflow = originalOverflow;
      }
    };
  });
</script>

<svelte:head><link rel="stylesheet" href="/styles/agency/paper-example.css?v=canon-replacement-20261114" /><link rel="stylesheet" href="/styles/agency/story-home.css?v=canon-agency-20261114" /><link rel="preload" as="image" href="/images/canon-agency-v1/hero-wide-v2.webp" media="(min-width:601px)" fetchpriority="high" /><link rel="stylesheet" href="/styles/agency/image-treatment.css?v=graphite-frames-20261105" /><link rel="stylesheet" href="/styles/agency/measured-foundation.css?v=canon-hand-repair-20261114" /><link rel="preload" as="image" href="/images/canon-agency-v1/hero-portrait-v1.webp" media="(max-width:600px)" fetchpriority="high" /></svelte:head>
<div class="agency-home measured-foundation" bind:this={root}>
  <div class="page-progress" aria-hidden="true"></div>
  <AgencyChapterDial />
  {@html heroContent}
  <AgencyWorkshopPlate />
  {@html content}
  <details id="work-library" class="work-library" bind:open={libraryOpen}>
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
