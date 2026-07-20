<script lang="ts">
  type SummaryItem = { label: string; value: string };
  type OpeningAction = { href: string; label: string; external?: boolean };

  let {
    backHref,
    backLabel,
    eyebrow,
    title,
    description,
    badges = [],
    summary = [],
    action
  }: {
    backHref: string;
    backLabel: string;
    eyebrow: string;
    title: string;
    description: string;
    badges?: string[];
    summary?: SummaryItem[];
    action?: OpeningAction;
  } = $props();
</script>

<section class="catalog-detail-opening" aria-labelledby="catalog-detail-title">
  <div class="catalog-detail-opening__inner">
    <a class="catalog-detail-back" href={backHref}>Back to {backLabel}</a>

    <header>
      <p class="catalog-detail-eyebrow">{eyebrow}</p>
      <h1 id="catalog-detail-title">{title}</h1>
      <p class="catalog-detail-description">{description}</p>

      {#if badges.length > 0}
        <ul class="catalog-detail-badges" aria-label="Artifact summary">
          {#each badges as badge}
            <li>{badge}</li>
          {/each}
        </ul>
      {/if}

      {#if action}
        <a
          class="catalog-detail-action"
          href={action.href}
          target={action.external ? '_blank' : undefined}
          rel={action.external ? 'noreferrer' : undefined}
        >
          {action.label}
        </a>
      {/if}
    </header>

    {#if summary.length > 0}
      <dl class="catalog-detail-summary">
        {#each summary as item}
          <div>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        {/each}
      </dl>
    {/if}
  </div>
</section>

<style>
  .catalog-detail-opening {
    padding: clamp(2.75rem, 6vw, 5rem) 1.5rem clamp(2.5rem, 5vw, 4rem);
  }

  .catalog-detail-opening__inner {
    display: grid;
    width: min(64rem, 100%);
    margin-inline: auto;
    gap: clamp(1.5rem, 3vw, 2.5rem);
  }

  .catalog-detail-back {
    width: fit-content;
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-sm);
    text-decoration: none;
  }

  .catalog-detail-back:hover {
    color: var(--color-performance-fg-primary);
    text-decoration: underline;
  }

  header {
    display: grid;
    max-width: 52rem;
    gap: var(--space-performance-sm);
  }

  .catalog-detail-eyebrow,
  h1,
  .catalog-detail-description {
    margin: 0;
  }

  .catalog-detail-eyebrow {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    font-weight: var(--font-performance-semibold);
    text-transform: uppercase;
  }

  h1 {
    max-width: 17ch;
    color: var(--color-performance-fg-primary);
    font-size: var(--text-performance-h1);
    font-weight: var(--font-performance-bold);
    line-height: 1;
  }

  .catalog-detail-description {
    max-width: 46rem;
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-body-lg);
    line-height: var(--leading-performance-relaxed);
  }

  .catalog-detail-badges {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-performance-xs);
    margin: var(--space-performance-xs) 0 0;
    padding: 0;
    list-style: none;
  }

  .catalog-detail-badges li {
    padding: 0.3rem 0.55rem;
    border-radius: var(--radius-performance-scale-sm);
    background: var(--color-performance-bg-subtle);
    color: var(--color-performance-fg-secondary);
    font-size: var(--text-performance-caption);
  }

  .catalog-detail-action {
    width: fit-content;
    margin-top: var(--space-performance-xs);
    padding: 0.7rem 0.9rem;
    border: 1px solid var(--color-performance-fg-primary);
    border-radius: var(--radius-performance-scale-sm);
    background: var(--color-performance-fg-primary);
    color: var(--color-performance-bg-pure, #ffffff);
    font-weight: var(--font-performance-semibold);
    text-decoration: none;
  }

  .catalog-detail-action:hover {
    opacity: 0.86;
  }

  .catalog-detail-summary {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin: 0;
    border-block: 1px solid var(--color-performance-border-default);
  }

  .catalog-detail-summary div {
    display: grid;
    gap: 0.35rem;
    padding: 1rem 1rem 1rem 0;
  }

  .catalog-detail-summary dt {
    color: var(--color-performance-fg-tertiary);
    font-family: var(--font-performance-mono);
    font-size: var(--text-performance-caption);
    text-transform: uppercase;
  }

  .catalog-detail-summary dd {
    margin: 0;
    color: var(--color-performance-fg-primary);
    font-size: var(--text-performance-body-sm);
    font-weight: var(--font-performance-semibold);
    overflow-wrap: anywhere;
  }

  @media (max-width: 640px) {
    .catalog-detail-opening {
      padding: 2.5rem 1.25rem;
    }

    .catalog-detail-summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
