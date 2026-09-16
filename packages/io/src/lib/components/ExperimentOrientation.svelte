<script lang="ts">
  import type { ExperimentGuide } from '$lib/config/experimentSharpness';

  interface Props {
    guide: ExperimentGuide;
  }

  let { guide }: Props = $props();
</script>

<section class="orientation" aria-labelledby="experiment-question">
  <p class="eyebrow">Start here</p>
  <h2 id="experiment-question">{guide.question}</h2>
  <p class="action">{guide.action}</p>
  <div class="checks">
    <p><strong>What counts as evidence</strong><span>{guide.evidence}</span></p>
    <p><strong>Keep in mind</strong><span>{guide.limit}</span></p>
  </div>
  <a href={guide.nextHref}>{guide.nextLabel} <span aria-hidden="true">→</span></a>
</section>

<style>
  .orientation {
    max-width: 52rem;
    margin: 2rem auto;
    padding: clamp(1.25rem, 3vw, 2rem);
    border: 1px solid var(--color-performance-border-subtle, currentColor);
    background: var(--color-performance-bg-surface, transparent);
  }
  .eyebrow {
    margin: 0 0 0.65rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    opacity: 0.65;
  }
  h2 {
    margin: 0;
    max-width: 24ch;
    font-size: clamp(1.4rem, 3vw, 2rem);
    line-height: 1.12;
  }
  .action {
    margin: 1rem 0 0;
    max-width: 58ch;
    font-size: 1rem;
    line-height: 1.6;
  }
  .checks {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    margin: 1.5rem 0;
  }
  .checks p {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.5;
  }
  .checks strong,
  .checks span {
    display: block;
  }
  .checks strong {
    margin-bottom: 0.25rem;
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .checks span {
    opacity: 0.75;
  }
  a {
    color: inherit;
    font-weight: 650;
    text-underline-offset: 0.2em;
  }
  @media (max-width: 38rem) {
    .checks {
      grid-template-columns: 1fr;
    }
  }
</style>
