<script lang="ts">
  import { workflowWorkedExamples } from '$lib/data/workflowWorkedExamples';
  let { slug }: { slug: string } = $props();
  let showException = $state(false);
  const example = $derived(workflowWorkedExamples[slug]);
</script>

{#if example}
  <section class="worked-example" aria-labelledby="worked-example-title">
    <div class="example-heading"><p>Synthetic worked example / no connected tools</p><h3 id="worked-example-title">{example.title}</h3></div>
    <div class="artifact-table">
      <table><thead><tr>{#each example.columns as column}<th scope="col">{column}</th>{/each}</tr></thead><tbody>{#each example.rows as row}<tr>{#each row as value}<td>{value}</td>{/each}</tr>{/each}</tbody></table>
    </div>
    <div class="example-choices" aria-label="Inspect the example outcome"><button type="button" aria-pressed={!showException} onclick={() => showException = false}>Expected path</button><button type="button" aria-pressed={showException} onclick={() => showException = true}>When it cannot continue</button></div>
    <p class="example-result" aria-live="polite"><strong>{showException ? 'Pause /' : 'Result /'}</strong> {showException ? example.exception : example.result}</p>
    <noscript><p class="example-result"><strong>Pause /</strong> {example.exception}</p></noscript>
  </section>
{/if}

<style>
  .worked-example { margin-block: var(--space-performance-lg) var(--space-performance-xl); padding: clamp(1rem, 2vw, 2rem); border: 1px solid var(--color-performance-shell-border-strong); background: var(--color-performance-shell-surface); color: var(--color-performance-fg-primary); }
  .example-heading p { margin: 0 0 var(--space-performance-sm); color: var(--color-performance-fg-secondary); font: 11px/1.6 var(--font-performance-mono); }
  h3 { margin: 0 0 var(--space-performance-lg); font: var(--font-performance-medium) clamp(1.3rem, 2vw, 1.8rem)/1.2 var(--font-performance-interface); letter-spacing: var(--tracking-performance-tight); }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; font-size: var(--text-performance-body-sm); line-height: 1.6; }
  th { text-align: left; font-weight: var(--font-performance-medium); }
  th, td { padding: var(--space-performance-sm); border-block: 1px solid var(--color-performance-shell-border-default); vertical-align: top; overflow-wrap: anywhere; }
  th:first-child, td:first-child { padding-left: 0; width: 25%; }
  th:last-child, td:last-child { padding-right: 0; }
  th { color: var(--color-performance-fg-secondary); }
  .example-choices { display: flex; flex-wrap: wrap; gap: var(--space-performance-md); margin-top: var(--space-performance-md); }
  button { min-height: 44px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--color-performance-fg-secondary); padding: var(--space-performance-xs) 0; font: inherit; font-size: var(--text-performance-body-sm); cursor: pointer; }
  button[aria-pressed='true'] { border-color: currentColor; color: var(--color-performance-fg-primary); }
  button:focus-visible { outline: 2px solid currentColor; outline-offset: 4px; }
  .example-result { margin: var(--space-performance-md) 0 0; font-size: var(--text-performance-body-sm); line-height: 1.65; }
  .example-result strong { font-weight: var(--font-performance-medium); }
  @media(max-width: 480px) { .worked-example { padding: var(--space-performance-sm); } table { font-size: 12px; } th, td { padding: var(--space-performance-sm) var(--space-performance-xs); } }
</style>
