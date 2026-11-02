<script lang="ts">
  import { ArrowDown, ArrowUpRight, PencilLine, ShieldCheck } from 'lucide-svelte';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
</script>

<section class="hero-track" aria-labelledby="map-hero-title">
  <div class="hero-layout">
    <div class="hero-copy">
      <p class="eyebrow">CREATE SOMETHING Map / Draw</p>
      <h1 id="map-hero-title">See the work before you automate it.</h1>
      <p class="lede">We use Draw to complete workflow mapping: sketch the steps, connect the tools, and agree on where people make decisions. Try the canvas we built, then bring your map to a mapping session.</p>
      <div class="hero-actions">
        <a class="primary" href="#canvas">Map in Draw <ArrowDown size={18} aria-hidden="true" /></a>
        <a href={agencyCoreMessaging.workflowMappingSessionHref}>Talk through the workflow <ArrowUpRight size={18} aria-hidden="true" /></a>
      </div>
      <p class="hero-terms">Draw / built by CREATE SOMETHING. Your draft stays in this browser; export a copy or choose to publish a view-only link.</p>
    </div>
  </div>
  <div class="hero-bottom">
    <span><PencilLine size={16} aria-hidden="true" /> Draw / Working canvas</span>
    <span><ShieldCheck size={16} aria-hidden="true" /> Human approval</span>
    <a href="#canvas">Start mapping <ArrowDown size={16} aria-hidden="true" /></a>
  </div>
</section>

<style>
  /* Match AgencyHero's Home composition and responsive dimensions. */
  .hero-track { padding: 0; background: var(--color-performance-shell-surface); color: var(--color-performance-fg-primary); }
  .hero-layout { display: block; padding: 7.5rem 7vw var(--space-performance-lg); }
  .hero-copy { min-width: 0; max-width: 52ch; }
  .eyebrow, .hero-bottom { font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); }
  h1 { max-width: 17ch; margin-block: var(--space-performance-md); font: var(--font-performance-medium) clamp(2.2rem, 4.5vw, 4rem)/1.08 var(--font-performance-interface); letter-spacing: var(--tracking-performance-tight); }
  .lede { max-width: 48ch; font-size: var(--text-performance-body-sm); line-height: 1.6; }
  .hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-performance-md); margin-block: var(--space-performance-md); }
  .hero-actions a { display: inline-flex; align-items: center; gap: var(--space-performance-xs); min-height: 44px; }
  .hero-actions .primary { padding: var(--space-performance-xs) var(--space-performance-md); background: var(--color-performance-fg-primary); color: var(--color-performance-shell-surface); border: 1px solid var(--color-performance-fg-primary); border-radius: var(--radius-operator-control); text-decoration: none; }
  .hero-actions .primary:hover { background: var(--color-performance-shell-surface-hover); color: var(--color-performance-fg-primary); }
  .hero-terms { max-width: 52ch; font-size: var(--text-performance-caption); line-height: 1.6; color: var(--color-performance-fg-secondary); }
  .hero-bottom { display: flex; flex-wrap: wrap; gap: var(--space-performance-sm); justify-content: space-between; align-items: center; padding: var(--space-performance-sm) 7vw; border-top: 1px solid var(--color-performance-shell-border-default); }
  .hero-bottom span, .hero-bottom a { display: inline-flex; align-items: center; gap: var(--space-performance-sm); min-height: 44px; }
  a { color: inherit; text-underline-offset: .3em; }
  a:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 3px; }
  @media (max-width: 720px) { .hero-layout { padding-block: 7.5rem var(--space-performance-lg); } }
</style>
