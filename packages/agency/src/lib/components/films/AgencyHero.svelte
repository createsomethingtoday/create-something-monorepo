<script lang="ts">
  import { agentFoundationRepository } from '$lib/data/agentFoundation';
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';
  import { reducedFilmMotion } from '$lib/motion/filmPlayback';
</script>

<section class="hero-track" aria-labelledby="agency-hero-title">
  <div class="hero-layout">
    <div class="hero-copy">
      <p class="eyebrow">Independent engineering / Map → Build → Control</p>
      <a class="partner" href="/stack#openai-qualifications">OpenAI Select Partner ↗</a>
      <h1 id="agency-hero-title">Apps, workflows and agents your team owns.</h1>
      <p class="lede">We build the software around your workflow: interfaces, integrations and AI agents, with source, tests, approval rules and a clear handoff.</p>
      <div class="hero-actions">
        <a class="primary" href="#built-work">Inspect the work ↓</a>
        <a href="/services">Scope &amp; cost ↗</a>
      </div>
      <p class="hero-terms">{PUBLIC_PRICING.membership.label} for one agreed workstream. Larger builds are quoted separately. AI usage, hosting and third-party costs are separate.</p>
      <a class="review-link" href="/technical-review">Have an existing product? Start with a technical review ↗</a>
    </div>
    <aside class="handoff" aria-labelledby="handoff-title">
      <header>
        <p class="eyebrow">Agent Foundation / Handoff example</p>
        <h2 id="handoff-title">A repository your team can run.</h2>
        <p>One role. One agreed job. Your code and instructions.</p>
      </header>
      <dl>
        {#each agentFoundationRepository as file}
          <div><dt>{file.path}</dt><dd>{file.purpose}</dd></div>
        {/each}
      </dl>
      <footer>
        <p>Built and tested in the agreed environment. Going live is scoped separately.</p>
        <a href="/agent-foundation">Inspect the handoff &amp; acceptance checks ↗</a>
      </footer>
    </aside>
  </div>
  <div class="hero-bottom">
    <a href="/products">Explore products ↗</a>
    <a href="/stack">Ownership, tools &amp; handoff ↗</a>
    <a href="#work">Watch the work ↓</a>
    <button onclick={() => reducedFilmMotion.update(v => !v)} aria-pressed={$reducedFilmMotion}>{$reducedFilmMotion ? 'Enable motion' : 'Reduce motion'}</button>
  </div>
</section>

<style>
  .hero-track { padding: 0; background: var(--color-performance-ink); color: var(--color-performance-paper); }
  .hero-layout { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap: var(--space-performance-xl); align-items: center; padding: 7.5rem 7vw var(--space-performance-lg); }
  .hero-copy { min-width: 0; }
  .eyebrow, .partner, .hero-bottom { font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); }
  h1 { max-width: 17ch; margin-block: var(--space-performance-md); font: var(--font-performance-medium) clamp(2.2rem, 4.5vw, 4rem)/1.08 var(--font-performance-interface); letter-spacing: var(--tracking-performance-tight); }
  .lede { max-width: 48ch; font-size: var(--text-performance-body-sm); line-height: 1.6; }
  .hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-performance-md); margin-block: var(--space-performance-md); }
  .hero-actions a, .review-link { display: inline-flex; align-items: center; min-height: 44px; }
  .hero-actions .primary { padding: var(--space-performance-xs) var(--space-performance-md); background: var(--color-performance-paper); color: var(--color-performance-ink); border: 1px solid var(--color-performance-paper); border-radius: var(--radius-performance-sm); text-decoration: none; }
  .hero-actions .primary:hover { background: var(--color-performance-ink); color: var(--color-performance-paper); }
  .hero-terms, .review-link { max-width: 52ch; font-size: var(--text-performance-caption); line-height: 1.6; }
  .hero-terms { color: var(--color-performance-fg-secondary); }
  .handoff { min-width: 0; border: 1px solid var(--color-performance-shell-border-strong); border-radius: var(--radius-performance-sm); }
  .handoff header, .handoff footer { padding: var(--space-performance-md); }
  .handoff h2 { margin-block: var(--space-performance-sm); font: var(--font-performance-medium) var(--text-performance-body)/1.3 var(--font-performance-interface); }
  .handoff p, .handoff dd, .handoff footer a { font-size: var(--text-performance-caption); line-height: 1.5; }
  .handoff header > p:last-child, .handoff footer p, dd { color: var(--color-performance-fg-secondary); }
  dl { margin: 0; }
  dl > div { display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.4fr); gap: var(--space-performance-sm); padding: var(--space-performance-sm) var(--space-performance-md); border-top: 1px solid var(--color-performance-shell-border-default); }
  dt { font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); overflow-wrap: anywhere; }
  dd { margin: 0; }
  .handoff footer { border-top: 1px solid var(--color-performance-shell-border-default); }
  .handoff footer a { display: inline-flex; align-items: center; min-height: 44px; }
  .hero-bottom { display: flex; flex-wrap: wrap; gap: var(--space-performance-sm); justify-content: space-between; align-items: center; padding: var(--space-performance-sm) 7vw; border-top: 1px solid var(--color-performance-shell-border-default); }
  a { color: inherit; text-underline-offset: .3em; }
  .hero-bottom a, .partner { display: inline-flex; align-items: center; min-height: 44px; }
  button { min-height: 44px; padding: var(--space-performance-xs) var(--space-performance-sm); border: 1px solid var(--color-performance-shell-border-strong); border-radius: var(--radius-performance-sm); background: var(--color-performance-ink); color: inherit; font: inherit; }
  a:focus-visible, button:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 3px; }
  @media (max-width: 720px) { .hero-layout { grid-template-columns: 1fr; gap: var(--space-performance-lg); padding-block: 7.5rem var(--space-performance-lg); } }
</style>
