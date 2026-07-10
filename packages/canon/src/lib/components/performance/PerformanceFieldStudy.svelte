<script lang="ts">
  import { PERFORMANCE_LAB_SEQUENCE } from '../../motion/intent.js';

  export type PerformanceFieldStudyMode = 'campaign' | 'lab' | 'archive';
  export type PerformanceFieldStudySide = 'left' | 'right';
  export type PerformanceFieldStudyStage =
    | 'policy-applied'
    | 'metrics-moved'
    | 'pressure-visible'
    | 'validation-adjusted'
    | 'receipt-settled';

  export interface PerformanceFieldStudyMetric {
    label: string;
    value: string;
    detail?: string;
  }

  export interface PerformanceFieldStudyProof {
    id: string;
    owner: string;
    state: string;
    verified: string;
    version?: string;
    classification?: string;
  }

  export interface PerformanceFieldStudyProps {
    image: string;
    mobileImage?: string;
    alt: string;
    title: string;
    description: string;
    principle: string;
    metrics: PerformanceFieldStudyMetric[];
    proof: PerformanceFieldStudyProof;
    eyebrow?: string;
    figure?: string;
    mode?: PerformanceFieldStudyMode;
    mediaSide?: PerformanceFieldStudySide;
    stage?: PerformanceFieldStudyStage;
    objectPosition?: string;
    priority?: boolean;
    ariaLabel?: string;
  }

  let {
    image,
    mobileImage,
    alt,
    title,
    description,
    principle,
    metrics,
    proof,
    eyebrow = 'Performance field study',
    figure = '01',
    mode = 'campaign',
    mediaSide = 'left',
    stage = 'pressure-visible',
    objectPosition = 'center',
    priority = false,
    ariaLabel = title
  }: PerformanceFieldStudyProps = $props();

  const activeStage = $derived(
    PERFORMANCE_LAB_SEQUENCE.stages.find((candidate) => candidate.id === stage) ??
      PERFORMANCE_LAB_SEQUENCE.stages.at(-1)!
  );
</script>

<section
  class="performance-field-study"
  class:performance-field-study--media-right={mediaSide === 'right'}
  data-mode={mode}
  data-motion-stage={activeStage.id}
  data-motion-intent={activeStage.intent}
  data-motion-target={activeStage.target}
  style={`--performance-field-duration: ${activeStage.durationMs}ms;`}
  aria-label={ariaLabel}
