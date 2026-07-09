<script module lang="ts">
  export interface DeliveryOutcomeItem {
    label: string;
    title: string;
    detail: string;
    tone?: 'neutral' | 'success' | 'warning' | 'info';
  }
</script>

<script lang="ts">
  interface Props {
    eyebrow?: string;
    title?: string;
    description?: string;
    items: DeliveryOutcomeItem[];
    ariaLabel?: string;
  }

  let {
    eyebrow,
    title,
    description,
    items,
    ariaLabel = 'Delivery outcome summary'
  }: Props = $props();
</script>

<section class="delivery-outcome-strip" aria-label={ariaLabel}>
  <div class="delivery-outcome-strip__inner">
    {#if eyebrow || title || description}
      <header class="delivery-outcome-strip__header">
        {#if eyebrow}
          <span>{eyebrow}</span>
        {/if}
        {#if title}
          <h2>{title}</h2>
        {/if}
        {#if description}
          <p>{description}</p>
        {/if}
      </header>
    {/if}

    <div class="delivery-outcome-strip__items">
      {#each items as item}
        <article class={`delivery-outcome-card delivery-outcome-card--${item.tone ?? 'neutral'}`}>
          <span>{item.label}</span>
          <strong>{item.title}</strong>
          <p>{item.detail}</p>
        </article>
      {/each}
    </div>
  </div>
</section>

<style>
  .delivery-outcome-strip {
    padding-block: clamp(2.25rem, 5vw, 4rem);
    border-block: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
  }

  .delivery-outcome-strip__inner {
    display: grid;
    gap: clamp(1.25rem, 3vw, 2rem);
    width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
    margin-inline: auto;
  }

  .delivery-outcome-strip__header {
    display: grid;
    gap: 1rem;
    max-width: 48rem;
  }

  .delivery-outcome-strip__header span {
    display: inline-flex;
    width: fit-content;
    max-width: 100%;
    min-height: 1.9rem;
    align-items: center;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-radius: var(--radius-performance-sm, 4px);
    background: var(--color-performance-panel, #ffffff);
    padding: 0.36rem 0.62rem;
  }

  .delivery-outcome-strip__header span,
  .delivery-outcome-card span {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-mono);
    font-size: 0.76rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    line-height: 1.15;
    text-transform: uppercase;
  }

  .delivery-outcome-strip__header h2 {
    margin: 0;
    max-width: 15ch;
    color: var(--color-performance-ink, #090909);
    font-size: 3.1rem;
    font-weight: var(--font-medium);
    letter-spacing: 0;
    line-height: 1.02;
    text-wrap: balance;
  }

  .delivery-outcome-strip__header p {
    margin: 0;
    max-width: 42rem;
    color: var(--color-performance-muted, #5e6268);
    font-size: 1.08rem;
    line-height: 1.55;
    text-wrap: pretty;
  }

  .delivery-outcome-strip__items {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .delivery-outcome-card {
    display: grid;
    gap: 0.62rem;
    align-content: start;
    min-height: 12rem;
    padding: 1rem;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    border-top-color: var(--delivery-outcome-accent, var(--color-performance-line-strong, #9c9c96));
    border-radius: var(--radius-performance-sm, 4px);
    border-top-width: 2px;
    background: var(--color-performance-panel, #ffffff);
  }

  .delivery-outcome-card--success {
    --delivery-outcome-accent: var(--color-performance-growth, #007a4d);
  }

  .delivery-outcome-card--warning {
    --delivery-outcome-accent: var(--color-performance-risk, #c62026);
  }

  .delivery-outcome-card--info {
    --delivery-outcome-accent: var(--color-performance-signal, #0057b8);
  }

  .delivery-outcome-card strong {
    color: var(--color-performance-ink, #090909);
    font-size: 1.18rem;
    font-weight: var(--font-medium);
    line-height: 1.18;
    text-wrap: balance;
  }

  .delivery-outcome-card p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.94rem;
    line-height: 1.48;
    text-wrap: pretty;
  }

  @media (max-width: 980px) {
    .delivery-outcome-strip__items {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .delivery-outcome-strip__inner {
      width: min(100% - 1.5rem, var(--content-width-performance, 85rem));
    }

    .delivery-outcome-strip__items {
      grid-template-columns: 1fr;
    }

    .delivery-outcome-card {
      min-height: auto;
    }

    .delivery-outcome-strip__header h2 {
      font-size: 2.35rem;
      line-height: 1.04;
    }

    .delivery-outcome-strip__header p {
      font-size: 1rem;
      line-height: 1.56;
    }
  }
</style>
