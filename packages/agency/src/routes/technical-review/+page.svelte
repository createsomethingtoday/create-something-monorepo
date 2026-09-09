<script lang="ts">
  import { Button, SEO } from '@create-something/canon';
  import InspectionScrollStory from '$lib/components/InspectionScrollStory.svelte';
  import TechnicalReviewVisual from '$lib/components/TechnicalReviewVisual.svelte';
  const bookingHref = '/book?source=technical-review&intent=technical-review&lane=workflow_infrastructure';
</script>

<SEO title="Technical Review Before Your Customer Pilot | CREATE SOMETHING" description="Already built a product with AI? Get an experienced technical review of one customer workflow, a prioritized findings report, and a clear next step. Scope and price agreed before work starts." propertyName="agency" />

<div class="technical-review property-performance">
  <section class="review-section opening" aria-labelledby="review-title">
    <div class="opening-copy">
      <p class="eyebrow">Technical review of an existing project</p>
      <h1 id="review-title">Know what to fix before your first customer pilot.</h1>
      <p class="lede">Your product works in a demo. You need to know what could fail when a customer uses it. We review the code and one agreed customer workflow, then help you decide what needs attention now.</p>
      <ul class="scope-strip" aria-label="Review deliverables"><li>One agreed workflow</li><li>Written findings</li><li>Walkthrough</li></ul>
      <Button href={bookingHref}>Discuss your existing project</Button>
      <p>Review scope, price, and timing are agreed before paid work starts.</p>
    </div>
    <TechnicalReviewVisual portraitOnMobile priority />
  </section>

  <section class="review-section fit-layout" aria-labelledby="fit-title">
    <div>
    <h2 id="fit-title">You do not need to start over.</h2>
    <p>Bring the project you built with AI, the feature you are stuck on, or the request a customer just made. We start with your existing tools and code. If a change is needed, we explain why.</p>
    <p>You can keep developing the product while we review the agreed part of it.</p>
    </div>
    <ul class="fit-rows" aria-label="When to ask for a review"><li><span>01</span><div><h3>Preparing for a pilot</h3><p>Check the workflow your first customer will use.</p></div></li><li><span>02</span><div><h3>A feature keeps breaking</h3><p>Bring the behavior you cannot confidently explain.</p></div></li><li><span>03</span><div><h3>A customer has a technical requirement</h3><p>Understand what you can commit to before you agree.</p></div></li></ul>
  </section>

  <section class="review-section" aria-labelledby="process-title">
    <h2 id="process-title">One workflow. A clear set of priorities.</h2>
    <InspectionScrollStory />
    <p>You keep the report and any tests or instructions created for your project. Fixes, additional reviews, and launch work require a separate agreed scope.</p>
  </section>

  <section class="review-section" aria-labelledby="sample-title">
    <p class="eyebrow">Illustrative findings report</p>
    <h2 id="sample-title">What the review helps you decide.</h2>
    <p>This fictional example shows the format for a customer portal. It is not a client result or a finding about your product.</p>
    <div class="report-layout">
    <div class="findings-visual"><TechnicalReviewVisual kind="findings" /></div>
    <div class="findings">
      <article class="priority-fix"><p class="eyebrow">Fix before the pilot</p><h3>A user can open another account’s file.</h3><p><strong>Example evidence:</strong> In the test environment, a request from account A returned a file belonging to account B.</p><p><strong>Next action:</strong> Enforce account access on the server and repeat the test with both accounts. </p><p class="finding-limit"><strong>Limit:</strong> This check covers the tested file route; other routes remain unreviewed.</p></article>
      <article class="priority-later"><p class="eyebrow">Improve later</p><h3>Bulk export is still manual.</h3><p><strong>Example evidence:</strong> Single-file export worked in the agreed pilot journey. Bulk export was outside the pilot requirements.</p><p><strong>Next action:</strong> Keep the manual step for this pilot. Revisit it if customer volume or requirements change.</p><p class="finding-limit"><strong>Limit:</strong> The finding covers the agreed single-file journey.</p></article>
      <article class="priority-keep"><p class="eyebrow">Leave alone for now</p><h3>The current hosting meets the tested need.</h3><p><strong>Example evidence:</strong> The agreed small-volume test completed on the existing host.</p><p><strong>Next action:</strong> Keep the host for this pilot. </p><p class="finding-limit"><strong>Limit:</strong> This does not establish capacity at a higher load.</p></article>
    </div>
    </div>
  </section>

  <section class="review-section scope-layout" aria-labelledby="scope-title">
    <div class="scope-summary">
    <h2 id="scope-title">A review has a defined boundary.</h2>
    <p>It gives you evidence about the work we agreed to inspect. It is not a security certification, a full penetration test, or a guarantee that a customer will approve your product. Broader security, compliance, and performance work need their own scope and, where needed, a specialist.</p>
    <p class="ownership-note">You keep the report, any tests or instructions we create, and ownership of your code.</p>
    </div>
    <div class="scope-questions">
    <div>
    <h3>How does pricing work?</h3>
    <p>We quote the review after the fit conversation. The quote names the work, deliverables, timing, and exclusions. There is no automatic implementation project or support subscription.</p>
    </div><div>
    <h3>Can you help with the fixes?</h3>
    <p>We can scope implementation after the findings are clear. Agree on the tasks, capacity, and working arrangements before that work starts. You keep ownership of your code.</p>
    </div><div class="control-note">
    <h3>Post-launch operations</h3>
    <p><a href="/control">Control starts at $900/month for agreed post-launch operations.</a> A prelaunch review and product development are quoted separately.</p>
    </div></div>
  </section>

  <section class="review-section closing" aria-labelledby="next-title">
    <div>
    <h2 id="next-title">Bring the product and the question you need answered.</h2>
    <p>We start with a conversation about fit. Repository access comes after that discussion.</p>
    </div><div class="preparation">
    <p class="eyebrow">Bring to the conversation</p>
    <ul class="preparation-list"><li>A demo of the product</li><li>The question you need answered</li><li>A customer requirement or deadline</li></ul>
    <p class="booking-note">Do not put credentials or private customer records in booking notes.</p>
    <Button href={bookingHref}>Discuss your existing project</Button>
    <div class="other-paths"><p><a href="/services">See all services.</a></p>
    <p>Need something built from scratch? <a href="/agent-foundation">See Agent Foundation.</a></p></div>
    </div>
  </section>
