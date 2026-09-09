<script lang="ts">
  import TechnicalReviewVisual from './TechnicalReviewVisual.svelte';
</script>

<section class="review-entry" aria-labelledby="review-entry-title">
  <div>
    <p class="eyebrow">When to call us</p>
    <h2 id="review-entry-title">Built something. Need a second pair of eyes?</h2>
    <p>You can keep building while we help you check the parts you cannot confidently verify.</p>
    <ul>
      <li>You built a product with AI and want an engineer to review it before a customer pilot.</li>
      <li>A feature keeps breaking despite repeated fixes.</li>
      <li>A customer asks for an integration or security review, and you need to know what you can commit to.</li>
    </ul>
    <a href="/technical-review">See how a technical review works →</a>
    <p class="other-path">Starting from an idea? <a href="/agent-foundation">Build one useful AI task.</a> Already running a system? <a href="/control">Explore ongoing support.</a></p>
  </div>
  <TechnicalReviewVisual />
</section>

<style>
  .review-entry { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap: clamp(2rem, 4vw, 4rem); align-items: center; padding: clamp(2rem, 5vw, 5rem) max(1.25rem, calc((100% - 80rem) / 2)); color: var(--color-performance-ink); background: var(--color-performance-paper); border-bottom: 1px solid var(--color-performance-line); }
  .eyebrow { color: var(--color-performance-ink, var(--color-fg-primary)); font-family: var(--font-mono); font-size: var(--text-body-sm); }
  h2 { font-size: clamp(2rem, 4vw, 3.5rem); line-height: 1.1; max-width: 22ch; margin: 1rem 0; }
  p, li { max-width: 65ch; font-size: var(--text-body); line-height: 1.65; }
  ul { padding-left: 1.25rem; margin: 1.5rem 0; }
  li { margin: .65rem 0; }
  a { color: inherit; text-decoration: underline; text-underline-offset: .2em; }
  .other-path { margin-top: 1.5rem; }
  @media (max-width: 1000px) { .review-entry { grid-template-columns: 1fr; } }
</style>
