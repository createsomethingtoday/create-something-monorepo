<script lang="ts">
  import type { MeridianMetric } from './types';

  interface Props {
    eyebrow?: string;
    title: string;
    metrics: MeridianMetric[];
    ariaLabel?: string;
  }

  let { eyebrow, title, metrics, ariaLabel = title }: Props = $props();
</script>

<section class="meridian-metrics" aria-label={ariaLabel}>
  <div class="meridian-metrics__inner">
    <header>
      {#if eyebrow}<p>{eyebrow}</p>{/if}
      <h2>{title}</h2>
    </header>
    <dl>
      {#each metrics as metric}
        <div>
          <dt>{metric.label}</dt>
          <dd>{metric.value}</dd>
          {#if metric.detail}<p>{metric.detail}</p>{/if}
        </div>
      {/each}
    </dl>
  </div>
</section>

<style>
  .meridian-metrics {
    padding: 0;
    border-block: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-dark, #181312) 18%, transparent);
    background: var(--color-performance-editorial-light-secondary, #d8cdbc);
    color: var(--color-performance-editorial-dark, #181312);
  }

  .meridian-metrics__inner {
    display: grid;
    grid-template-columns: minmax(13rem, 0.75fr) minmax(0, 1.25fr);
    width: min(var(--content-width-performance-editorial, 90rem), calc(100% - 2rem));
    margin-inline: auto;
  }

  header {
    display: grid;
    align-content: center;
    gap: 0.75rem;
    min-height: 15rem;
    padding: clamp(2rem, 5vw, 4.5rem) clamp(1.25rem, 4vw, 4rem) clamp(2rem, 5vw, 4.5rem) 0;
  }

  header p,
  dt {
    margin: 0;
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    font-weight: var(--font-performance-semibold);
    letter-spacing: 0.075em;
    text-transform: uppercase;
  }

  h2 {
    max-width: 12ch;
    margin: 0;
    font-family: var(--font-performance-editorial);
    font-size: clamp(2.25rem, 4.8vw, 4.75rem);
    font-weight: 400;
    letter-spacing: -0.045em;
    line-height: var(--leading-performance-editorial, 1.1);
  }

  dl {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin: 0;
    border-inline: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-dark, #181312) 18%, transparent);
  }

  dl > div {
    display: grid;
    grid-template-rows: auto auto minmax(2.9em, auto);
    align-content: end;
    gap: 0.85rem;
    min-height: 15rem;
    padding: clamp(1.25rem, 3vw, 2.5rem);
  }

  dl > div + div {
    border-left: 1px solid
      color-mix(in srgb, var(--color-performance-editorial-dark, #181312) 18%, transparent);
  }
  dd {
    margin: 0;
    font-family: var(--font-performance-editorial);
    font-size: clamp(2.2rem, 4.3vw, 4.4rem);
    letter-spacing: -0.055em;
    line-height: 0.9;
  }
  dl p {
    margin: 0;
    max-width: 23ch;
    font-size: 0.92rem;
    line-height: 1.45;
  }

  @media (max-width: 760px) {
    .meridian-metrics__inner {
      grid-template-columns: 1fr;
      width: 100%;
    }
    header {
      min-height: auto;
      padding-inline: 1rem;
    }
    dl {
      grid-template-columns: 1fr;
      border-inline: 0;
      border-top: 1px solid
        color-mix(in srgb, var(--color-performance-editorial-dark, #181312) 18%, transparent);
    }
    dl > div {
      grid-template-rows: auto auto auto;
      min-height: auto;
      padding: 1.25rem 1rem;
    }
    dl > div + div {
      border-left: 0;
      border-top: 1px solid
        color-mix(in srgb, var(--color-performance-editorial-dark, #181312) 18%, transparent);
    }
  }
</style>
