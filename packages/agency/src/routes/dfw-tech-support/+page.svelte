<script lang="ts">
  import { Button, SEO } from '@create-something/canon';
  import DfwSupportMotion from '$lib/components/DfwSupportMotion.svelte';
  import WorkflowSignalBand from '$lib/components/WorkflowSignalBand.svelte';
  import { getAnalytics } from '@create-something/canon/analytics';

  const inquiryHref = '/contact?intent=system-support&lane=reliability_and_control&source=dfw-tech-support&campaign=dfw-remote-support';
  function trackInquiry() {
    getAnalytics()?.track('conversion', 'funnel_handoff', {
      target: 'dfw-support-inquiry',
      metadata: { source: 'dfw-tech-support', campaign: 'dfw-remote-support',
        intent: 'system-support', lane: 'reliability_and_control', stage: 'decision', href: '/contact' }
    });
  }
</script>

<SEO title="Remote Software & Workflow Support for DFW | CREATE SOMETHING"
  description="Remote AI-native tech support for DFW businesses’ software and workflows. Get help with automations, integrations, forms and AI-built projects."
  canonical="https://createsomething.agency/dfw-tech-support" propertyName="agency" />

<div class="dfw-support property-performance" data-performance-mode="proof">
  <section class="chapter opening" aria-labelledby="support-title">
    <div>
      <p class="eyebrow">DFW · Remote software support</p>
      <h1 id="support-title">Keep the software your business depends on working.</h1>
      <p class="lede">Remote AI-native tech support for DFW businesses’ software and workflows.</p>
      <p>Bring a broken automation, a failing integration, a form that loses leads, or an AI-built project you need help maintaining.</p>
      <Button href={inquiryHref} onclick={trackInquiry}>Describe the support problem</Button>
      <p class="boundary">We agree on scope, price and access before work begins. Support is remote; hardware repair and on-site visits are outside this service.</p>
    </div>
    <DfwSupportMotion />
  </section>

  <section class="chapter fit" aria-labelledby="fit-title">
    <div class="support-signal"><WorkflowSignalBand showContinuation={false} /></div>
    <div><p class="eyebrow">Start with one problem</p><h2 id="fit-title">Software help with a clear owner.</h2>
      <p>You do not need another tool before you understand the failure. Bring the systems involved, their owner and the result you need.</p>
      <p>AI can help investigate and prepare a change. Your team keeps approval authority over production changes and access.</p>
    </div>
    <dl class="failure-list">
      <div><dt>An automation or integration stopped.</dt><dd>Trace the handoff, inspect the failure and agree on a repair with an acceptance check.</dd></div>
      <div><dt>A form or website workflow loses requests.</dt><dd>Follow the request from submission to receipt. Check errors and duplicate handling before adding more traffic.</dd></div>
      <div><dt>An AI-built project needs an owner.</dt><dd>Review the source, dependencies and deployment path. Identify what needs repair and how your team can maintain it.</dd></div>
    </dl>
  </section>

  <section class="chapter proof" aria-labelledby="proof-title">
    <div><p class="eyebrow">Inspectable engineering work</p><h2 id="proof-title">Look at the evidence behind the approach.</h2>
      <p>Our published template-review field report shows how software prepares evidence while a person owns the decision.</p>
      <a href="/field-reports/template-review">Read the template-review field report →</a>
      <p class="boundary">That evaluation covers evidence preparation. It does not establish DFW client results, repair times or business savings.</p>
    </div>
    <div class="handoff-notes"><h3>What an agreed repair leaves behind</h3>
      <ul><li>The scoped change and its acceptance result</li><li>Source and configuration instructions where applicable</li><li>Known limits, recovery steps and the next owner</li></ul>
      <p>Deliverables depend on the agreed scope. Third-party services and AI usage need an agreed budget.</p>
      <a href="/services">Review engagement and membership terms →</a>
    </div>
  </section>

  <section class="chapter handoff" aria-labelledby="next-title">
    <div><p class="eyebrow">Before you inquire</p><h2 id="next-title">Bring the failure, not your passwords.</h2>
      <p>Tell us what should happen, what happens instead, which tools are involved and who can approve the work.</p>
      <Button href={inquiryHref} onclick={trackInquiry}>Describe the support problem</Button>
      <p class="boundary">Keep passwords, API keys and private customer records out of the inquiry.</p>
    </div>
    <div class="faq" aria-label="Remote support questions">
      <details><summary>Is this on-site IT support?</summary><p>No. This service covers remote software and workflow work for Dallas–Fort Worth businesses. It does not include device repair or on-site coverage.</p></details>
      <details><summary>Can you help with an AI-built project?</summary><p>We can assess a project when you have authorized access to its source and deployment. We agree on a bounded task before making changes.</p></details>
      <details><summary>What does support cost?</summary><p>We assess fit and agree on scope and price before work starts. Separately quoted repairs and Builds are distinct from membership.</p><p>Focused membership is $900/month. Team is $2,500/month. <a href="/services#membership">Review the included sessions, milestones and limits.</a></p></details>
      <details><summary>Who owns the work?</summary><p>You keep the delivered source and instructions for the agreed work. Your team retains account ownership and approval authority.</p></details>
      <details><summary>Is emergency coverage included?</summary><p>This inquiry does not book emergency service or 24/7 coverage. We agree on timing and responsibility before work begins.</p></details>
    </div>
  </section>
