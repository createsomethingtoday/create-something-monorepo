<script lang="ts">
  import { templateReviewFieldReport } from '$lib/data/fieldReports';

  let { compact = false, embedded = false }: { compact?: boolean; embedded?: boolean } = $props();

  const evidence = templateReviewFieldReport.evidence;
</script>

<section
  class:performance-readback--compact={compact}
  class:performance-readback--embedded={embedded}
  class="performance-readback"
  data-performance-readback
  data-compact={compact}
  aria-labelledby="performance-readback-title"
>
  <div class="performance-readback__inner">
    <article class="performance-readback__primary" data-readback-kind="primary-proof">
      <div class="performance-readback__copy">
        <span>Verified field result</span>
        <h2 id="performance-readback-title">{templateReviewFieldReport.title}</h2>
        <p>
          Routine evidence moved before review. Approval, rejection, and consequential action stayed
          with a named person.
        </p>
      </div>

      <div
        class="performance-readback__result"
        aria-label={`${evidence.usableCases} of ${evidence.selectedCases} evidence packets prepared`}
      >
        <div><strong>{evidence.usableCases}</strong><span>/ {evidence.selectedCases}</span></div>
        <small>Evidence packets prepared</small>
      </div>
    </article>

    <div class="performance-readback__evidence">
      <dl class="performance-readback__receipt" aria-label="Field report receipt">
        <div>
          <dt>Workflow</dt>
          <dd>{templateReviewFieldReport.workflow}</dd>
        </div>
        <div>
          <dt>Receipt</dt>
          <dd>{templateReviewFieldReport.id}</dd>
        </div>
        <div>
          <dt>Verified</dt>
          <dd>{templateReviewFieldReport.verifiedPeriod}</dd>
        </div>
        <div>
          <dt>External writes</dt>
          <dd>{evidence.externalWrites}</dd>
        </div>
      </dl>

      <aside class="performance-readback__limit" data-control-state="stop">
        <div>
          <span>Visible limit</span>
          <strong>Automated judgment remains blocked.</strong>
          <p>Reviewer time savings remain unmeasured.</p>
        </div>
        <a href={`/field-reports/${templateReviewFieldReport.slug}`}>
          Inspect the full field report <span aria-hidden="true">↗</span>
        </a>
      </aside>
    </div>
  </div>
</section>

