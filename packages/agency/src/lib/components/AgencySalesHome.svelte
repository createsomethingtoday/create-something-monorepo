<script lang="ts">
  import { onMount } from 'svelte';
  import { enhanceEvidenceDisclosure } from '$lib/motion/evidenceDisclosure';
  import { page } from '$app/stores';
  import content from '$lib/content/agency-home.html?raw';
  import { filmOverlayOpen } from '$lib/motion/filmPlayback';
  import FilmCollection from './films/FilmCollection.svelte';
  import BuiltWork from './BuiltWork.svelte';
  import SelectedClientWork from './SelectedClientWork.svelte';
  let root: HTMLDivElement;
  let libraryOpen = $state(false);
  $effect(() => { if ($page.url.searchParams.has('film') || $page.url.hash === '#work') libraryOpen = true; });
  onMount(() => {
    const abort = new AbortController();
    const disposeEvidence = Array.from(root.querySelectorAll<HTMLDetailsElement>('[data-evidence-reveal]'), enhanceEvidenceDisclosure);
    const image = root.querySelector<HTMLImageElement>('#journey-image');
    const caption = root.querySelector<HTMLElement>('#journey-caption');
    const status = root.querySelector<HTMLElement>('#journey-status');
    const scenes = {
      learn: { src: image?.getAttribute('src') ?? '/images/agency-sales/team.webp', alt: 'Concept illustration: teammates work through an example with a shared guide.', caption: 'Learn / Work through an example together.' },
      build: { src: '/images/agency-sales/macro.webp', alt: 'Concept illustration: teammates inspect the join between connected graphite modules.', caption: 'Build / Connect the tools. Inspect the join.' },
      run: { src: '/images/agency-sales/run-reviewed-v1.webp', alt: 'Original conceptual illustration: teammates operate a completed rail tool while their guide reviews the result.', caption: 'Run / Review the result. Agree the next step.' }
    };
    const buttons = root.querySelectorAll<HTMLButtonElement>('[data-home-step]');
    for (const button of buttons) {
      button.disabled = false;
      button.addEventListener('click', () => {
        const scene = scenes[button.dataset.homeStep as keyof typeof scenes];
        if (!scene || !image || !caption || !status) return;
        image.src = scene.src;
        image.alt = scene.alt;
        caption.textContent = scene.caption;
        status.textContent = `Conceptual illustration / ${scene.caption}`;
        for (const candidate of buttons) candidate.setAttribute('aria-pressed', String(candidate === button));
      }, { signal: abort.signal });
    }
    const dialog = root.querySelector<HTMLDialogElement>('#work-dialog');
    let originalOverflow = '';
    let opener: HTMLElement | null = null;
    root.querySelector<HTMLButtonElement>('[data-home-open="work-dialog"]')?.addEventListener('click', event => {
      if (!dialog) return;
      opener = event.currentTarget as HTMLElement;
      originalOverflow = document.body.style.overflow;
      dialog.showModal();
      filmOverlayOpen.set(true);
      document.body.style.overflow = 'hidden';
      // Start from the explicit Watch gesture; native Play remains available if denied.
      void dialog.querySelector('video')?.play().catch(() => {});
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
      disposeEvidence.forEach(dispose => dispose());
      dialog?.querySelector('video')?.pause();
      if (dialog?.open) {
        filmOverlayOpen.set(false);
        document.body.style.overflow = originalOverflow;
      }
    };
  });
</script>

<svelte:head><link rel="stylesheet" href="/styles/agency/home.css?v=20261031-partner-evidence" /><link rel="preload" as="image" href="/images/agency-sales/hero.webp" fetchpriority="high" /></svelte:head>
<div class="agency-home" bind:this={root}>
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
