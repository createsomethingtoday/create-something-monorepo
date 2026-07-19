<script lang="ts">
  export interface CanonCollectionItem {
    title: string;
    detail: string;
    href: string;
    eyebrow?: string;
    meta?: string;
    points?: string[];
  }

  interface Props {
    id?: string;
    title: string;
    description: string;
    items: CanonCollectionItem[];
    emptyMessage?: string;
    columns?: 2 | 3 | 4;
  }

  let {
    id,
    title,
    description,
    items,
    emptyMessage = 'This collection is not available yet. Use the Canon navigation to choose another source.',
    columns = 3
  }: Props = $props();
</script>

<section {id} class="canon-collection" style:--collection-columns={columns}>
  <header>
    <div>
      <span>Direct destinations</span>
      <small>{String(items.length).padStart(2, '0')} sources</small>
    </div>
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  </header>

  {#if items.length > 0}
    <div class="canon-collection__viewport">
      <ol aria-label={title}>
        {#each items as item, index}
          <li>
            <a href={item.href}>
              <div class="canon-collection__meta">
                <span>{String(index + 1).padStart(2, '0')}</span>
                {#if item.eyebrow}<small>{item.eyebrow}</small>{/if}
                {#if item.meta}<em>{item.meta}</em>{/if}
              </div>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              {#if item.points?.length}
                <ul>
                  {#each item.points as point}<li>{point}</li>{/each}
                </ul>
              {/if}
              <b>Open source →</b>
            </a>
          </li>
        {/each}
      </ol>
    </div>
  {:else}
    <div class="canon-collection__empty" data-empty="true">
      <span>00 / Collection unavailable</span>
      <p>{emptyMessage}</p>
      <a href="/canon">Return to the Canon system →</a>
    </div>
  {/if}
</section>

<style>
  .canon-collection {
    width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
    margin: clamp(2.5rem, 6vw, 5.5rem) auto;
    border: 1px solid var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-panel, #fff);
    color: var(--color-performance-ink, #090909);
  }

  .canon-collection > header {
    display: grid;
    grid-template-columns: minmax(12rem, 0.45fr) minmax(0, 1.55fr);
    border-bottom: 1px solid var(--color-performance-line-strong, #9c9c96);
  }

  .canon-collection > header > div {
    display: grid;
    align-content: space-between;
    gap: 1rem;
    min-height: 9.5rem;
    padding: 1rem;
  }

  .canon-collection > header > div:first-child {
    border-right: 1px solid var(--color-performance-line-strong, #9c9c96);
    background: var(--color-performance-ink, #090909);
    color: #fff;
  }

  .canon-collection > header span,
  .canon-collection > header small,
  .canon-collection__meta,
  .canon-collection a > b,
  .canon-collection__empty > span {
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    font-style: normal;
    letter-spacing: 0.025em;
    text-transform: uppercase;
  }

  .canon-collection > header small {
    color: rgba(255, 255, 255, 0.62);
  }

  .canon-collection h2 {
    margin: 0;
    font-size: clamp(2.2rem, 4.5vw, 4.4rem);
    font-weight: var(--font-performance-display-weight, 500);
    letter-spacing: var(--tracking-performance-display, -0.03em);
    line-height: var(--leading-performance-display, 0.94);
    text-wrap: balance;
  }

  .canon-collection > header p {
    max-width: 44rem;
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    line-height: 1.5;
  }

  .canon-collection__viewport {
    min-width: 0;
    overflow: hidden;
  }

  .canon-collection ol {
    display: grid;
    grid-template-columns: repeat(var(--collection-columns), minmax(0, 1fr));
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .canon-collection ol > li {
    min-width: 0;
    border-right: 1px solid var(--color-performance-line, #d7d7d2);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .canon-collection ol > li > a {
    display: grid;
    align-content: start;
    gap: 0.72rem;
    height: 100%;
    min-height: 16rem;
    padding: 1rem;
    color: inherit;
    text-decoration: none;
  }

  .canon-collection ol > li > a:hover {
    background: var(--color-performance-paper, #f3f3f0);
  }

  .canon-collection__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem 0.7rem;
    align-items: center;
    color: var(--color-performance-muted, #5e6268);
  }

  .canon-collection__meta em {
    margin-left: auto;
    font-style: normal;
  }

  .canon-collection a > strong {
    font-size: 1.25rem;
    font-weight: var(--font-performance-medium, 500);
    line-height: 1.15;
    text-wrap: balance;
  }

  .canon-collection a > p,
  .canon-collection a > ul,
  .canon-collection__empty p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .canon-collection a > ul {
    display: grid;
    gap: 0.3rem;
    padding: 0;
    list-style: none;
  }

  .canon-collection a > ul li::before {
    content: '— ';
  }

  .canon-collection a > b {
    align-self: end;
    margin-top: auto;
    font-weight: var(--font-performance-medium, 500);
  }

  .canon-collection__empty {
    display: grid;
    gap: 0.75rem;
    min-height: 13rem;
    place-content: center;
    padding: 2rem;
    text-align: center;
  }

  @media (max-width: 720px) {
    .canon-collection {
      width: 100%;
      border-inline: 0;
    }

    .canon-collection > header {
      grid-template-columns: 1fr;
    }

    .canon-collection > header > div {
      min-height: 0;
    }

    .canon-collection > header > div:first-child {
      grid-template-columns: 1fr auto;
      border-right: 0;
      border-bottom: 1px solid var(--color-performance-line-strong, #9c9c96);
    }

    .canon-collection ol {
      grid-template-columns: none;
      grid-auto-flow: column;
      grid-auto-columns: minmax(17rem, 84vw);
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scrollbar-width: thin;
    }

    .canon-collection ol > li,
    .canon-collection ol > li:nth-child(n) {
      border-right: 1px solid var(--color-performance-line, #d7d7d2);
      border-bottom: 0;
      scroll-snap-align: start;
    }

    .canon-collection ol > li > a {
      min-height: 17rem;
    }
  }
</style>
