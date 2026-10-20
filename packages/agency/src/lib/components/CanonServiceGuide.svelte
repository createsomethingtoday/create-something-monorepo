<script lang="ts">
  import CanonCompanion from './CanonCompanion.svelte';
  import { canonServiceQuestions, canonServiceAnswers } from '$lib/data/canonServiceGuide';
</script>

<div class="canon-guide">
  <div class="guide-introduction">
    <CanonCompanion action="waving" staticOnly />
    <div><h3>Ask Canon</h3><p>Published answers to help you choose a next step.</p></div>
  </div>
  <p class="guide-disclosure">Scripted service guide. No live AI or message submission.</p>
  <div class="guide-questions">
    {#each canonServiceQuestions as question}
      <details class="guide-question" name="canon-service-questions">
        <summary>{question.label}<span aria-hidden="true">+</span></summary>
        <div class="guide-answer">
          <h4>{canonServiceAnswers[question.id].title}</h4>
          {#each canonServiceAnswers[question.id].paragraphs as paragraph}<p>{paragraph}</p>{/each}
          <nav aria-label={`Published sources: ${question.label}`}>
            {#each canonServiceAnswers[question.id].links as link}<a href={link.href}>{link.label} ↗</a>{/each}
          </nav>
        </div>
      </details>
    {/each}
  </div>
  <p class="guide-next">Ready to talk? Bring the tools involved, the result you need, and who approves changes.</p>
  <a class="guide-services" href="/services">Read the service details <span aria-hidden="true">↗</span></a>
</div>

<style>
  .canon-guide { color: var(--color-performance-fg-primary); min-width: 0; }
  .guide-introduction { display: flex; align-items: center; gap: 1rem; }
  .guide-introduction :global(.canon) { width: 48px; flex-shrink: 0; }
  .guide-introduction > div { min-width: 0; }
  .canon-guide h3 { margin: 0; font: var(--font-performance-medium) 1.25rem/1.3 var(--font-performance-interface); }
  .canon-guide p { margin: .5rem 0 0; font-size: .875rem; line-height: 1.6; }
  .canon-guide .guide-disclosure { margin: 1rem 0; color: var(--color-performance-fg-tertiary); font-size: .75rem; }
  .guide-question { border-top: 1px solid var(--color-performance-shell-border-strong); }
  .guide-question summary { display: flex; justify-content: space-between; align-items: center; gap: 1rem; min-height: 56px; padding-block: .75rem; font-size: .9375rem; line-height: 1.5; cursor: pointer; list-style: none; }
  .guide-question summary::-webkit-details-marker { display: none; }
  .guide-question summary span { flex-shrink: 0; }
  .guide-question[open] summary span { transform: rotate(45deg); }
  .guide-answer { padding: .25rem 0 1.25rem; }
  .canon-guide h4 { margin: 0 0 .75rem; font-size: .9375rem; line-height: 1.5; font-weight: var(--font-performance-medium); }
  .guide-answer nav { display: flex; flex-wrap: wrap; gap: 0 1.25rem; margin-top: .75rem; }
  .canon-guide a { display: inline-flex; align-items: center; min-height: 44px; color: inherit; font-size: .8125rem; text-underline-offset: .3em; }
  .canon-guide .guide-next { border-top: 1px solid var(--color-performance-shell-border-strong); padding-top: 1rem; margin-top: 0; }
  .guide-services { gap: 1rem; }
  summary:focus-visible, a:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 4px; }
</style>