</div>

<style>
  .dfw-support { color: var(--color-performance-ink); background: var(--color-performance-paper); }
  .chapter { max-width: 1440px; margin: 0 auto; padding: clamp(3rem, 7vw, 7rem) clamp(1.25rem, 5vw, 6rem); border-bottom: 1px solid var(--color-performance-line); display: grid; grid-template-columns: 1.2fr 1fr; gap: clamp(2rem, 5vw, 5rem); }
  .eyebrow { font-family: var(--font-mono); font-size: .75rem; letter-spacing: .08em; }
  .eyebrow { text-transform: uppercase; margin: 0 0 1.5rem; }
  h1 { font-size: clamp(2.5rem, 4.8vw, 4.5rem); line-height: 1.02; letter-spacing: -.045em; max-width: 16ch; margin: 0 0 1.75rem; }
  h2 { font-size: clamp(2rem, 3.5vw, 3.75rem); line-height: 1.08; letter-spacing: -.035em; margin: 0 0 1.5rem; max-width: 17ch; }
  h3 { font-size: 1.5rem; margin: 0 0 1rem; }
  p { line-height: 1.65; max-width: 65ch; margin: 0 0 1.5rem; }
  .lede { font-size: clamp(1.125rem, 1.6vw, 1.4rem); }
  a { text-underline-offset: .22em; }
  .boundary { font-size: .875rem; margin-top: 1.25rem; }
  .support-signal { grid-column: 1 / -1; min-width: 0; }
  .opening { align-items: center; padding-top: clamp(2.5rem, 5vw, 5rem); }
  .failure-list { margin: 0; }
  .failure-list div, details { padding: 1.25rem 0; border-top: 1px solid var(--color-performance-line); }
  .failure-list dt { font-size: 1rem; font-weight: 600; }
  .failure-list dd { margin: .75rem 0 0; line-height: 1.65; }
  .handoff-notes { border-top: 3px solid currentColor; padding-top: 1.5rem; }
  ul { padding-left: 1.25rem; line-height: 1.8; margin: 0 0 1.75rem; }
  summary { font-weight: 600; cursor: pointer; line-height: 1.5; }
  summary:focus-visible { outline: 2px solid var(--color-performance-focus); outline-offset: 4px; }
  details p { margin: 1rem 0 0; }
  @media (max-width: 760px) { .chapter { grid-template-columns: 1fr; } h1 { max-width: 14ch; } }
</style>
