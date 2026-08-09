<script lang="ts">
  import type { MeridianAccordionItem } from './types';

  interface Props {
    eyebrow?: string;
    title: string;
    description?: string;
    items: MeridianAccordionItem[];
    openFirst?: boolean;
    ariaLabel?: string;
  }

  let {
    eyebrow,
    title,
    description,
    items,
    openFirst = false,
    ariaLabel = title
  }: Props = $props();
</script>

<section class="meridian-accordion" aria-label={ariaLabel}>
  <div class="meridian-accordion__inner">
    <header>
      {#if eyebrow}<p>{eyebrow}</p>{/if}
      <h2>{title}</h2>
      {#if description}<p class="meridian-accordion__description">{description}</p>{/if}
    </header>
    <div class="meridian-accordion__list">
      {#each items as item, index}
        <details open={openFirst && index === 0}>
          <summary><span>{item.question}</span><i aria-hidden="true">+</i></summary>
          <p>{item.answer}</p>
        </details>
      {/each}
    </div>
  </div>
</section>

<style>
  .meridian-accordion {
    padding: clamp(3.5rem, 9vw, 8rem) 1rem;
    background: var(--color-performance-editorial-light-secondary, #d8cdbc);
    color: var(--color-performance-editorial-dark, #181312);
  }
  .meridian-accordion__inner {
    display: grid;
    grid-template-columns: minmax(0, 0.75fr) minmax(20rem, 1.25fr);
    gap: clamp(2rem, 8vw, 8rem);
    width: min(var(--content-width-performance-editorial, 90rem), 100%);
    margin-inline: auto;
  }
  header > p:first-child {
    margin: 0 0 0.9rem;
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  h2 {
    max-width: 11ch;
    margin: 0;
    font-family: var(--font-performance-editorial);
    font-size: clamp(2.7rem, 5.5vw, 5.8rem);
    font-weight: 400;
    letter-spacing: -0.055em;
    line-height: var(--leading-performance-editorial, 1.1);
  }
  .meridian-accordion__description {
    max-width: 35rem;
    margin: 1.4rem 0 0;
    font-size: 1.08rem;
    line-height: 1.5;
  }
  .meridian-accordion__list {
    border-top: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-dark, #181312) 25%, transparent);
  }
  details {
    border-bottom: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-dark, #181312) 25%, transparent);
  }
  summary {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 1rem;
    align-items: start;
    padding: 1.25rem 0;
    cursor: pointer;
    font-size: clamp(1.08rem, 1.6vw, 1.35rem);
    font-weight: var(--font-performance-semibold);
    letter-spacing: -0.025em;
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary i {
    display: grid;
    width: 1.8rem;
    aspect-ratio: 1;
    place-items: center;
    border: 1px solid currentColor;
    border-radius: 50%;
    font-family: var(--font-performance-mono);
    font-size: 1.2rem;
    font-style: normal;
    font-weight: 400;
    line-height: 1;
    transition: transform 0.16s ease;
  }
  details[open] summary i {
    transform: rotate(45deg);
    background: var(--color-performance-editorial-dark, #181312);
    color: var(--color-performance-editorial-light, #f3ebe4);
  }
  details p {
    max-width: 48rem;
    margin: 0;
    padding: 0 3rem 1.4rem 0;
    color: color-mix(in srgb, var(--color-performance-editorial-dark, #181312) 77%, transparent);
    line-height: 1.55;
  }
  summary:focus-visible {
    outline: 3px solid var(--color-performance-focus, #345eea);
    outline-offset: -3px;
  }
  @media (max-width: 760px) {
    .meridian-accordion {
      padding-inline: 0.75rem;
    }
    .meridian-accordion__inner {
      grid-template-columns: 1fr;
      gap: 2rem;
    }
  }
</style>
