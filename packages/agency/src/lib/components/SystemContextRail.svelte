<script lang="ts">
  import { getTemplateReviewSystemContext } from '$lib/system-context/template-review';
  const context = getTemplateReviewSystemContext('dependencies');
</script>

<aside class="context-rail" aria-label="Worked example context">
  <header><span>Optional worked example</span><strong>{context.workflow.label}</strong></header>
  <div><span>Owner</span><strong>Review operations</strong></div>
  <div><span>Decision</span><strong>Human reviewer</strong></div>
  <div><span>Stop</span><strong>No ungrounded approval</strong></div>
  <div><span>Proof</span><strong>{context.receipt.sourceLabel}</strong></div>
  <a href="/field-reports/template-review">Inspect the evidence <span aria-hidden="true">→</span></a>
</aside>

<style>
  .context-rail { display: grid; grid-template-columns: minmax(12rem, 1.25fr) repeat(4, minmax(7rem, .75fr)) auto; border: 1px solid var(--color-performance-line-strong, #9c9c96); background: #fff; overflow: hidden; }
  header, div, a { display: grid; align-content: center; gap: .25rem; min-height: 4.8rem; padding: .75rem 1rem; border-right: 1px solid var(--color-performance-line, #d7d7d2); }
  span { color: var(--color-performance-muted, #5e6268); font: .64rem var(--font-performance-mono); letter-spacing: .05em; text-transform: uppercase; }
  strong { font-size: .78rem; line-height: 1.35; }
  a { align-items: center; grid-template-columns: 1fr auto; border-right: 0; background: #111; color: #fff; font: 600 .72rem var(--font-performance-mono); text-decoration: none; text-transform: uppercase; }
  a span { color: inherit; font-size: 1rem; }
  a:focus-visible { outline: 3px solid #2774d6; outline-offset: -4px; }
  @media (max-width: 900px) { .context-rail { grid-template-columns: repeat(2, 1fr); } header, div, a { min-height: 4.2rem; border-bottom: 1px solid var(--color-performance-line, #d7d7d2); } header { grid-column: 1 / -1; } a { grid-column: 1 / -1; border-bottom: 0; } }
</style>
