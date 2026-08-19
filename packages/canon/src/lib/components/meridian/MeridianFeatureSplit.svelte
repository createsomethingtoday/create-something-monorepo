<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    eyebrow: string;
    title: string;
    description: string;
    primaryLabel?: string;
    primaryHref?: string;
    secondaryLabel?: string;
    secondaryHref?: string;
    tags?: string[];
    ariaLabel?: string;
    visualLabel?: string;
    visual?: Snippet;
  }

  let {
    eyebrow,
    title,
    description,
    primaryLabel,
    primaryHref,
    secondaryLabel,
    secondaryHref,
    tags = [],
    ariaLabel = title,
    visualLabel = 'Operating artifact',
    visual
  }: Props = $props();
</script>

<section class="meridian-split" aria-label={ariaLabel}>
  <div class="meridian-split__inner">
    <div
      class:meridian-split__visual--custom={visual}
      class="meridian-split__visual"
      aria-label={visualLabel}
    >
      {#if visual}
        {@render visual()}
      {:else}
        <div class="meridian-split__court" aria-hidden="true">
          <span class="meridian-split__arc"></span>
          <span class="meridian-split__lane"></span>
          <span class="meridian-split__line meridian-split__line--one"></span>
          <span class="meridian-split__line meridian-split__line--two"></span>
          <span class="meridian-split__ball"></span>
        </div>
        <span>{visualLabel}</span>
      {/if}
    </div>
    <div class="meridian-split__content">
      <p class="meridian-split__eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p class="meridian-split__description">{description}</p>
      {#if tags.length > 0}
        <ul aria-label="Key attributes">
          {#each tags as tag}<li>{tag}</li>{/each}
        </ul>
      {/if}
      {#if primaryHref || secondaryHref}
        <div class="meridian-split__actions">
          {#if primaryHref && primaryLabel}<a class="meridian-button" href={primaryHref}
              >{primaryLabel}<span aria-hidden="true">↗</span></a
            >{/if}
          {#if secondaryHref && secondaryLabel}<a
              class="meridian-button meridian-button--quiet"
              href={secondaryHref}>{secondaryLabel}</a
            >{/if}
        </div>
      {/if}
    </div>
  </div>
</section>

<style>
  .meridian-split {
    padding: clamp(3.5rem, 9vw, 8rem) 1rem;
    background: var(--color-performance-panel, #fff);
    color: var(--color-performance-editorial-dark, #181312);
  }
  .meridian-split__inner {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(20rem, 0.75fr);
    gap: clamp(2rem, 8vw, 8rem);
    width: min(var(--content-width-performance-editorial, 90rem), 100%);
    margin-inline: auto;
    align-items: center;
  }
  .meridian-split__visual {
    position: relative;
    display: grid;
    min-height: clamp(24rem, 43vw, 39rem);
    overflow: hidden;
    align-content: end;
    padding: 1rem;
    background: var(--color-performance-editorial-dark, #181312);
    color: var(--color-performance-editorial-light, #f3ebe4);
  }
  .meridian-split__visual::before {
    position: absolute;
    inset: 1.1rem;
    border: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-light, #f3ebe4) 25%, transparent);
    content: '';
  }
  .meridian-split__visual--custom {
    align-content: stretch;
    padding: 0;
  }
  .meridian-split__visual--custom::before {
    content: none;
  }
  .meridian-split__visual > span {
    position: relative;
    z-index: 1;
    font-family: var(--font-performance-mono);
    font-size: 0.67rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .meridian-split__court {
    position: absolute;
    inset: 1.1rem;
    overflow: hidden;
  }
  .meridian-split__arc {
    position: absolute;
    top: 13%;
    right: -24%;
    width: 75%;
    aspect-ratio: 1;
    border: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-light, #f3ebe4) 35%, transparent);
    border-radius: 50%;
  }
  .meridian-split__lane {
    position: absolute;
    right: 11%;
    bottom: 0;
    width: 43%;
    height: 54%;
    border: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-light, #f3ebe4) 35%, transparent);
    border-bottom: 0;
  }
  .meridian-split__line {
    position: absolute;
    width: 53%;
    height: 1px;
    background: color-mix(
      in srgb,
      var(--color-performance-editorial-light, #f3ebe4) 35%,
      transparent
    );
    transform-origin: right;
  }
  .meridian-split__line--one {
    top: 37%;
    right: 7%;
    transform: rotate(35deg);
  }
  .meridian-split__line--two {
    top: 59%;
    right: 7%;
    transform: rotate(-24deg);
  }
  .meridian-split__ball {
    position: absolute;
    top: 45%;
    left: 30%;
    width: 1.25rem;
    aspect-ratio: 1;
    border-radius: 50%;
    background: var(--color-performance-editorial-brand, #fcaa2d);
    box-shadow:
      0 0 0 0.35rem var(--color-performance-editorial-dark, #181312),
      0 0 0 0.42rem var(--color-performance-editorial-brand, #fcaa2d);
  }
  .meridian-split__content {
    display: grid;
    align-content: center;
    gap: 1.35rem;
  }
  .meridian-split__eyebrow {
    margin: 0;
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
    font-size: clamp(2.7rem, 5.6vw, 5.9rem);
    font-weight: 400;
    letter-spacing: -0.055em;
    line-height: var(--leading-performance-editorial, 1.1);
  }
  .meridian-split__description {
    max-width: 43rem;
    margin: 0;
    font-size: clamp(1.05rem, 1.5vw, 1.28rem);
    line-height: 1.52;
  }
  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0;
    margin: 0.25rem 0 0;
    list-style: none;
  }
  li {
    padding: 0.45rem 0.6rem;
    border: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-dark, #181312) 22%, transparent);
    font-family: var(--font-performance-mono);
    font-size: 0.68rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .meridian-split__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    padding-top: 0.4rem;
  }
  .meridian-button {
    display: inline-flex;
    min-height: 2.9rem;
    align-items: center;
    gap: 0.85rem;
    padding: 0.75rem 1rem;
    background: var(--color-performance-editorial-brand, #fcaa2d);
    border: 1px solid var(--color-performance-editorial-brand, #fcaa2d);
    color: var(--color-performance-editorial-dark, #181312);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0.055em;
    text-decoration: none;
    text-transform: uppercase;
  }
  .meridian-button--quiet {
    background: transparent;
    border-color: color-mix(
      in srgb,
      var(--color-performance-editorial-dark, #181312) 30%,
      transparent
    );
  }
  .meridian-button:focus-visible {
    outline: 3px solid var(--color-performance-focus, #345eea);
    outline-offset: 3px;
  }
  @media (max-width: 760px) {
    .meridian-split {
      padding-inline: 0.75rem;
    }
    .meridian-split__inner {
      grid-template-columns: 1fr;
      gap: 2rem;
    }
    .meridian-split__visual {
      min-height: 21rem;
    }
  }
</style>
