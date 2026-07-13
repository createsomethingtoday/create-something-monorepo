<script lang="ts">
  interface Props {
    src: string;
    alt: string;
    eyebrow: string;
    title: string;
    caption: string;
    sourceLabel?: string;
    sourceHref?: string;
  }

  let { src, alt, eyebrow, title, caption, sourceLabel, sourceHref }: Props = $props();
</script>

<figure class="article-visual product-surface">
  <div class="visual-frame">
    <img {src} {alt} loading="lazy" decoding="async" />
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
  }

  .visual-frame {
    overflow: hidden;
    border: 1px solid var(--color-performance-shell-border-default);
    border-radius: var(--radius-performance-scale-lg);
    background: color-mix(in srgb, var(--color-performance-shell-surface-secondary) 82%, transparent);
  }

  img {
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: contain;
    background: #060607;
  }

  .visual-copy {
    display: grid;
    gap: 0.65rem;
    padding: clamp(0.4rem, 1vw, 0.8rem);
  }

  .visual-copy span {
    color: var(--color-performance-fg-muted);
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .visual-copy strong {
    color: var(--color-performance-fg-primary);
    font-size: clamp(1.2rem, 2vw, 1.65rem);
    line-height: 1.12;
    letter-spacing: 0;
  }

  .visual-copy p {
    margin: 0;
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-sm);
    line-height: 1.62;
  }

  .visual-copy a,
  .visual-copy small {
    color: var(--color-performance-fg-muted);
    font-size: var(--text-performance-caption);
    line-height: 1.5;
  }

  .visual-copy a {
    text-decoration: underline;
    text-decoration-color: var(--color-performance-shell-border-strong);
    text-underline-offset: 0.2em;
  }

  .visual-copy a:hover {
    color: var(--color-performance-fg-primary);
  }

  @media (max-width: 820px) {
    .article-visual {
      grid-template-columns: 1fr;
    }
  }
</style>
