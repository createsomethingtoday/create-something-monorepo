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
    border-block: 1px solid var(--color-clear-border, #e1e1e1);
    background: var(--color-clear-porcelain, #f9f9f9);
    color: var(--color-clear-onyx, #0a0e19);
  }

  .delivery-outcome-strip__inner {
    display: grid;
    gap: clamp(1.25rem, 3vw, 2rem);
    width: min(var(--content-width-clear, 85rem), calc(100% - 2.5rem));
    margin-inline: auto;
  }

  .delivery-outcome-strip__header {
    display: grid;
    gap: 0.7rem;
    max-width: 48rem;
  }

  .delivery-outcome-strip__header span,
  .delivery-outcome-card span {
    color: var(--color-clear-grey, #636363);
    font-family: var(--font-mono);
    font-size: 0.76rem;
    font-weight: var(--font-semibold);
    letter-spacing: 0;
    line-height: 1.15;
    text-transform: uppercase;
  }

  .delivery-outcome-strip__header h2 {
    margin: 0;
    max-width: 14ch;
    color: var(--color-clear-onyx, #0a0e19);
    font-family: var(--font-display);
    font-size: clamp(2.1rem, 5vw, 4rem);
    font-weight: var(--font-medium);
    letter-spacing: 0;
    line-height: 1;
    text-wrap: balance;
  }

  .delivery-outcome-strip__header p {
    margin: 0;
    max-width: 42rem;
    color: var(--color-clear-grey, #636363);
    font-size: clamp(1rem, 1.3vw, 1.15rem);
    line-height: 1.5;
  }

  .delivery-outcome-strip__items {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .delivery-outcome-card {
    display: grid;
    gap: 0.65rem;
    align-content: start;
    min-height: 13rem;
    padding: 1rem;
    border: 1px solid var(--color-clear-border, #e1e1e1);
    border-top-color: var(--delivery-outcome-accent, var(--color-clear-border-strong, #cecece));
    border-radius: var(--radius-clear-sm, 4px);
    border-top-width: 2px;
    background: var(--color-clear-panel, #ffffff);
  }

  .delivery-outcome-card--success {
    --delivery-outcome-accent: var(--color-clear-link-green, #397554);
  }

  .delivery-outcome-card--warning {
    --delivery-outcome-accent: var(--color-clear-rose, #c43a5a);
  }

  .delivery-outcome-card--info {
    --delivery-outcome-accent: var(--color-clear-ocean, #0048ff);
  }

  .delivery-outcome-card strong {
    color: var(--color-clear-onyx, #0a0e19);
    font-size: 1.06rem;
    font-weight: var(--font-medium);
    line-height: 1.16;
  }

  .delivery-outcome-card p {
    margin: 0;
    color: var(--color-clear-grey, #636363);
    font-size: 0.94rem;
    line-height: 1.45;
  }

  @media (max-width: 980px) {
    .delivery-outcome-strip__items {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .delivery-outcome-strip__inner {
      width: min(100% - 1.5rem, var(--content-width-clear, 85rem));
    }

    .delivery-outcome-strip__items {
      grid-template-columns: 1fr;
    }

    .delivery-outcome-card {
      min-height: auto;
    }
  }
</style>