>
  <figure class="performance-field-study__media">
    <picture>
      {#if mobileImage}
        <source media="(max-width: 640px)" srcset={mobileImage} />
      {/if}
      <img
        src={image}
        {alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchpriority={priority ? 'high' : 'auto'}
        decoding="async"
        style:object-position={objectPosition}
      />
    </picture>

    <div class="performance-field-study__grid" aria-hidden="true"></div>
    <div class="performance-field-study__trace" aria-hidden="true"><span></span></div>

    <figcaption class="performance-field-study__image-caption">
      <span>Figure {figure}</span>
      <strong>{principle}</strong>
    </figcaption>
  </figure>

  <div class="performance-field-study__panel">
    <header>
      <div class="performance-field-study__eyebrow">
        <span>{eyebrow}</span>
        <span>{activeStage.label}</span>
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
    </header>

    <div class="performance-field-study__metrics" aria-label="Measured conditions">
      {#each metrics as metric, index}
        <div class="performance-field-study__metric">
          <span>{String(index + 1).padStart(2, '0')} / {metric.label}</span>
          <strong>{metric.value}</strong>
          {#if metric.detail}<small>{metric.detail}</small>{/if}
        </div>
      {/each}
    </div>

    <footer class="performance-field-study__proof">
      <dl>
        <div><dt>Receipt</dt><dd>{proof.id}</dd></div>
        <div><dt>State</dt><dd>{proof.state}</dd></div>
        <div><dt>Owner</dt><dd>{proof.owner}</dd></div>
        <div><dt>Verified</dt><dd>{proof.verified}</dd></div>
        {#if proof.version}<div><dt>Version</dt><dd>{proof.version}</dd></div>{/if}
        {#if proof.classification}
          <div><dt>Class</dt><dd>{proof.classification}</dd></div>
        {/if}
      </dl>
    </footer>
  </div>
</section>

<style>
  .performance-field-study {
    --performance-field-accent: var(--color-performance-pressure, #e54800);
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(20rem, 0.8fr);
    width: min(var(--content-width-performance, 85rem), calc(100% - 2.5rem));
    margin: clamp(1.25rem, 3vw, 3.5rem) auto;
    overflow: hidden;
    border: 1px solid var(--color-performance-line-strong, #a9aaa5);
    border-radius: var(--radius-performance-sm, 0);
    background: var(--color-performance-ink, #090909);
    color: var(--color-performance-panel, #fff);
  }

  .performance-field-study[data-motion-stage='policy-applied'] {
    --performance-field-accent: var(--color-performance-ink, #090909);
  }

  .performance-field-study[data-motion-stage='metrics-moved'] {
    --performance-field-accent: var(--color-performance-growth, #007a4d);
  }

  .performance-field-study[data-motion-stage='validation-adjusted'] {
    --performance-field-accent: var(--color-performance-risk, #c62026);
  }

  .performance-field-study[data-motion-stage='receipt-settled'] {
    --performance-field-accent: var(--color-performance-gold, #a56c00);
  }

  .performance-field-study[data-mode='lab'] {
    background: var(--color-performance-panel, #fff);
    color: var(--color-performance-ink, #090909);
  }

  .performance-field-study[data-mode='archive'] {
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909);
  }

  .performance-field-study--media-right .performance-field-study__media {
    order: 2;
  }

  .performance-field-study__media {
    position: relative;
    min-height: clamp(30rem, 58vw, 48rem);
    margin: 0;
    overflow: hidden;
    background: var(--color-performance-ink, #090909);
    isolation: isolate;
  }

  .performance-field-study__media picture,
  .performance-field-study__media img {
    display: block;
    width: 100%;
    height: 100%;
  }

  .performance-field-study__media picture {
    position: absolute;
    inset: 0;
  }

  .performance-field-study__media img {
    object-fit: cover;
    filter: grayscale(1) contrast(1.08);
    transform: scale(1);
    animation: performance-field-settle var(--performance-field-duration) ease-out both;
  }

  .performance-field-study__grid {
    position: absolute;
    inset: 0;
    z-index: 1;
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.13) 1px, transparent 1px) 0 0 / 25% 100%,
      linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px) 0 0 / 100% 25%;
    mix-blend-mode: screen;
    pointer-events: none;
  }

  .performance-field-study__trace {
    position: absolute;
    inset: auto 1.25rem 4.5rem;
    z-index: 2;
    height: 2px;
    background: rgba(255, 255, 255, 0.35);
    overflow: hidden;
  }

  .performance-field-study__trace span {
    display: block;
    width: 100%;
    height: 100%;
    background: var(--performance-field-accent);
    transform-origin: left;
    animation: performance-field-trace var(--performance-field-duration) ease-out both;
  }

  .performance-field-study__image-caption {
    position: absolute;
    inset: auto 1.25rem 1.25rem;
    z-index: 2;
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(255, 255, 255, 0.62);
    color: #fff;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0;
    line-height: 1.3;
    text-transform: uppercase;
  }

  .performance-field-study__image-caption strong {
    max-width: 28ch;
    text-align: right;
  }

  .performance-field-study__panel {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto auto;
    min-width: 0;
    border-left: 1px solid var(--color-performance-line-strong, #a9aaa5);
  }

  .performance-field-study--media-right .performance-field-study__panel {
    border-right: 1px solid var(--color-performance-line-strong, #a9aaa5);
    border-left: 0;
  }

  .performance-field-study__panel > header {
    display: grid;
    align-content: start;
    gap: 1.1rem;
    padding: clamp(1.25rem, 3vw, 2.5rem);
  }

  .performance-field-study__eyebrow {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 0.8rem;
    border-bottom: 1px solid currentColor;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    line-height: 1.25;
    text-transform: uppercase;
  }

  .performance-field-study__eyebrow span:last-child {
    color: var(--performance-field-accent);
    text-align: right;
  }

  .performance-field-study h2 {
    max-width: 12ch;
    margin: auto 0 0;
    font-family: var(--font-performance-display, var(--font-display, var(--font-sans)));
    font-size: clamp(2.5rem, 5.5vw, 5.75rem);
    font-weight: var(--font-performance-display-weight, var(--font-medium, 500));
    font-kerning: normal;
    font-feature-settings: "kern" 1, "liga" 1;
    letter-spacing: var(--tracking-performance-display, -0.03em);
    line-height: var(--leading-performance-display, 0.94);
    text-wrap: balance;
  }

  .performance-field-study__panel > header > p {
    max-width: 34rem;
    margin: 0;
    color: color-mix(in srgb, currentColor 72%, transparent);
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .performance-field-study__metrics {
    display: grid;
    grid-template-columns: repeat(var(--performance-field-metric-columns, 1), minmax(0, 1fr));
    border-top: 1px solid var(--color-performance-line-strong, #a9aaa5);
  }

  .performance-field-study__metric {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.3rem 1rem;
    padding: 0.85rem 1.25rem;
  }

  .performance-field-study__metric + .performance-field-study__metric {
    border-top: 1px solid var(--color-performance-line-strong, #a9aaa5);
  }

  .performance-field-study__metric span,
  .performance-field-study__metric small,
  .performance-field-study__proof dt,
  .performance-field-study__proof dd {
    font-family: var(--font-mono);
    font-size: 0.67rem;
    line-height: 1.35;
  }

  .performance-field-study__metric span,
  .performance-field-study__metric small,
  .performance-field-study__proof dt {
    color: color-mix(in srgb, currentColor 58%, transparent);
    text-transform: uppercase;
  }

  .performance-field-study__metric strong {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    line-height: 1.2;
    text-align: right;
  }

  .performance-field-study__metric small {
    grid-column: 1 / -1;
  }

  .performance-field-study__proof {
    padding: 1rem 1.25rem;
    border-top: 3px solid var(--performance-field-accent);
  }

  .performance-field-study__proof dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.7rem 1rem;
    margin: 0;
  }

  .performance-field-study__proof dl > div {
    min-width: 0;
  }

  .performance-field-study__proof dt,
  .performance-field-study__proof dd {
    margin: 0;
  }

  .performance-field-study__proof dd {
    overflow-wrap: anywhere;
  }

  @keyframes performance-field-settle {
    from { transform: scale(1.025); }
    to { transform: scale(1); }
  }

  @keyframes performance-field-trace {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }

  @media (max-width: 960px) {
    .performance-field-study {
      grid-template-columns: 1fr;
    }

    .performance-field-study__media,
    .performance-field-study--media-right .performance-field-study__media {
      order: 0;
      min-height: 32rem;
    }

    .performance-field-study__panel,
    .performance-field-study--media-right .performance-field-study__panel {
      order: 1;
      border-top: 1px solid var(--color-performance-line-strong, #a9aaa5);
      border-right: 0;
      border-left: 0;
    }

    .performance-field-study h2 {
      max-width: 15ch;
      margin-top: 1rem;
    }

    .performance-field-study__metrics {
      --performance-field-metric-columns: 3;
    }

    .performance-field-study__metric + .performance-field-study__metric {
      border-top: 0;
      border-left: 1px solid var(--color-performance-line-strong, #a9aaa5);
    }
  }

  @media (max-width: 640px) {
    .performance-field-study {
      width: 100%;
      margin-block: 1rem;
      border-inline: 0;
    }

    .performance-field-study__media,
    .performance-field-study--media-right .performance-field-study__media {
      min-height: 30rem;
    }

    .performance-field-study__image-caption {
      inset-inline: 0.75rem;
      bottom: 0.75rem;
    }

    .performance-field-study__trace {
      inset-inline: 0.75rem;
      bottom: 4rem;
    }

    .performance-field-study__panel > header {
      padding: 1.25rem 0.75rem 1.5rem;
    }

    .performance-field-study h2 {
      font-size: clamp(2.5rem, 15vw, 4.25rem);
    }

    .performance-field-study__metrics {
      --performance-field-metric-columns: 1;
    }

    .performance-field-study__metric {
      padding-inline: 0.75rem;
    }

    .performance-field-study__metric + .performance-field-study__metric {
      border-top: 1px solid var(--color-performance-line-strong, #a9aaa5);
      border-left: 0;
    }

    .performance-field-study__proof {
      padding-inline: 0.75rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .performance-field-study__media img,
    .performance-field-study__trace span {
      animation: none;
      transform: none;
    }
  }
</style>
