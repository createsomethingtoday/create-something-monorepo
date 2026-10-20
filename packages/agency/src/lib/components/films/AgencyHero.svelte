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
      <p class="starting-point">Support {PUBLIC_PRICING.membership.label.toLowerCase()} <a href="/services#membership">Membership and costs ↗</a></p>
    </div>
    <figure class="service-record">
      <figcaption><span>Your dot. Your workflow.</span><span>Illustrative example / 01</span></figcaption>
      <div class="record-problem"><span class="record-label">The goal</span><p>“Help my ChatGPT dot prepare website updates for my review.”</p></div>
      <div class="workflow-path" aria-label="Proposed workflow"><span>Your ChatGPT dot</span><span aria-hidden="true">→</span><span>Website + codebase</span><span aria-hidden="true">→</span><span>Your review</span></div>
      <p class="record-context">We check compatibility, connect or build the missing pieces, and agree on what your dot may access. An MCP connection or a prose.md workflow may help, where your setup supports it.</p>
      <details class="example-receipt">
        <summary>Inspect the proposed handoff <span aria-hidden="true">+</span></summary>
        <dl>
          <div><dt>Scope</dt><dd>One page update, using an agreed brief and selected repository.</dd></div>
          <div><dt>Permission</dt><dd>Read the selected files. Prepare a draft. Wait for your approval before publishing.</dd></div>
          <div><dt>Change record</dt><dd>A proposed diff, connection setup and workflow instructions, with each change explained.</dd></div>
          <div><dt>Checks &amp; results</dt><dd>Record the build, mobile review and approval-stop check, with actual results and any blockers.</dd></div>
          <div><dt>Handoff</dt><dd>Review the preview and receipts. Keep the setup, instructions and recovery steps.</dd></div>
        </dl>
      </details>
      <div class="record-footer"><span>Proposed workflow. No task has run.</span><a href="https://chatgpt.com/features/dots/">About ChatGPT dots ↗</a></div>
    </figure>
  </div>
  <div class="hero-bottom"><a href="#built-work">See the work behind the offer <span aria-hidden="true">↓</span></a><a href="/agent-foundation">What a checked handoff includes ↗</a></div>
</section>

<style>
  .hero-track { background: var(--color-performance-ink); color: var(--color-performance-paper); padding: 8rem 7vw 0; }
  .eyebrow, figcaption, .record-label, .record-footer, .hero-bottom { font: var(--text-performance-operator-label)/1.5 var(--font-performance-mono); }
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
  .workflow-path { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; margin: 0 var(--space-performance-md); font: .75rem/1.5 var(--font-performance-mono); }
  .workflow-path span:not([aria-hidden]) { border: 1px solid var(--color-performance-shell-border-strong); padding: .4rem .6rem; }
  .record-context { margin: 1rem var(--space-performance-md); font-size: .875rem; line-height: 1.6; }
  .example-receipt { margin: 0 var(--space-performance-md); border-top: 1px solid var(--color-performance-shell-border-strong); }
  .example-receipt summary { display: flex; justify-content: space-between; gap: 1rem; align-items: center; min-height: 56px; font-size: .875rem; cursor: pointer; list-style: none; }
  .example-receipt summary::-webkit-details-marker { display: none; }
  .example-receipt[open] summary span { transform: rotate(45deg); }
  .example-receipt dl { margin: 0 0 1rem; }
  .example-receipt dl > div { display: grid; grid-template-columns: 7rem 1fr; gap: 1rem; border-top: 1px solid var(--color-performance-shell-border-default); padding-block: .75rem; font-size: .8125rem; line-height: 1.6; }
  .example-receipt dt { font-weight: var(--font-performance-medium); }
  .example-receipt dd { margin: 0; }
  .record-footer a { display: inline-flex; align-items: center; min-height: 44px; }
  .example-receipt summary:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 4px; }
  .record-footer { border-top: 1px solid var(--color-performance-shell-border-strong); }
  .hero-bottom { display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--space-performance-sm); border-top: 1px solid var(--color-performance-shell-border-strong); padding-block: var(--space-performance-sm); }
  a { color: inherit; text-underline-offset: .3em; }
  .hero-bottom a, .starting-point a { display: inline-flex; align-items: center; gap: var(--space-performance-sm); min-height: 44px; }
  a:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 5px; }
  @media(max-width:900px) { .hero-track { padding-top: 7rem; } .hero-composition { grid-template-columns: 1fr; gap: var(--space-performance-lg); padding-block: var(--space-performance-lg); } .hero-copy { max-width: 40rem; } .service-record { max-width: 42rem; } }
  @media(max-width:540px) { .hero-track { padding-inline: 6vw; } h1 { font-size: clamp(2.6rem, 10vw, 3.4rem); line-height: 1.04; } .eyebrow { font-size: .65rem; margin-bottom: var(--space-performance-md); } .primary { width: 100%; } .starting-point { display: block; } .starting-point a { display: flex; width: fit-content; } .workflow-path { display: grid; grid-template-columns: 1fr; justify-items: start; } .workflow-path span[aria-hidden] { transform: rotate(90deg); margin-left: .75rem; line-height: 1; } .example-receipt dl > div { grid-template-columns: 1fr; gap: .25rem; } figcaption { flex-direction: column; } }
</style>
