<script lang="ts">
  import { pushState } from '$app/navigation';
  import { onMount } from 'svelte';
  import { buildReadingChapters, type ReadingChapter } from '$lib/reading-compass';

  let chapters = $state<ReadingChapter[]>([]);
  let activeId = $state('');
  let links = $state<HTMLAnchorElement[]>([]);
  let selectionLockedUntil = 0;

  function centerActive(id: string) {
    const index = chapters.findIndex((chapter) => chapter.id === id);
    requestAnimationFrame(() => {
      const link = links[index];
      const scroller = link?.parentElement;
      if (!link || !scroller) return;
      const left = link.offsetLeft - (scroller.clientWidth - link.clientWidth) / 2;
      scroller.scrollTo({ left, behavior: 'auto' });
    });
  }

  function scrollToChapter(id: string) {
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
    });
  }

  function selectChapter(id: string) {
    selectionLockedUntil = performance.now() + 700;
    activeId = id;
    const fragment = `#${id}`;
    if (window.location.hash !== fragment) pushState(fragment, {});
    centerActive(id);
    scrollToChapter(id);
  }

  onMount(() => {
    const headings = Array.from(
      document.querySelectorAll<HTMLElement>('article[data-canon-reading] h2')
    );
    chapters = buildReadingChapters(
      headings.map((heading) => ({ label: heading.textContent?.trim() ?? '', id: heading.id }))
    );

    headings.forEach((heading, index) => {
      heading.id = chapters[index].id;
      heading.style.scrollMarginTop = '7rem';
    });

    const fragment = window.location.hash.slice(1);
    activeId = chapters.some((chapter) => chapter.id === fragment)
      ? fragment
      : (chapters[0]?.id ?? '');

    if (fragment && activeId === fragment) {
      selectionLockedUntil = performance.now() + 700;
      scrollToChapter(fragment);
    }

    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (performance.now() < selectionLockedUntil) return;
        const visible = entries.find((entry) => entry.isIntersecting);
        if (!(visible?.target instanceof HTMLElement) || visible.target.id === activeId) return;
        activeId = visible.target.id;
        centerActive(activeId);
      },
      { rootMargin: '-18% 0px -68% 0px' }
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  });
</script>

{#if chapters.length > 1}
  <nav class="reading-compass" data-reading-compass aria-label="Article chapters">
    <span>Read by chapter</span>
    <div>
      {#each chapters as chapter, index}
        <a
          bind:this={links[index]}
          href={`#${chapter.id}`}
          aria-current={chapter.id === activeId ? 'location' : undefined}
          onclick={(event) => {
            event.preventDefault();
            selectChapter(chapter.id);
          }}
        >
          <small>{String(index + 1).padStart(2, '0')}</small>
          {chapter.label}
        </a>
      {/each}
    </div>
  </nav>
{/if}

<style>
  .reading-compass {
    display: grid;
    gap: 0.7rem;
    min-width: 0;
    margin-top: var(--space-performance-lg);
    padding-top: var(--space-performance-md);
    border-top: 1px solid var(--color-performance-border-default);
  }

  .reading-compass > span,
  .reading-compass small {
    color: var(--color-performance-fg-muted);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .reading-compass > div {
    display: flex;
    gap: 0.5rem;
    max-width: 100%;
    padding-bottom: 0.35rem;
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    scrollbar-width: thin;
  }

  .reading-compass a {
    display: inline-flex;
    flex: 0 0 auto;
    gap: 0.45rem;
    align-items: center;
    min-height: 2.5rem;
    padding: 0.52rem 0.68rem;
    border: 1px solid var(--color-performance-border-default);
    border-radius: var(--radius-performance-scale-sm);
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-sm);
    text-decoration: none;
  }

  .reading-compass a[aria-current='location'] {
    border-color: var(--color-performance-fg-primary);
    background: var(--color-performance-bg-subtle);
    color: var(--color-performance-fg-primary);
  }
</style>
