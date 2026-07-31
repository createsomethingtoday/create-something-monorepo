<script lang="ts">
  import AgencyPerformanceReadback from '$lib/components/AgencyPerformanceReadback.svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
</script>

<section
  id="shared-performance-handoff"
  class="performance-handoff"
  data-performance-handoff
  aria-labelledby="performance-handoff-title"
>
  <div class="performance-handoff__intro">
    <span class="performance-handoff__eyebrow">AI workflow system</span>
    <h2 id="performance-handoff-title">Make the handoff faster without losing the judgment.</h2>
    <p>
      Start with one manual handoff. Define the owner, allowed actions, approval pauses, and proof
      before automation expands.
    </p>
    <div class="performance-handoff__actions">
      <a class="performance-handoff__primary" href={agencyCoreMessaging.selfMapHref}
        >{agencyCoreMessaging.selfMapLabel}</a
      >
      <a href="/field-reports/template-review">Inspect the 49/50 field report</a>
    </div>
  </div>

  <AgencyPerformanceReadback compact={true} />

  <ol class="performance-handoff__steps" aria-label="How a controlled workflow improves">
    <li>
      <strong>Map the friction</strong><span>See the systems, handoffs, and decision owner.</span>
    </li>
    <li>
      <strong>Test one path</strong><span
        >Let routine work move while consequential work pauses.</span
      >
    </li>
    <li>
      <strong>Keep the proof</strong><span
        >Review what ran, what stopped, and what needs recovery.</span
      >
    </li>
  </ol>
</section>

<style>
  .performance-handoff {
    display: grid;
    grid-template-columns: minmax(18rem, 0.72fr) minmax(32rem, 1.28fr);
    gap: 0;
    padding-block: clamp(2rem, 5vw, 4.5rem);
    padding-inline: max(
      var(--space-performance-page-gutter, 1.25rem),
      calc((100% - var(--content-width-performance, 85rem)) / 2)
    );
    background: var(--color-performance-ink, #090909);
    color: var(--color-performance-paper, #f3f3f0);
  }

  .performance-handoff__intro {
    display: grid;
    align-content: center;
    justify-items: start;
    min-width: 0;
    padding: clamp(1.5rem, 3vw, 2.5rem);
    border: 1px solid
      color-mix(in srgb, var(--color-performance-paper, #f3f3f0) 25%, transparent);
    border-right: 0;
  }

  .performance-handoff__eyebrow {
    display: block;
    margin-bottom: 0.9rem;
    color: var(--color-performance-accent, #d9ff00);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  h2 {
    max-width: 20ch;
    margin: 0;
    font-size: clamp(2rem, 4.3vw, 4rem);
    line-height: 0.96;
    letter-spacing: -0.045em;
  }

  p {
    max-width: 40rem;
    margin: 1.2rem 0 0;
    color: color-mix(in srgb, var(--color-performance-paper, #f3f3f0) 78%, transparent);
    font-size: clamp(1rem, 1.4vw, 1.2rem);
    line-height: 1.55;
  }

  .performance-handoff__steps {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin: 0;
    padding: 0;
    border-block: 1px solid
      color-mix(in srgb, var(--color-performance-paper, #f3f3f0) 25%, transparent);
    list-style: none;
  }

  li {
    display: grid;
    gap: 0.6rem;
    min-height: 9rem;
    padding: 1.15rem;
  }

  li + li {
    border-left: 1px solid
      color-mix(in srgb, var(--color-performance-paper, #f3f3f0) 25%, transparent);
  }

  li strong {
    font-size: 1rem;
  }

  li span {
    color: color-mix(in srgb, var(--color-performance-paper, #f3f3f0) 68%, transparent);
    line-height: 1.45;
  }

  .performance-handoff__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1rem 1.5rem;
    margin-top: 1.5rem;
  }

  .performance-handoff__actions a {
    display: inline-flex;
    min-height: var(--height-performance-control-min, 2.75rem);
    align-items: center;
    color: inherit;
    font-weight: 650;
    text-underline-offset: 0.22em;
  }

  .performance-handoff__primary {
    padding: 0.75rem 1.1rem;
    background: var(--color-performance-paper, #f3f3f0);
    color: var(--color-performance-ink, #090909) !important;
    text-decoration: none;
  }

  @media (max-width: 70rem) {
    .performance-handoff {
      grid-template-columns: 1fr;
    }

    .performance-handoff__intro {
      border-right: 1px solid
        color-mix(in srgb, var(--color-performance-paper, #f3f3f0) 25%, transparent);
      border-bottom: 0;
    }
  }

  @media (max-width: 42rem) {
    .performance-handoff__steps {
      grid-template-columns: 1fr;
    }

    li + li {
      border-top: 1px solid
        color-mix(in srgb, var(--color-performance-paper, #f3f3f0) 25%, transparent);
      border-left: 0;
    }

    li {
      min-height: auto;
    }
  }
</style>
