<script lang="ts">
  import Button from './Button.svelte';

  type ArchiveAction = {
    href: string;
    label: string;
    variant?: 'primary' | 'secondary';
  };

  type ArchiveMetric = {
    value: string;
    label: string;
  };

  interface Props {
    kicker: string;
    title: string;
    description: string;
    resultLabel?: string;
    actions?: ArchiveAction[];
    metrics?: ArchiveMetric[];
    align?: 'left' | 'center';
  }

  let {
    kicker,
    title,
    description,
    resultLabel,
    actions = [],
    metrics = [],
    align = 'left'
  }: Props = $props();
</script>

<section class="property-archive-hero" class:propertyArchiveHeroCenter={align === 'center'}>
  <div class="shell-inner-pad property-archive-hero__inner">
    <div class="property-archive-hero__copy">
      <span class="product-kicker">{kicker}</span>
      <h1>{title}</h1>
      <p>{description}</p>

      {#if resultLabel}
        <span class="property-archive-hero__result">{resultLabel}</span>
      {/if}

      {#if actions.length > 0}
        <div
          class="property-hero-actions {align === 'center' ? 'property-hero-actions--center' : ''}"
        >
          {#each actions as action}
            <Button href={action.href} variant={action.variant ?? 'primary'}>{action.label}</Button>
          {/each}
        </div>
      {/if}
    </div>

    {#if metrics.length > 0}
      <div class="property-archive-hero__metrics" aria-label="Archive metrics">
        {#each metrics as metric}
          <div class="product-surface product-surface--soft property-archive-hero__metric">
            <span>{metric.value}</span>
            <p>{metric.label}</p>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</section>

<style>
  .property-archive-hero {
    padding-top: clamp(3.5rem, 7vw, 5.5rem);
    padding-bottom: clamp(1.75rem, 4vw, 3rem);
  }

  .property-archive-hero__inner {
    display: grid;
    grid-template-columns: minmax(0, 0.98fr) minmax(18rem, 0.62fr);
    gap: clamp(1.5rem, 5vw, 4rem);
    align-items: end;
  }

  .propertyArchiveHeroCenter .property-archive-hero__inner {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
    text-align: center;
  }

  .property-archive-hero__copy {
    display: grid;
    gap: 1rem;
    max-width: 56rem;
  }

  .propertyArchiveHeroCenter .property-archive-hero__copy {
    justify-items: center;
  }

  .property-archive-hero h1 {
    margin: 0;
    color: var(--color-fg-primary);
    font-size: 5.35rem;
    line-height: 0.96;
    letter-spacing: 0;
    text-wrap: balance;
  }

  .property-archive-hero p {
    margin: 0;
    max-width: 42rem;
    color: var(--color-fg-secondary);
    font-size: 1.12rem;
    line-height: 1.72;
    text-wrap: pretty;
  }

  .property-archive-hero__result {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .property-archive-hero__metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.85rem;
  }

  .property-archive-hero__metric {
    display: grid;
    gap: 0.35rem;
    align-content: end;
    min-height: 8rem;
    --product-surface-padding: 1rem;
  }

  .property-archive-hero__metric span {
    color: var(--color-fg-primary);
    font-family: var(--font-mono);
    font-size: 2.15rem;
    letter-spacing: 0;
    line-height: 1;
  }

  .property-archive-hero__metric p {
    color: var(--color-fg-muted);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.09em;
    line-height: 1.45;
    text-transform: uppercase;
  }

  @media (max-width: 980px) {
    .property-archive-hero__inner,
    .property-archive-hero__metrics {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 720px) {
    .property-archive-hero h1 {
      font-size: 3rem;
      line-height: 1;
    }

    .property-archive-hero p {
      font-size: 1.02rem;
    }

    .property-archive-hero__metric span {
      font-size: 1.55rem;
    }
  }
</style>
