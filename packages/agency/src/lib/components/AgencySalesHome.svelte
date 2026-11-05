<script lang="ts">
  import { onMount } from 'svelte';
  import WorkflowSignalBand from './WorkflowSignalBand.svelte';
  import { webflowStages } from '$lib/data/webflowMarketplace';
  import { enhanceEvidenceDisclosure } from '$lib/motion/evidenceDisclosure';
  import { page } from '$app/stores';
  import rawContent from '$lib/content/agency-story-home.html?raw';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';
  const renderedContent = rawContent.replaceAll('$900/month', PUBLIC_PRICING.membership.focused.label).replaceAll('$2,500/month', PUBLIC_PRICING.membership.team.label);
  const heroEnd = renderedContent.indexOf('</section>') + '</section>'.length;
  const heroContent = renderedContent.slice(0, heroEnd);
  const content = renderedContent.slice(heroEnd);
  import { reducedFilmMotion, toggleFilmMotion, filmOverlayOpen } from '$lib/motion/filmPlayback';
  import FilmCollection from './films/FilmCollection.svelte';
  import BuiltWork from './BuiltWork.svelte';
  import SelectedClientWork from './SelectedClientWork.svelte';
  import { enhanceStoryHome } from '$lib/motion/storyHome';
  import { enhanceChapterEntrances } from '$lib/motion/chapterEntrance';
  import { alignScrollProgress } from '$lib/motion/scrollProgress';
  let root: HTMLDivElement;
  let libraryOpen = $state(false);
  $effect(() => { if ($page.url.searchParams.has('film') || $page.url.hash === '#work') libraryOpen = true; });
  onMount(() => {
    const abort = new AbortController();
    const story = enhanceStoryHome(root);
    const chapters = enhanceChapterEntrances(root);
    const progress = alignScrollProgress(root);
    const disposeEvidence = Array.from(root.querySelectorAll<HTMLDetailsElement>('details'), enhanceEvidenceDisclosure);
    const dialog = root.querySelector<HTMLDialogElement>('#work-dialog');
    let originalOverflow = '';
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
    let requestedTime = 0;
    const openWalkthrough = (trigger: HTMLElement, time = 0) => {
      if (!dialog || !video) return;
      opener = trigger;
      requestedTime = time;
      showChapter(Math.max(0, webflowStages.findIndex(stage => time >= stage.start && time < stage.end)));
      originalOverflow = document.body.style.overflow;
      dialog.showModal();
      filmOverlayOpen.set(true);
      document.body.style.overflow = 'hidden';
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
    dialog?.querySelector<HTMLButtonElement>('[data-home-close]')?.addEventListener('click', () => dialog.close(), { signal: abort.signal });
    dialog?.addEventListener('close', () => {
      dialog.querySelector('video')?.pause();
      filmOverlayOpen.set(false);
      document.body.style.overflow = originalOverflow;
      opener?.focus({ preventScroll: true });
    }, { signal: abort.signal });
    return () => {
      abort.abort();
      story.destroy();
      chapters.destroy();
      progress.destroy();
      disposeEvidence.forEach(dispose => dispose());
      dialog?.querySelector('video')?.pause();
      if (dialog?.open) {
        filmOverlayOpen.set(false);
        document.body.style.overflow = originalOverflow;
      }
    };
  });
</script>

<svelte:head><link rel="stylesheet" href="/styles/agency/story-home.css?v=chapter-navigation-20261105" /><link rel="preload" as="image" href="/images/agency-sales/hero.webp" fetchpriority="high" /></svelte:head>
<div class="agency-home" bind:this={root}>
  <div class="page-progress" aria-hidden="true"></div>
  <div class="story-tools"><button type="button" onclick={toggleFilmMotion} aria-pressed={$reducedFilmMotion}>{$reducedFilmMotion ? 'Enable motion' : 'Motion off'}</button></div>
  {@html heroContent}
  <WorkflowSignalBand motionOnly quiet tall showMotionControl />
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
