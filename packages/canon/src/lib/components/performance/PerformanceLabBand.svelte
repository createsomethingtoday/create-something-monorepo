<script lang="ts">
  export type PerformanceLabTone = 'neutral' | 'signal' | 'pressure' | 'growth' | 'risk';

  export interface PerformanceLabMetric {
    label: string;
    value: string;
    detail: string;
    tone?: PerformanceLabTone;
  }

  interface Props {
    eyebrow?: string;
    title: string;
    description?: string;
    metrics: PerformanceLabMetric[];
    ariaLabel?: string;
  }

  let {
    eyebrow = 'Performance Lab',
    title,
    description,
    metrics,
    ariaLabel = 'Performance Lab readiness'
  }: Props = $props();
</script>

<section class="performance-lab-band" aria-label={ariaLabel}>
  <div class="performance-lab-band__inner">
    <header class="performance-lab-band__header">
      <div class="performance-lab-band__identity">
        <span>{eyebrow}</span>
        <small>Readiness protocol</small>
      </div>
      <div class="performance-lab-band__statement">
        <h2>{title}</h2>
        {#if description}
          <p>{description}</p>
        {/if}
      </div>
    </header>

    <div class="performance-lab-band__metrics">
      {#each metrics as metric, index}
        <article data-tone={metric.tone ?? 'neutral'}>
          <span class="performance-lab-band__index">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div>
            <span class="performance-lab-band__label">{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.detail}</p>
          </div>
        </article>
      {/each}
    </div>
  </div>
</section>

<style>
  .performance-lab-band {
    --performance-lab-accent: var(--color-performance-ink, #090909);
    border-block: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
  }

  .performance-lab-band__inner {
    width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
    margin-inline: auto;
    border-inline: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .performance-lab-band__header {
    display: grid;
    grid-template-columns: minmax(13rem, 0.7fr) minmax(0, 1.3fr);
    min-height: 10.5rem;
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .performance-lab-band__identity,
  .performance-lab-band__statement {
    display: grid;
    align-content: space-between;
    gap: 1.5rem;
    padding: 1.25rem;
  }

  .performance-lab-band__identity {
    background: var(--color-performance-ink, #090909);
    color: var(--color-performance-panel, #ffffff);
  }

  .performance-lab-band__identity span,
  .performance-lab-band__identity small,
  .performance-lab-band__label,
  .performance-lab-band__index {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: var(--font-semibold, 600);
    letter-spacing: 0;
    line-height: 1.25;
    text-transform: uppercase;
  }

  .performance-lab-band__identity span {
    color: var(--color-performance-panel, #ffffff);
  }

  .performance-lab-band__identity small {
    color: rgba(255, 255, 255, 0.58);
  }

  .performance-lab-band__statement {
    align-content: center;
    background:
      linear-gradient(90deg, rgba(9, 9, 9, 0.045) 1px, transparent 1px) 0 0 / 2.75rem 2.75rem,
      var(--color-performance-panel, #ffffff);
  }

  .performance-lab-band__statement h2 {
    max-width: 18ch;
    margin: 0;
    font-family: var(--font-display, var(--font-sans));
    font-size: clamp(1.9rem, 4vw, 3.5rem);
    font-weight: var(--font-bold, 700);
    letter-spacing: 0;
    line-height: 0.96;
    text-wrap: balance;
  }

  .performance-lab-band__statement p {
    max-width: 42rem;
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.95rem;
    line-height: 1.45;
  }

  .performance-lab-band__metrics {
    display: grid;
    grid-template-columns: repeat(var(--performance-lab-columns, 3), minmax(0, 1fr));
  }

  .performance-lab-band__metrics article {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.85rem;
    min-height: 9.5rem;
    padding: 1.1rem 1.2rem 1.25rem;
    background: var(--color-performance-panel, #ffffff);
  }

  .performance-lab-band__metrics article + article {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .performance-lab-band__metrics article::before {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    height: 4px;
    background: var(--performance-lab-accent);
  }

  .performance-lab-band__metrics article[data-tone='signal'] {
    --performance-lab-accent: var(--color-performance-signal, #0057b8);
  }

  .performance-lab-band__metrics article[data-tone='pressure'] {
    --performance-lab-accent: var(--color-performance-pressure, #e54800);
  }

  .performance-lab-band__metrics article[data-tone='growth'] {
    --performance-lab-accent: var(--color-performance-growth, #007a4d);
  }

  .performance-lab-band__metrics article[data-tone='risk'] {
    --performance-lab-accent: var(--color-performance-risk, #c62026);
  }

  .performance-lab-band__index {
    color: var(--performance-lab-accent);
  }

  .performance-lab-band__metrics article > div {
    display: grid;
    align-content: start;
    gap: 0.45rem;
  }

  .performance-lab-band__label {
    color: var(--color-performance-muted, #5e6268);
  }

  .performance-lab-band__metrics strong {
    display: block;
    color: var(--color-performance-ink, #090909);
    font-size: clamp(1.25rem, 2vw, 1.75rem);
    font-weight: var(--font-bold, 700);
    line-height: 1;
  }

  .performance-lab-band__metrics p {
    max-width: 28rem;
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.82rem;
    line-height: 1.4;
  }

  @media (max-width: 800px) {
    .performance-lab-band__header {
      grid-template-columns: minmax(10rem, 0.55fr) minmax(0, 1.45fr);
    }

    .performance-lab-band__metrics {
      grid-template-columns: 1fr;
    }

    .performance-lab-band__metrics article {
      min-height: 0;
    }

    .performance-lab-band__metrics article + article {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }
  }

  @media (max-width: 560px) {
    .performance-lab-band__inner {
      width: 100%;
      border-inline: 0;
    }

    .performance-lab-band__header {
      grid-template-columns: 1fr;
      min-height: 0;
    }

    .performance-lab-band__identity {
      grid-template-columns: 1fr auto;
      gap: 1rem;
      padding: 0.85rem 0.75rem;
    }

    .performance-lab-band__statement {
      min-height: 10rem;
      padding: 1.25rem 0.75rem;
    }

    .performance-lab-band__statement h2 {
      max-width: 15ch;
      font-size: 2.25rem;
    }

    .performance-lab-band__metrics article {
      padding-inline: 0.75rem;
    }
  }
</style>
