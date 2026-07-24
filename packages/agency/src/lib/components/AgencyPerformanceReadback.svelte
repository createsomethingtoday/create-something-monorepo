<script lang="ts">
  import { templateReviewFieldReport } from '$lib/data/fieldReports';

  let { compact = false }: { compact?: boolean } = $props();

  const evidence = templateReviewFieldReport.evidence;
</script>

<section
  class:performance-readback--compact={compact}
  class="performance-readback"
  data-performance-readback
  data-compact={compact}
  aria-label="Performance outcome, worked example, and field proof"
>
  <div class="performance-readback__inner">
    <article data-readback-kind="outcome">
      <span>Outcome</span>
      <strong>Routine work moves. Judgment stays with the operator.</strong>
      <p>
        Evidence can be prepared before review while approval, rejection, and consequential action
        remain with a named person.
      </p>
    </article>

    <article data-readback-kind="example">
      <span>Worked example</span>
      <strong>Marketplace template review</strong>
      <p>
        The system prepared {evidence.usableCases} of {evidence.selectedCases} selected evidence packets
        before a human reviewed the templates.
      </p>
    </article>

    <article data-readback-kind="proof">
      <span>Field proof</span>
      <strong>Measured result, visible limit.</strong>
      <p>Automated judgment remains blocked. Reviewer time savings remain unmeasured.</p>
      <a href="/field-reports/template-review">Inspect the evidence and failed gate</a>
    </article>
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
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: min(var(--content-width-performance, 85rem), 100%);
    margin-inline: auto;
    border: 1px solid var(--color-performance-line, #d7d7d2);
    background: var(--color-performance-line, #d7d7d2);
    gap: 1px;
  }

  article {
    display: grid;
    align-content: start;
    gap: 0.65rem;
    min-width: 0;
    padding: clamp(1rem, 2vw, 1.45rem);
    background: var(--color-performance-panel, #ffffff);
  }

  span {
    color: var(--color-performance-signal, #0f62fe);
    font-family: var(--font-performance-mono);
    font-size: 0.72rem;
    font-weight: var(--font-performance-semibold, 650);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  strong {
    max-width: 25ch;
    font-size: clamp(1rem, 1.6vw, 1.25rem);
    line-height: 1.15;
  }

  p {
    margin: 0;
    color: var(--color-performance-muted, #5e6268);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  a {
    width: fit-content;
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

  .performance-readback--compact .performance-readback__inner {
    width: 100%;
    border-color: color-mix(in srgb, currentColor 25%, transparent);
    background: color-mix(in srgb, currentColor 25%, transparent);
  }

  .performance-readback--compact article {
    background: var(--color-performance-ink, #090909);
  }

  .performance-readback--compact p {
    color: color-mix(in srgb, currentColor 72%, transparent);
  }

  .performance-readback--compact span {
    color: var(--color-performance-accent, #d9ff00);
  }

  @media (max-width: 48rem) {
    .performance-readback__inner {
      grid-template-columns: 1fr;
    }

    article + article {
      border-top: 1px solid var(--color-performance-line, #d7d7d2);
    }

    .performance-readback--compact article + article {
      border-color: color-mix(in srgb, currentColor 25%, transparent);
    }
  }
</style>