</div>

<style>
  .technical-review { background: var(--color-performance-paper); color: var(--color-performance-ink); }
  .review-section { padding: clamp(2rem, 5vw, 5rem) max(1.25rem, calc((100% - 80rem) / 2)); border-bottom: 1px solid var(--color-performance-line); }
  .eyebrow { color: var(--color-performance-ink, var(--color-fg-primary)); font-family: var(--font-mono); font-size: var(--text-body-sm); }
  h1 { font-size: clamp(2.75rem, 6vw, 5.5rem); line-height: 1.05; max-width: 18ch; margin: 1rem 0 1.5rem; }
  h2 { font-size: clamp(2rem, 3.5vw, 3rem); line-height: 1.15; max-width: 28ch; margin: 0 0 1.5rem; }
  h3 { font-size: var(--text-h3); line-height: 1.3; margin: 1.5rem 0 .75rem; }
  p { font-size: var(--text-body); line-height: 1.65; max-width: 68ch; }
  p { margin: 0 0 1.25rem; }
  .opening :global(.btn), .review-section:last-child :global(.btn) { margin-bottom: 1rem; }
  .lede { font-size: var(--text-body-lg); }
  .opening { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap: clamp(2rem, 4vw, 4rem); align-items: center; }
  .opening h1 { font-size: clamp(2.75rem, 4.5vw, 4.5rem); }
  .report-layout { display: grid; grid-template-columns: minmax(0, .7fr) minmax(0, 1.3fr); gap: clamp(2rem, 4vw, 4rem); align-items: start; margin-top: 2.5rem; }
  .findings-visual { min-width: 0; }
  a { color: inherit; text-decoration: underline; text-underline-offset: .2em; }
  .findings { display: grid; gap: 1.5rem; }
  .findings article { border-top: 1px solid var(--color-performance-line); padding-top: 1.5rem; }
  @media (max-width: 1000px) { .opening { grid-template-columns: 1fr; } }
  .scope-strip { display: flex; flex-wrap: wrap; gap: .5rem 1.25rem; list-style: none; padding: 0; margin: 0 0 1.5rem; font-size: .875rem; }
  .scope-strip li { border-bottom: 1px solid var(--color-performance-line); padding-bottom: .5rem; }
  .fit-layout, .scope-layout, .closing { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(2rem, 5vw, 5rem); }
  .fit-rows { list-style: none; padding: 0; margin: 0; }
  .fit-rows li { display: flex; gap: 1.25rem; border-top: 1px solid var(--color-performance-line); padding: 1.25rem 0; }
  .fit-rows span { font-family: var(--font-mono); font-size: .75rem; padding-top: .35rem; }
  .fit-rows h3, .scope-questions h3 { margin-top: 0; }
  .fit-rows h3 { font-size: 1.25rem; }
  .fit-rows p { margin-bottom: 0; }
  .findings article { padding: 1.25rem 0 0 1.25rem; border-left: 3px solid var(--finding-signal); }
  .priority-fix { --finding-signal: #a44336; }
  .priority-later { --finding-signal: #98701f; }
  .priority-keep { --finding-signal: #52614a; }
  .findings h3 { margin: .5rem 0 1rem; font-size: 1.5rem; }
  .findings .eyebrow { margin-bottom: .5rem; font-size: .75rem; }
  .finding-limit { font-size: .875rem; }
  .scope-questions > div { border-top: 1px solid var(--color-performance-line); padding-top: 1.5rem; margin-bottom: 2rem; }
  .scope-questions .control-note h3 { font-size: 1rem; }
  .control-note p, .booking-note { font-size: .875rem; }
  .ownership-note { border-left: 2px solid var(--color-performance-ink); padding-left: 1.25rem; margin-top: 2rem; }
  .closing { background: var(--color-performance-ink); color: var(--color-performance-paper); }
  .closing .eyebrow { color: inherit; }
  .closing :global(.btn) { background: var(--color-performance-paper); color: var(--color-performance-ink); }
  .closing :global(.btn.btn-primary:hover:not(:disabled)), .closing :global(.btn.btn-primary:focus-visible) { background: var(--color-performance-paper); color: var(--color-performance-ink); outline: 2px solid var(--color-performance-paper); outline-offset: 4px; }
  .preparation-list { padding-left: 1.25rem; margin: 0 0 1.5rem; }
  .preparation-list li { padding: .5rem 0; line-height: 1.5; }
  .other-paths { border-top: 1px solid currentColor; padding-top: 1.25rem; margin-top: 1rem; }
  .other-paths p { font-size: .875rem; }
  @media (max-width: 800px) {
    .fit-layout, .scope-layout, .closing, .report-layout { grid-template-columns: 1fr; }
    .findings-visual { max-width: 28rem; }
  }
</style>
