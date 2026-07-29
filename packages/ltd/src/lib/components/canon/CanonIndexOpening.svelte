<script lang="ts">
  import { onMount } from 'svelte';

  export type CanonIndexRoute = 'canon' | 'masters' | 'patterns' | 'presentations' | 'principles';

  interface Recommendation {
    label: string;
    detail: string;
    href: string;
  }

  interface Props {
    current: CanonIndexRoute;
    title: string;
    description: string;
    recommendation: Recommendation;
    eyebrow?: string;
  }

  let { current, title, description, recommendation, eyebrow = 'The Canon' }: Props = $props();
	let currentItem = $state<HTMLElement>();

  const collections: Array<{ id: CanonIndexRoute; label: string; href: string }> = [
    { id: 'canon', label: 'System', href: '/canon' },
    { id: 'masters', label: 'Masters', href: '/masters' },
    { id: 'patterns', label: 'Patterns', href: '/patterns' },
    { id: 'principles', label: 'Principles', href: '/principles' },
    { id: 'presentations', label: 'Presentations', href: '/presentations' }
  ];

  onMount(() => {
    currentItem?.scrollIntoView({ block: 'nearest', inline: 'center' });
  });
</script>

<header class="canon-index-opening">
  <div class="canon-index-opening__inner">
    <div class="canon-index-opening__identity">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>

    <aside class="canon-index-opening__recommendation" aria-label="Recommended starting point">
      <span>Recommended start</span>
      <strong>{recommendation.label}</strong>
      <p>{recommendation.detail}</p>
      <a href={recommendation.href}>Open the recommended source →</a>
    </aside>

    <nav aria-label="Canon collections">
      {#each collections as collection, index}
        {#if collection.id === current}
          <span bind:this={currentItem} aria-current="page">
            <small>{String(index + 1).padStart(2, '0')}</small>{collection.label}
          </span>
        {:else}
          <a href={collection.href}>
            <small>{String(index + 1).padStart(2, '0')}</small>{collection.label}
          </a>
        {/if}
      {/each}
    </nav>
  </div>
</header>

<style>
  .canon-index-opening {
    padding-block: clamp(2.75rem, 7vw, 6rem) 2.25rem;
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
  }

  .canon-index-opening__inner {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(17rem, 0.55fr);
    gap: 2rem;
    width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
    margin-inline: auto;
  }

  .canon-index-opening__identity,
  .canon-index-opening__recommendation {
    display: grid;
    align-content: start;
    gap: 0.8rem;
    min-width: 0;
  }

  .canon-index-opening__identity > * {
    min-width: 0;
  }

  .canon-index-opening__identity > span,
  .canon-index-opening__recommendation > span,
  .canon-index-opening nav small {
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .canon-index-opening__identity > span,
  .canon-index-opening__recommendation > span {
    color: var(--color-performance-muted, #5e6268);
  }

  .canon-index-opening h1 {
    max-width: 13ch;
    margin: 0;
    font-size: clamp(3.35rem, 8vw, 7.4rem);
    font-weight: var(--font-performance-display-weight, 500);
    letter-spacing: var(--tracking-performance-display, -0.03em);
    line-height: var(--leading-performance-display, 0.94);
    text-wrap: balance;
  }

  .canon-index-opening__identity > p {
    max-width: 42rem;
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: clamp(1.05rem, 2vw, 1.25rem);
    line-height: 1.5;
    text-wrap: pretty;
  }

  .canon-index-opening__recommendation {
    padding: 1rem;
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-panel, #fff);
  }

  .canon-index-opening__recommendation strong {
    font-size: 1.3rem;
    font-weight: var(--font-performance-medium, 500);
    line-height: 1.15;
  }

  .canon-index-opening__recommendation p,
  .canon-index-opening__recommendation a {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .canon-index-opening__recommendation a {
    width: fit-content;
    color: var(--color-performance-ink, #090909);
    font-weight: var(--font-performance-medium, 500);
  }

  .canon-index-opening nav {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    min-width: 0;
    border: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .canon-index-opening nav a,
  .canon-index-opening nav > span {
    display: grid;
    gap: 0.45rem;
    min-width: 0;
    padding: 0.85rem;
    color: var(--color-performance-ink, #090909);
    font-size: 0.92rem;
    font-weight: var(--font-performance-medium, 500);
    text-decoration: none;
  }

  .canon-index-opening nav a + a,
  .canon-index-opening nav a + span,
  .canon-index-opening nav span + a {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .canon-index-opening nav > span {
    background: var(--color-performance-ink, #090909);
    color: #fff;
  }

  .canon-index-opening nav small {
    color: inherit;
    opacity: 0.62;
  }

  .canon-index-opening nav a:hover {
    background: var(--color-performance-panel, #fff);
  }

  @media (max-width: 760px) {
    .canon-index-opening__inner {
      grid-template-columns: 1fr;
      width: min(100% - 1.5rem, var(--content-width-performance, 85rem));
    }

    .canon-index-opening h1 {
      max-width: 100%;
      font-size: clamp(2.8rem, 14vw, 4.7rem);
    }

    .canon-index-opening nav {
      grid-column: 1;
      grid-template-columns: none;
      grid-auto-flow: column;
      grid-auto-columns: minmax(8.5rem, 42vw);
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scrollbar-width: thin;
    }

    .canon-index-opening nav a,
    .canon-index-opening nav > span {
      scroll-snap-align: start;
    }
  }
</style>
