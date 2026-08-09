<script lang="ts">
  import type { MeridianCard } from './types';

  interface Props {
    eyebrow?: string;
    title: string;
    description?: string;
    cards: MeridianCard[];
    columns?: 2 | 3 | 4;
    ariaLabel?: string;
  }

  let { eyebrow, title, description, cards, columns = 3, ariaLabel = title }: Props = $props();
</script>

<section class="meridian-card-grid" aria-label={ariaLabel} style={`--meridian-columns: ${columns}`}>
  <div class="meridian-card-grid__inner">
    <header>
      {#if eyebrow}<p>{eyebrow}</p>{/if}
      <h2>{title}</h2>
      {#if description}<p class="meridian-card-grid__description">{description}</p>{/if}
    </header>
    <div class="meridian-card-grid__grid">
      {#each cards as card}
        <article
          class:meridian-card--linked={Boolean(card.href)}
          class="meridian-card meridian-card--{card.kind ?? 'service'} meridian-card--{card.tone ??
            'paper'}"
        >
          <div class="meridian-card__visual" aria-hidden="true"><span></span><i>↗</i></div>
          <div class="meridian-card__content">
            <div class="meridian-card__meta">
              {#if card.eyebrow}<span>{card.eyebrow}</span>{/if}
              {#if card.meta}<small>{card.meta}</small>{/if}
            </div>
            <h3>{card.title}</h3>
            {#if card.description}<p>{card.description}</p>{/if}
            {#if card.href}
              <a href={card.href} aria-label={`${card.ctaLabel ?? 'Open'}: ${card.title}`}>
                {card.ctaLabel ?? 'Open'} <span aria-hidden="true">↗</span>
              </a>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>

<style>
  .meridian-card-grid {
    padding: clamp(3.5rem, 9vw, 8rem) 1rem;
    background: var(--color-performance-editorial-light, #f3ebe4);
    color: var(--color-performance-editorial-dark, #181312);
  }
  .meridian-card-grid__inner {
    width: min(var(--content-width-performance-editorial, 90rem), 100%);
    margin-inline: auto;
  }
  header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(16rem, 0.58fr);
    gap: 1rem 4rem;
    align-items: end;
    margin-bottom: clamp(2rem, 5vw, 4.5rem);
  }
  header > p:first-child {
    grid-column: 1 / -1;
    margin: 0 0 0.25rem;
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  h2 {
    max-width: 12ch;
    margin: 0;
    font-family: var(--font-performance-editorial);
    font-size: clamp(2.7rem, 5.4vw, 5.6rem);
    font-weight: 400;
    letter-spacing: -0.055em;
    line-height: 0.92;
  }
  .meridian-card-grid__description {
    max-width: 36rem;
    margin: 0;
    font-size: clamp(1rem, 1.35vw, 1.18rem);
    line-height: 1.5;
  }
  .meridian-card-grid__grid {
    display: grid;
    grid-template-columns: repeat(var(--meridian-columns), minmax(0, 1fr));
    border-top: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-dark, #181312) 20%, transparent);
    border-left: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-dark, #181312) 20%, transparent);
  }
  .meridian-card {
    display: grid;
    grid-template-rows: auto 1fr;
    min-height: 100%;
    border-right: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-dark, #181312) 20%, transparent);
    border-bottom: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-dark, #181312) 20%, transparent);
    background: var(--color-performance-editorial-light, #f3ebe4);
  }
  .meridian-card__visual {
    position: relative;
    min-height: clamp(9rem, 17vw, 15rem);
    overflow: hidden;
    background: var(--color-performance-editorial-dark, #181312);
  }
  .meridian-card__visual::before,
  .meridian-card__visual::after {
    position: absolute;
    border: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-light, #f3ebe4) 37%, transparent);
    content: '';
  }
  .meridian-card__visual::before {
    inset: 1rem;
    border-right: 0;
  }
  .meridian-card__visual::after {
    width: 55%;
    aspect-ratio: 1;
    right: -12%;
    bottom: -28%;
    border-radius: 50%;
  }
  .meridian-card__visual span {
    position: absolute;
    top: 22%;
    left: 25%;
    width: 1.15rem;
    aspect-ratio: 1;
    border-radius: 50%;
    background: var(--color-performance-editorial-brand, #fcaa2d);
    box-shadow:
      0 0 0 0.3rem var(--color-performance-editorial-dark, #181312),
      0 0 0 0.38rem var(--color-performance-editorial-brand, #fcaa2d);
  }
  .meridian-card__visual i {
    position: absolute;
    right: 0.85rem;
    bottom: 0.65rem;
    color: var(--color-performance-editorial-light, #f3ebe4);
    font-family: var(--font-performance-editorial);
    font-size: 2.2rem;
    font-style: normal;
  }
  .meridian-card--case .meridian-card__visual {
    min-height: clamp(14rem, 24vw, 20rem);
    background: var(--color-performance-editorial-brand, #fcaa2d);
  }
  .meridian-card--case .meridian-card__visual::before,
  .meridian-card--case .meridian-card__visual::after {
    border-color: color-mix(
      in srgb,
      var(--color-performance-editorial-dark, #181312) 55%,
      transparent
    );
  }
  .meridian-card--case .meridian-card__visual span,
  .meridian-card--case .meridian-card__visual i {
    color: var(--color-performance-editorial-dark, #181312);
  }
  .meridian-card--case .meridian-card__visual span {
    background: var(--color-performance-editorial-light, #f3ebe4);
    box-shadow:
      0 0 0 0.3rem var(--color-performance-editorial-brand, #fcaa2d),
      0 0 0 0.38rem var(--color-performance-editorial-dark, #181312);
  }
  .meridian-card--article .meridian-card__visual {
    background: var(--color-performance-editorial-light-secondary, #d8cdbc);
  }
  .meridian-card--article .meridian-card__visual::before,
  .meridian-card--article .meridian-card__visual::after {
    border-color: color-mix(
      in srgb,
      var(--color-performance-editorial-dark, #181312) 40%,
      transparent
    );
  }
  .meridian-card--article .meridian-card__visual i {
    color: var(--color-performance-editorial-dark, #181312);
  }
  .meridian-card--profile .meridian-card__visual {
    min-height: clamp(14rem, 23vw, 19rem);
    background: linear-gradient(
      135deg,
      var(--color-performance-editorial-dark, #181312) 0 50%,
      var(--color-performance-editorial-dark-secondary, #2e2927) 50%
    );
  }
  .meridian-card--offer .meridian-card__visual {
    min-height: 0;
    padding-top: 1rem;
    background: var(--color-performance-editorial-light-secondary, #d8cdbc);
  }
  .meridian-card--offer .meridian-card__visual::before {
    inset: 1rem;
    bottom: 0;
    border-color: color-mix(
      in srgb,
      var(--color-performance-editorial-dark, #181312) 32%,
      transparent
    );
  }
  .meridian-card--offer .meridian-card__visual::after {
    display: none;
  }
  .meridian-card--offer .meridian-card__visual span {
    top: 1rem;
    left: 1rem;
    background: var(--color-performance-editorial-dark, #181312);
    box-shadow: none;
  }
  .meridian-card--offer .meridian-card__visual i {
    color: var(--color-performance-editorial-dark, #181312);
  }
  .meridian-card__content {
    display: grid;
    align-content: start;
    gap: 1rem;
    padding: clamp(1.2rem, 2.5vw, 2rem);
  }
  .meridian-card__meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.6rem;
    color: color-mix(in srgb, var(--color-performance-editorial-dark, #181312) 72%, transparent);
    font-family: var(--font-performance-mono);
    font-size: 0.67rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .meridian-card__meta small {
    font-size: inherit;
  }
  h3 {
    margin: 0;
    font-size: clamp(1.25rem, 2vw, 1.75rem);
    letter-spacing: -0.035em;
    line-height: 1.03;
  }
  .meridian-card__content > p {
    margin: 0;
    color: color-mix(in srgb, var(--color-performance-editorial-dark, #181312) 76%, transparent);
    font-size: 0.98rem;
    line-height: 1.5;
  }
  .meridian-card__content > a {
    display: inline-flex;
    width: fit-content;
    align-items: center;
    gap: 0.55rem;
    margin-top: 0.4rem;
    color: inherit;
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0.05em;
    text-decoration: none;
    text-transform: uppercase;
  }
  .meridian-card__content > a:hover {
    text-decoration: underline;
    text-underline-offset: 0.25rem;
  }
  .meridian-card__content > a:focus-visible {
    outline: 3px solid var(--color-performance-focus, #345eea);
    outline-offset: 3px;
  }
  @media (max-width: 900px) {
    .meridian-card-grid__grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    header {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 580px) {
    .meridian-card-grid {
      padding-inline: 0.75rem;
    }
    .meridian-card-grid__grid {
      grid-template-columns: 1fr;
    }
    .meridian-card__visual {
      min-height: 11rem;
    }
  }
</style>
