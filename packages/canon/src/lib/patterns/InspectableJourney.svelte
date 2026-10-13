<script lang="ts">
  import type { Snippet } from 'svelte';
  import { journeyFragment, type JourneyLocation } from './journey-location.js';
  interface Step { id: string; label: string; title: string; summary: string }
  let { id, label, steps, location, enhanced = false, reducedMotion = true, onselect, overview, content }: {
    id: string;
    label: string;
    steps: readonly Step[];
    location: JourneyLocation;
    enhanced?: boolean;
    reducedMotion?: boolean;
    onselect: (location: JourneyLocation) => void;
    overview?: Snippet<[string]>;
    content: Snippet<[Step, boolean]>;
  } = $props();
  function select(event: MouseEvent, stepId: string) {
    if (!enhanced || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onselect({ stepId, detail: false });
  }
</script>

<div class="inspectable-journey" class:enhanced class:reduced={reducedMotion} data-journey={id}>
  <nav aria-label={label}>
    <ol>
      {#each steps as step, index}
        <li><a id={`${id}-${step.id}-control`} href={journeyFragment(id, { stepId: step.id, detail: false })}
          aria-current={enhanced && location.stepId === step.id ? 'step' : undefined}
          onclick={(event) => select(event, step.id)}>
          <span class="number" aria-hidden="true">0{index + 1}</span>{step.label}
          {#if enhanced && location.stepId === step.id}<span class="selected">Selected</span>{/if}
        </a></li>
      {/each}
    </ol>
  </nav>
  <div class="workspace">
    {#if overview}<div class="overview">{@render overview(location.stepId)}</div>{/if}
    <div class="panels">
      {#each steps as step}
        <section id={`${id}-${step.id}`} hidden={enhanced && location.stepId !== step.id} aria-labelledby={`${id}-${step.id}-title`}>
          <p class="eyebrow">{step.label} / illustrative example</p>
          <h3 id={`${id}-${step.id}-title`} tabindex="-1">{step.title}</h3>
          <p class="summary">{step.summary}</p>
          {@render content(step, location.detail && location.stepId === step.id)}
        </section>
      {/each}
    </div>
  </div>
</div>

<style>
  .inspectable-journey { min-width: 0; }
  ol { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); list-style: none; margin: 0; padding: 0; border-block: 1px solid var(--color-performance-shell-border-strong); }
  li { min-width: 0; }
  a { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-performance-xs); min-height: 60px; box-sizing: border-box; padding: var(--space-performance-sm); border-bottom: 3px solid transparent; color: inherit; text-decoration: none; font-size: var(--text-performance-caption); }
  a[aria-current='step'] { border-bottom-color: currentColor; background: color-mix(in srgb, currentColor 7%, transparent); font-weight: var(--font-performance-semibold); }
  a:hover { text-decoration: underline; text-underline-offset: .3em; }
  a:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: -4px; }
  .number, .selected, .eyebrow { font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); }
  .selected { width: 100%; padding-left: 2ch; }
  .workspace { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--space-performance-lg); padding-block: var(--space-performance-lg); align-items: start; }
  .overview, .panels { min-width: 0; }
  section { scroll-margin-top: 8rem; }
  section + section { margin-top: var(--space-performance-lg); }
  .enhanced section + section { margin-top: 0; }
  .enhanced section:not([hidden]) { animation: context-in var(--duration-performance-micro) var(--ease-performance-decelerate); }
  .eyebrow { margin-top: 0; text-transform: uppercase; }
  h3 { margin: var(--space-performance-xs) 0 var(--space-performance-sm); font: var(--font-performance-medium) clamp(1.4rem, 2.5vw, 2rem)/1.2 var(--font-performance-interface); }
  .summary { line-height: 1.65; max-width: 55ch; }
  .reduced section:not([hidden]) { animation: none; }
  @keyframes context-in { from { opacity: .75; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .enhanced section:not([hidden]) { animation: none; } }
  @media (max-width: 720px) { ol { grid-template-columns: repeat(2, minmax(0, 1fr)); } .workspace { grid-template-columns: 1fr; gap: var(--space-performance-md); } a { min-height: 76px; } }
</style>