<style>
  .performance-readback {
    padding: clamp(1.5rem, 4vw, 3.25rem) clamp(1.25rem, 5vw, 6rem);
    border-bottom: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-panel, #ffffff);
    color: var(--color-performance-ink, #090909);
  }

  .performance-readback__inner {
    width: min(var(--content-width-performance, 85rem), 100%);
    margin-inline: auto;
    border: 1px solid var(--color-performance-line-strong, #a9aaa5);
    background: var(--color-performance-panel, #ffffff);
  }

  .performance-readback__primary {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(15rem, 0.55fr);
    min-width: 0;
  }

  .performance-readback__copy {
    display: grid;
    align-content: start;
    gap: 0.8rem;
    min-width: 0;
    padding: clamp(1.25rem, 3vw, 2.4rem);
  }

  .performance-readback__copy > span,
  .performance-readback__limit span,
  .performance-readback :is(dt, small) {
    color: var(--color-performance-muted, #5e6268);
    font-family: var(--font-performance-mono);
    font-size: 0.7rem;
    font-weight: var(--font-performance-semibold, 650);
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .performance-readback__copy > span {
    color: var(--color-performance-signal, #0057b8);
  }

  .performance-readback h2,
  .performance-readback p,
  .performance-readback dl,
  .performance-readback dd {
    margin: 0;
  }

  .performance-readback h2 {
    max-width: 25ch;
    font-size: clamp(1.65rem, 3.1vw, 3.25rem);
    font-weight: var(--font-performance-medium, 500);
    letter-spacing: var(--tracking-performance-display, -0.03em);
    line-height: 0.98;
  }

  .performance-readback__copy p {
    max-width: 48rem;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .performance-readback__result {
    display: grid;
    align-content: space-between;
    gap: 2rem;
    min-width: 0;
    padding: clamp(1.25rem, 3vw, 2.4rem);
    border-left: 1px solid var(--color-performance-line-strong, #a9aaa5);
    background: var(--color-performance-ink, #090909);
    color: var(--color-performance-panel, #ffffff);
  }

  .performance-readback__result div {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    min-width: 0;
  }

  .performance-readback__result strong {
    font-size: clamp(4.5rem, 9vw, 8.5rem);
    font-weight: var(--font-performance-medium, 500);
    letter-spacing: -0.075em;
    line-height: 0.78;
  }

  .performance-readback__result span {
    font-family: var(--font-performance-mono);
    font-size: clamp(1rem, 2vw, 1.45rem);
  }

  .performance-readback__result small {
    color: color-mix(in srgb, currentColor 72%, transparent);
  }

  .performance-readback__evidence {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(15rem, 0.55fr);
    border-top: 1px solid var(--color-performance-line-strong, #a9aaa5);
  }

  .performance-readback__receipt {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    min-width: 0;
  }

  .performance-readback__receipt > div {
    display: grid;
    align-content: start;
    gap: 0.35rem;
    min-width: 0;
    padding: 1rem;
  }

  .performance-readback__receipt > div + div {
    border-left: 1px solid var(--color-performance-line, #d7d7d2);
  }

  .performance-readback__receipt dd {
    font-size: 0.82rem;
    font-weight: var(--font-performance-medium, 500);
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .performance-readback__limit {
    display: grid;
    gap: 1rem;
    padding: 1rem;
    border-left: 4px solid var(--color-performance-stop, var(--color-performance-risk, #c62828));
    background: var(--color-performance-paper, #f3f3f0);
  }

  .performance-readback__limit > div {
    display: grid;
    gap: 0.35rem;
  }

  .performance-readback__limit strong {
    font-size: 0.95rem;
    line-height: 1.25;
  }

  .performance-readback__limit p {
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.82rem;
    line-height: 1.4;
  }

  .performance-readback__limit a {
    display: inline-flex;
    width: fit-content;
    min-height: var(--height-performance-control-min, 2.75rem);
    align-items: center;
    gap: 0.45rem;
    color: inherit;
    font-size: 0.82rem;
    font-weight: var(--font-performance-semibold, 650);
    text-underline-offset: 0.22em;
  }

  .performance-readback--compact {
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
  }

  .performance-readback--embedded {
    padding-block: clamp(1.5rem, 3vw, 2.5rem);
    border-bottom: 0;
    background: var(--color-performance-panel, #ffffff);
  }

  .performance-readback--compact .performance-readback__inner,
  .performance-readback--compact .performance-readback__primary,
  .performance-readback--compact .performance-readback__evidence {
    border-color: color-mix(in srgb, currentColor 25%, transparent);
  }

  .performance-readback--compact .performance-readback__inner {
    background: transparent;
  }

  .performance-readback--compact .performance-readback__copy,
  .performance-readback--compact .performance-readback__result,
  .performance-readback--compact .performance-readback__receipt,
  .performance-readback--compact .performance-readback__limit {
    background: transparent;
    color: inherit;
  }

  .performance-readback--compact .performance-readback__copy,
  .performance-readback--compact .performance-readback__result {
    padding: 1rem;
  }

  .performance-readback--compact h2 {
    font-size: clamp(1.35rem, 2vw, 2rem);
  }

  .performance-readback--compact .performance-readback__result strong {
    font-size: clamp(3rem, 6vw, 5rem);
  }

  .performance-readback--compact
    :is(.performance-readback__copy p, .performance-readback__limit p) {
    color: color-mix(in srgb, currentColor 72%, transparent);
  }

  .performance-readback--compact
    :is(.performance-readback__copy > span, .performance-readback__limit span) {
    color: var(--color-performance-accent, #d9ff00);
  }

  @media (max-width: 64rem) {
    .performance-readback__primary,
    .performance-readback__evidence {
      grid-template-columns: minmax(0, 1.1fr) minmax(14rem, 0.9fr);
    }

    .performance-readback__receipt {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .performance-readback__receipt > div:nth-child(3) {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left: 0;
    }

    .performance-readback__receipt > div:nth-child(4) {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
    }
  }

  @media (max-width: 48rem) {
    .performance-readback__primary,
    .performance-readback__evidence {
      grid-template-columns: 1fr;
    }

    .performance-readback__result {
      min-height: 12rem;
      border-top: 1px solid var(--color-performance-line-strong, #a9aaa5);
      border-left: 0;
    }

    .performance-readback__limit {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
      border-left-width: 4px;
    }
  }
</style>
