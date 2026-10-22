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
      <h2>Agents that do the work.<br />In the tools you already use.</h2>
      <p class="lede">We set up, connect and improve agents that carry out agreed work in your team’s tools. You see what they may access, review their outputs, and get ongoing technical support from people who know the project.</p>
      <div class="hero-actions"><a class="primary" href={agencyCoreMessaging.workflowMappingSessionHref}>Talk through your workflow <span aria-hidden="true">↗</span></a></div>
      <p class="next-step">Bring one task. We agree on scope and cost before work begins.</p>
      <p class="starting-point">Support {PUBLIC_PRICING.membership.label.toLowerCase()} <a href="/services#membership">Membership and costs ↗</a></p>
    </div>
    <figure class="service-record">
      <figcaption><span>From sharing an agent to doing the work.</span><span>Our starting point</span></figcaption>
      <div class="record-problem"><span class="record-label">The opportunity</span><p>Sharing an agent opens a conversation. Context makes it useful.</p></div>
      <p class="record-context">Using and sharing our OpenAI dots changed how we thought about helping others put agents to work. The next step is practical: connect the recipient’s tools and context, agree on permissions, and inspect the result.</p>
      <p class="record-context">Sharing an agent does not grant access to someone else’s private context or credentials. Each client setup needs its own approved access.</p>
      <div class="record-footer"><a href="#agent-enablement">See the workflow and optional canon story ↓</a><a href="#team-enablement">Team setup and governance ↗</a></div>
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
  .record-context { margin: 1rem var(--space-performance-md); font-size: .875rem; line-height: 1.6; }
  .record-footer { border-top: 1px solid var(--color-performance-shell-border-strong); }
  .hero-bottom { display: flex; justify-content: space-between; flex-wrap: wrap; gap: var(--space-performance-sm); border-top: 1px solid var(--color-performance-shell-border-strong); padding-block: var(--space-performance-sm); }
  a { color: inherit; text-underline-offset: .3em; }
  .hero-bottom a, .starting-point a { display: inline-flex; align-items: center; gap: var(--space-performance-sm); min-height: 44px; }
  a:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 5px; }
  @media(max-width:900px) { .hero-track { padding-top: 7rem; } .hero-composition { grid-template-columns: 1fr; gap: var(--space-performance-lg); padding-block: var(--space-performance-lg); } .hero-copy { max-width: 40rem; } .service-record { max-width: 42rem; } }
  @media(max-width:540px) { .hero-track { padding-inline: 6vw; } h1 { font-size: clamp(2.6rem, 10vw, 3.4rem); line-height: 1.04; } .eyebrow { font-size: .65rem; margin-bottom: var(--space-performance-md); } .primary { width: 100%; } .starting-point { display: block; } .starting-point a { display: flex; width: fit-content; } figcaption { flex-direction: column; } }
</style>
