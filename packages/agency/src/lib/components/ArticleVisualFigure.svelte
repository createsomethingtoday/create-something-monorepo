<script lang="ts">
  interface Props {
    src: string;
    alt: string;
    eyebrow: string;
    title: string;
    caption: string;
    sourceLabel?: string;
    sourceHref?: string;
    id?: string;
  }

  let { src, alt, eyebrow, title, caption, sourceLabel, sourceHref, id }: Props = $props();
</script>

<figure {id} class="article-visual product-surface">
  <div class="visual-frame">
    <img {src} {alt} loading="eager" decoding="async" />
  </div>

  <figcaption class="visual-copy">
    <span>{eyebrow}</span>
    <strong>{title}</strong>
    <p>{caption}</p>
    {#if sourceLabel}
      {#if sourceHref}
        <a href={sourceHref}>{sourceLabel}</a>
      {:else}
        <small>{sourceLabel}</small>
      {/if}
    {/if}
  </figcaption>
</figure>

<style>
  .article-visual {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(16rem, 0.85fr);
    gap: clamp(1.2rem, 3vw, 2rem);
    align-items: center;
    padding: clamp(0.85rem, 2vw, 1.1rem);
    scroll-margin-top: 6rem;
  }

  .visual-frame {
    overflow: hidden;
    border: 1px solid var(--color-shell-border-default);
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--color-shell-surface-secondary) 82%, transparent);
  }

  img {
    display: block;
    width: 100%;
    aspect-ratio: 3 / 2;
    object-fit: contain;
    background: color-mix(in srgb, var(--color-shell-surface-primary) 94%, white);
  }

  .visual-copy {
    display: grid;
    gap: 0.65rem;
    padding: clamp(0.4rem, 1vw, 0.8rem);
  }

  .visual-copy span {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .visual-copy strong {
    color: var(--color-fg-primary);
    font-size: clamp(1.2rem, 2vw, 1.65rem);
    line-height: 1.12;
    letter-spacing: 0;
  }

  .visual-copy p {
    margin: 0;
    color: var(--color-fg-secondary);
    font-size: var(--text-body-sm);
    line-height: 1.62;
  }

  .visual-copy a,
  .visual-copy small {
    color: var(--color-fg-muted);
    font-size: var(--text-caption);
    line-height: 1.5;
  }

  .visual-copy a {
    text-decoration: underline;
    text-decoration-color: var(--color-shell-border-strong);
    text-underline-offset: 0.2em;
  }

  .visual-copy a:hover {
    color: var(--color-fg-primary);
  }

  @media (max-width: 820px) {
    .article-visual {
      grid-template-columns: 1fr;
    }
  }
</style>
