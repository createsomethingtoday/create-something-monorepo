<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { onMount, tick } from 'svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const index = $derived(data.phaseLessons.findIndex((item) => item.lesson === data.lesson.lesson));
  const previous = $derived(data.phaseLessons[index - 1]);
  const next = $derived(data.phaseLessons[index + 1]);
  let article: HTMLElement;
  let runtimeReady: Promise<void> | null = null;

  type FigureWindow = Window & {
    AIFS_loadFigureProviders?: (root: HTMLElement) => Promise<unknown>;
    mountLessonFigures?: (root: HTMLElement) => void;
  };

  function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Could not load reference figure runtime: ${src}`));
      document.head.appendChild(script);
    });
  }

  async function renderFigures() {
    await tick();
    if (!article?.querySelector('.lesson-figure[data-figure]')) return;
    try {
      runtimeReady ??= loadScript('/reference-figures/lesson-figures.js')
        .then(() => loadScript('/reference-figures/figure-manifest.js'));
      await runtimeReady;
      const figureWindow = window as FigureWindow;
      await figureWindow.AIFS_loadFigureProviders?.(article);
      if (article.isConnected) figureWindow.mountLessonFigures?.(article);
    } catch {
      for (const host of article.querySelectorAll('.lesson-figure[data-figure]')) {
        host.textContent = 'Interactive figure unavailable. The original lesson remains linked above.';
      }
    }
  }

  onMount(() => { void renderFigures(); });
  afterNavigate(() => { void renderFigures(); });
</script>

<svelte:head>
  <title>{data.lesson.title} | AI Engineering Reference | CREATE SOMETHING Learn</title>
  <meta name="description" content={`Read ${data.lesson.title} in the attributed AI Engineering from Scratch reference library.`} />
</svelte:head>

<div class="reference-lesson">
  <nav class="breadcrumb"><a href="/">Learn</a><span>/</span><a href="/reference">Reference library</a><span>/</span><span>{data.lesson.title}</span></nav>
  <header>
    <p class="eyebrow">Reference lesson / {data.lesson.phase.replace(/^\d+-/, '').replaceAll('-', ' ')}</p>
    <h1>{data.lesson.title}</h1>
    <p class="license">By Rohit Ghumare and contributors · MIT licensed · <a href={data.source}>Original lesson</a>{#if data.code} · <a href={data.code}>Runnable code</a>{/if}</p>
  </header>
  <aside class="field-note">
    <strong>CREATE SOMETHING field practice</strong>
    <p>As you work through this reference lesson, record the command, working directory, output, and artifact. Then ask which part belongs to Database, Automation, or Judgment. For a production system, name the human decision and the evidence required before promotion.</p>
    <a href="/paths/governed-agent-engineering">Apply it in the governed agent course ↗</a>
  </aside>
  <article class="prose" bind:this={article}>{@html data.content}</article>
  <nav class="lesson-nav" aria-label="Reference lesson navigation">
    {#if previous}<a href={`/reference/${previous.phase}/${previous.lesson}`}>← {previous.title}</a>{:else}<span></span>{/if}
    {#if next}<a href={`/reference/${next.phase}/${next.lesson}`}>{next.title} →</a>{/if}
  </nav>
</div>

<style>
  .reference-lesson { width: min(52rem, calc(100% - 2.5rem)); margin: 0 auto; padding: 2rem 0 5rem; color: var(--color-performance-ink); }
  .breadcrumb { display: flex; flex-wrap: wrap; gap: .6rem; color: var(--color-performance-muted); font-size: .8rem; margin-bottom: 2rem; }
  a { color: inherit; }
  .eyebrow, .license { font: .78rem var(--font-performance-mono); color: var(--color-performance-muted); line-height: 1.5; }
  .eyebrow { text-transform: uppercase; letter-spacing: .06em; }
  h1 { font-size: clamp(2.2rem, 4vw, 3.5rem); line-height: 1.08; letter-spacing: -.045em; margin: .5rem 0 1rem; }
  .field-note { border: 1px solid var(--color-performance-line); background: var(--color-performance-panel); padding: 1.25rem; margin: 2.5rem 0; }
  .field-note strong { font-size: .9rem; }
  .field-note p { line-height: 1.6; color: var(--color-performance-muted); }
  .field-note a { font-size: .85rem; }
  .prose { line-height: 1.7; overflow-wrap: anywhere; }
  .prose :global(h2) { font-size: 1.7rem; margin: 2.5rem 0 .75rem; }
  .prose :global(h3) { font-size: 1.25rem; margin: 2rem 0 .5rem; }
  .prose :global(p), .prose :global(li) { margin-bottom: .8rem; }
  .prose :global(pre) { overflow-x: auto; padding: 1rem; background: var(--color-performance-court); border: 1px solid var(--color-performance-line); }
  .prose :global(code) { font-size: .88em; }
  .prose :global(img) { max-width: 100%; }
  .prose :global(table) { display: block; overflow-x: auto; border-collapse: collapse; }
  .prose :global(th), .prose :global(td) { border: 1px solid var(--color-performance-line); padding: .5rem; }
  .lesson-nav { display: flex; justify-content: space-between; gap: 1rem; border-top: 1px solid var(--color-performance-line); padding-top: 1.5rem; margin-top: 3rem; }
  .lesson-nav a { max-width: 45%; }
</style>
