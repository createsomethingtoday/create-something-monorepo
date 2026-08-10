<script lang="ts">
  import { onMount } from 'svelte';

  import type { MeridianEvidence } from './types';

  interface Props {
    eyebrow?: string;
    title: string;
    description?: string;
    items: MeridianEvidence[];
    ariaLabel?: string;
  }

  let { eyebrow, title, description, items, ariaLabel = title }: Props = $props();
  let rail = $state<HTMLDivElement>();
  let current = $state(1);
  let atStart = $state(true);
  let atEnd = $state(false);

  function scroll(direction: -1 | 1) {
    if (!rail) return;
    if ((direction === -1 && atStart) || (direction === 1 && atEnd)) return;
    const card = rail.querySelector<HTMLElement>('[data-evidence-card]');
    const scrollDistance = card?.offsetWidth || rail.clientWidth;
    if (!scrollDistance) return;
    rail.scrollBy({
      left: direction * scrollDistance,
      behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
  }

  function handleScroll() {
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>('[data-evidence-card]');
    const cardWidth = card?.offsetWidth || rail.clientWidth;
    if (cardWidth > 0) {
      current = Math.min(items.length, Math.max(1, Math.round(rail.scrollLeft / cardWidth) + 1));
    }
    const leadingSnapInset = Number.parseFloat(getComputedStyle(rail).paddingInlineStart) || 0;
    atStart = rail.scrollLeft <= leadingSnapInset + 1;
    atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 1;
  }

  onMount(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) handleScroll();
    });
    return () => {
      active = false;
    };
  });
</script>

<section class="meridian-evidence" aria-label={ariaLabel}>
  <div class="meridian-evidence__inner">
    <header>
      {#if eyebrow}<p>{eyebrow}</p>{/if}
      <h2>{title}</h2>
      {#if description}<p class="meridian-evidence__description">{description}</p>{/if}
    </header>
    <div class="meridian-evidence__controls" aria-label="Evidence carousel controls">
      <span aria-live="polite">{current} / {items.length}</span>
      <button
        type="button"
        onclick={() => scroll(-1)}
        aria-label="Previous evidence"
        disabled={atStart}>←</button
      >
      <button
        type="button"
        onclick={() => scroll(1)}
        aria-label="Next evidence"
        disabled={atEnd || items.length <= 1}>→</button
      >
    </div>
  </div>
  <div class="meridian-evidence__rail" bind:this={rail} onscroll={handleScroll}>
    {#each items as item}
      <article class="meridian-evidence__card" data-evidence-card>
        <p class="meridian-evidence__eyebrow">{item.eyebrow}</p>
        <blockquote>{item.title}</blockquote>
        <p>{item.detail}</p>
        <footer>
          {#if item.href}<a href={item.href}>{item.source} <span aria-hidden="true">↗</span></a
            >{:else}<span>{item.source}</span>{/if}
        </footer>
      </article>
    {/each}
  </div>
</section>

<style>
  .meridian-evidence {
    overflow: hidden;
    padding: clamp(3.5rem, 9vw, 8rem) 0;
    background: var(--color-performance-editorial-dark, #181312);
    color: var(--color-performance-editorial-light, #f3ebe4);
  }
  .meridian-evidence__inner {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 2rem;
    width: min(var(--content-width-performance-editorial, 90rem), calc(100% - 2rem));
    margin-inline: auto;
    align-items: end;
  }
  header > p:first-child,
  .meridian-evidence__eyebrow,
  .meridian-evidence__controls span,
  footer {
    margin: 0;
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0.075em;
    text-transform: uppercase;
  }
  h2 {
    max-width: 13ch;
    margin: 0.8rem 0 0;
    font-family: var(--font-performance-editorial);
    font-size: clamp(2.7rem, 5.5vw, 5.8rem);
    font-weight: 400;
    letter-spacing: -0.055em;
    line-height: var(--leading-performance-editorial, 1.1);
  }
  .meridian-evidence__description {
    max-width: 42rem;
    margin: 1.2rem 0 0;
    color: color-mix(in srgb, var(--color-performance-editorial-light, #f3ebe4) 73%, transparent);
    font-size: 1.05rem;
    line-height: 1.5;
  }
  .meridian-evidence__controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .meridian-evidence__controls span {
    min-width: 4rem;
    color: color-mix(in srgb, var(--color-performance-editorial-light, #f3ebe4) 65%, transparent);
  }
  button {
    display: grid;
    width: 2.8rem;
    height: 2.8rem;
    place-items: center;
    border: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-light, #f3ebe4) 32%, transparent);
    background: transparent;
    color: inherit;
    font-size: 1.25rem;
    cursor: pointer;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.42;
  }
  button:enabled:hover {
    background: var(--color-performance-editorial-brand, #fcaa2d);
    border-color: var(--color-performance-editorial-brand, #fcaa2d);
    color: var(--color-performance-editorial-dark, #181312);
  }
  button:focus-visible {
    outline: 3px solid var(--color-performance-focus, #a7b8ff);
    outline-offset: 3px;
  }
  .meridian-evidence__rail {
    display: grid;
    grid-auto-columns: minmax(17rem, 38rem);
    grid-auto-flow: column;
    gap: 1px;
    overflow-x: auto;
    overscroll-behavior-inline: contain;
    margin-top: clamp(2rem, 5vw, 4rem);
    padding-inline: max(
      1rem,
      calc((100vw - var(--content-width-performance-editorial, 90rem)) / 2)
    );
    scroll-snap-type: inline mandatory;
    scrollbar-width: thin;
  }
  .meridian-evidence__card {
    display: grid;
    align-content: space-between;
    gap: clamp(1.5rem, 3vw, 3rem);
    min-height: 25rem;
    padding: clamp(1.35rem, 3vw, 2.5rem);
    border: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-light, #f3ebe4) 25%, transparent);
    background: var(--color-performance-editorial-dark-secondary, #2e2927);
    scroll-snap-align: start;
  }
  blockquote {
    max-width: 17ch;
    margin: 0;
    font-family: var(--font-performance-editorial);
    font-size: clamp(1.85rem, 3vw, 3rem);
    letter-spacing: -0.045em;
    line-height: 0.98;
  }
  .meridian-evidence__card > p:not(.meridian-evidence__eyebrow) {
    max-width: 33rem;
    margin: auto 0 0;
    color: color-mix(in srgb, var(--color-performance-editorial-light, #f3ebe4) 74%, transparent);
    line-height: 1.52;
  }
  footer {
    padding-top: 1rem;
    border-top: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-light, #f3ebe4) 22%, transparent);
  }
  footer a,
  footer span {
    color: var(--color-performance-editorial-brand, #fcaa2d);
    text-decoration: none;
  }
  footer a:hover {
    text-decoration: underline;
    text-underline-offset: 0.25rem;
  }
  @media (max-width: 640px) {
    .meridian-evidence__inner {
      grid-template-columns: 1fr;
      gap: 1.5rem;
      width: min(100% - 1.5rem, var(--content-width-performance-editorial, 90rem));
    }
    .meridian-evidence__controls {
      justify-self: start;
    }
    .meridian-evidence__rail {
      grid-auto-columns: calc(100vw - 2rem);
      padding-inline: 0.75rem;
    }
  }
</style>
