<script lang="ts">
  import { PUBLIC_PRICING } from '$lib/data/publicPricing';
  import { agencyCoreMessaging } from '$lib/data/marketingCopy';
</script>

<section class="hero-track" aria-labelledby="agency-hero-title">
  <div class="hero-heading">
    <p class="eyebrow">CREATE SOMETHING .agency / Diagnose · Engineer · Learn</p>
    <h1 id="agency-hero-title">AI-native <span>Technical support</span></h1>
  </div>
  <div class="hero-composition">
    <div class="hero-copy">
      <h2>Keep your tools working.<br />Make the next improvement.</h2>
      <p class="lede">A broken form. A manual handoff. An AI tool your team needs help using. We diagnose the problem, build the agreed change, and teach you how to use it.</p>
      <div class="hero-actions"><a class="primary" href={agencyCoreMessaging.workflowMappingSessionHref}>Talk through your workflow <span aria-hidden="true">↗</span></a></div>
      <p class="next-step">Bring one task. We agree on scope and cost before work begins.</p>
      <p class="starting-point">Support {PUBLIC_PRICING.membership.label.toLowerCase()} <span aria-hidden="true">/</span> <a href="/services#membership">Membership and costs ↗</a></p>
    </div>
    <figure class="service-record">
      <figcaption><span>One task, made workable</span><span>Illustrative example / 01</span></figcaption>
      <div class="record-problem"><span class="record-label">The problem</span><p>“The form submits.<br />Our team never gets it.”</p></div>
      <ol>
        <li><span class="step">01</span><div><h3>Find the broken handoff.</h3><p>Trace the form, connection and destination.</p></div><span class="state">Diagnose</span></li>
        <li><span class="step">02</span><div><h3>Repair it. Check the result.</h3><p>Test a valid submission and a failure case.</p></div><span class="state">Engineer</span></li>
        <li><span class="step">03</span><div><h3>Know what to do next.</h3><p>Keep the change, instructions and recovery checks.</p></div><span class="state">Learn</span></li>
      </ol>
      <div class="record-footer"><span>You approve the scope.</span><span>You review the result.</span></div>
    </figure>
  </div>
  <div class="hero-bottom"><a href="#built-work">See the work behind the offer <span aria-hidden="true">↓</span></a><a href="/agent-foundation">What a checked handoff includes ↗</a></div>
</section>

<style>
  .hero-track { background: var(--color-performance-ink); color: var(--color-performance-paper); padding: 8rem 7vw 0; }
  .eyebrow, figcaption, .record-label, .step, .state, .record-footer, .hero-bottom { font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); }
  .eyebrow { margin: 0 0 var(--space-performance-lg); }
  h1 { font: var(--font-performance-medium) clamp(3.2rem, 6.8vw, 7rem)/.98 var(--font-performance-interface); letter-spacing: var(--tracking-performance-tight); margin: 0; }
  h1 span { display: block; }
  .hero-composition { display: grid; grid-template-columns: minmax(0, .95fr) minmax(0, 1fr); gap: clamp(2rem, 6vw, 7rem); align-items: start; padding-block: var(--space-performance-lg); }
  .hero-copy { min-width: 0; }
  h2 { font: var(--font-performance-medium) clamp(1.5rem, 2.1vw, 2rem)/1.25 var(--font-performance-interface); margin: 0 0 var(--space-performance-sm); }
  .lede { max-width: 46ch; margin: 0 0 var(--space-performance-md); font-size: var(--text-performance-body-sm); line-height: 1.65; }
  .primary { display: inline-flex; align-items: center; justify-content: space-between; gap: var(--space-performance-lg); min-height: 52px; padding: var(--space-performance-sm) var(--space-performance-md); background: var(--color-performance-paper); color: var(--color-performance-ink); border: 1px solid var(--color-performance-paper); text-decoration: none; border-radius: var(--radius-performance-sm); }
  .primary:hover { background: var(--color-performance-ink); color: var(--color-performance-paper); }
  .next-step, .starting-point { font-size: var(--text-performance-caption); line-height: 1.6; max-width: 46ch; }
  .next-step { margin-top: var(--space-performance-sm); }
  .starting-point { display: flex; align-items: center; gap: var(--space-performance-xs); flex-wrap: wrap; margin-bottom: 0; }
  .service-record { margin: 0; border: 1px solid var(--color-performance-shell-border-strong); border-radius: var(--radius-performance-sm); min-width: 0; }
  figcaption, .record-footer { display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--space-performance-xs); padding: var(--space-performance-sm) var(--space-performance-md); }
  figcaption { border-bottom: 1px solid var(--color-performance-shell-border-strong); }
  .record-problem { padding: var(--space-performance-md); }
  .record-problem p { font: var(--font-performance-medium) clamp(1.45rem, 2.2vw, 2.1rem)/1.25 var(--font-performance-interface); margin: var(--space-performance-sm) 0 0; }
  ol { list-style: none; padding: 0 var(--space-performance-md); margin: 0; }
  li { display: grid; grid-template-columns: auto 1fr auto; align-items: start; gap: var(--space-performance-sm); padding-block: var(--space-performance-sm); border-top: 1px solid var(--color-performance-shell-border-default); }
  h3 { margin: 0; font-size: var(--text-performance-caption); font-weight: var(--font-performance-medium); line-height: 1.5; }
  li p { margin: .3rem 0 0; font-size: var(--text-performance-caption); line-height: 1.5; }
  .step { padding-top: .1rem; }
  .state { border: 1px solid var(--color-performance-shell-border-strong); padding: .1rem .4rem; }
  .record-footer { border-top: 1px solid var(--color-performance-shell-border-strong); }
  .hero-bottom { display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--space-performance-sm); border-top: 1px solid var(--color-performance-shell-border-strong); padding-block: var(--space-performance-sm); }
  a { color: inherit; text-underline-offset: .3em; }
  .hero-bottom a, .starting-point a { display: inline-flex; align-items: center; gap: var(--space-performance-sm); min-height: 44px; }
  a:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 5px; }
  @media(max-width:900px) { .hero-track { padding-top: 7rem; } .hero-composition { grid-template-columns: 1fr; gap: var(--space-performance-lg); padding-block: var(--space-performance-lg); } .hero-copy { max-width: 40rem; } .service-record { max-width: 42rem; } }
  @media(max-width:540px) { .hero-track { padding-inline: 6vw; } h1 { font-size: clamp(2.6rem, 10vw, 3.4rem); line-height: 1.04; } .eyebrow { font-size: .65rem; margin-bottom: var(--space-performance-md); } .primary { width: 100%; } .state { display: none; } li { grid-template-columns: auto 1fr; } figcaption { flex-direction: column; } }
</style>
