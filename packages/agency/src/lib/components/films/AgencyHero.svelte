<script lang="ts">
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
  import { reducedFilmMotion } from '$lib/motion/filmPlayback';
  import CanonServiceGuide from '../CanonServiceGuide.svelte';
  import WorkflowStory from '../WorkflowStory.svelte';
</script>

<section class="hero-track" aria-labelledby="agency-hero-title">
  <div class="hero-composition">
  <div class="hero-copy">
    <p class="eyebrow">CREATE SOMETHING / AI-native technical support</p>
    <h1 id="agency-hero-title">Keep your tools working.</h1>
    <p class="lede">We diagnose problems, engineer improvements, and help your team use the result.</p>
    <div class="hero-actions"><a class="primary" href={agencyCoreMessaging.workflowMappingSessionHref}>Talk through your workflow ↗</a></div>
    <p class="starting-point">Support {PUBLIC_PRICING.membership.label.toLowerCase()} · Agreed scope. <a href="/services#membership">See membership and costs ↗</a></p>
  </div>
  <div class="hero-story"><WorkflowStory /></div>
  <div class="hero-guide"><CanonServiceGuide showSuggestions /></div>
  </div>
  <div class="hero-bottom">
    <a href="#built-work">Inspect the work ↓</a>
    <a href="/agent-foundation">Engineering handoff ↗</a>
    <a href="/stack#openai-qualifications">OpenAI Select Partner ↗</a>
    <button onclick={() => reducedFilmMotion.update(v => !v)} aria-pressed={$reducedFilmMotion}>{$reducedFilmMotion ? 'Enable motion' : 'Reduce motion'}</button>
  </div>
</section>

<style>
  .hero-track { padding: 0; background: var(--color-performance-ink); color: var(--color-performance-paper); }
  .hero-composition { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); align-items: center; column-gap: clamp(2rem, 5vw, 6rem); row-gap: var(--space-performance-sm); padding: 8rem 7vw var(--space-performance-lg); }
  .hero-copy, .hero-story, .hero-guide { min-width: 0; }
  .hero-guide { grid-column: 2; }
  .hero-story { padding-top: var(--space-performance-sm); }
  .eyebrow, .hero-bottom { font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); }
  .eyebrow { margin: 0; }
  h1 { max-width: 15ch; margin-block: var(--space-performance-md); font: var(--font-performance-medium) clamp(3.1rem, 5.8vw, 5.25rem)/1.04 var(--font-performance-interface); letter-spacing: var(--tracking-performance-tight); }
  .lede { max-width: 45ch; font-size: var(--text-performance-body); line-height: 1.55; margin-bottom: var(--space-performance-md); }
  .primary { display: inline-flex; align-items: center; min-height: 48px; padding: var(--space-performance-xs) var(--space-performance-md); background: var(--color-performance-paper); color: var(--color-performance-ink); border: 1px solid var(--color-performance-paper); border-radius: var(--radius-performance-sm); text-decoration: none; }
  .primary:hover { background: var(--color-performance-ink); color: var(--color-performance-paper); }
  .starting-point { margin-top: var(--space-performance-md); font-size: var(--text-performance-caption); line-height: 1.6; color: var(--color-performance-fg-secondary); }
  .starting-point a { display: inline-flex; min-height: 44px; align-items: center; }
  .hero-bottom { display: flex; flex-wrap: wrap; gap: var(--space-performance-sm); justify-content: space-between; align-items: center; padding: var(--space-performance-sm) 7vw; border-top: 1px solid var(--color-performance-shell-border-default); }
  a { color: inherit; text-underline-offset: .3em; }
  .hero-bottom a { display: inline-flex; align-items: center; min-height: 44px; }
  button { min-height: 44px; padding: var(--space-performance-xs) var(--space-performance-sm); border: 1px solid var(--color-performance-shell-border-strong); border-radius: var(--radius-performance-sm); background: var(--color-performance-ink); color: inherit; font: inherit; }
  a:focus-visible, button:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 3px; }
  @media(max-width:900px) { .hero-composition { grid-template-columns: 1fr; padding-top: 7rem; gap: var(--space-performance-md); } .hero-story, .hero-guide { grid-column: 1; max-width: 42rem; } }
  @media(max-width:720px) { h1 { font-size: clamp(2.75rem, 11vw, 4.5rem); } .lede { font-size: var(--text-performance-body-sm); } .hero-bottom { justify-content: start; column-gap: var(--space-performance-md); } }
</style>
