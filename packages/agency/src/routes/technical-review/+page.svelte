<script lang="ts">
  import { Button, SEO } from '@create-something/canon';
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
      <Button href={bookingHref}>Discuss your existing project</Button>
      <p>Review scope, price, and timing are agreed before paid work starts.</p>
    </div>
    <TechnicalReviewVisual portraitOnMobile priority />
  </section>

  <section class="review-section" aria-labelledby="fit-title">
    <h2 id="fit-title">You do not need to start over.</h2>
    <p>Bring the project you built with AI, the feature you are stuck on, or the request a customer just made. We start with your existing tools and code. If a change is needed, we explain why.</p>
    <p>This is for founders and teams who need technical judgment before making a commitment. You can keep developing the product while we review the agreed part of it.</p>
  </section>

  <section class="review-section" aria-labelledby="process-title">
    <h2 id="process-title">One workflow. A clear set of priorities.</h2>
    <ol class="steps">
      <li><h3>Agree on what to check.</h3><p>Show us the product, the customer journey, and your concern. We agree on access, scope, deliverables, price, and timing. The fit call does not include a code audit.</p></li>
      <li><h3>Inspect and test the existing work.</h3><p>We review the relevant code and test the agreed workflow. Depending on the scope, checks may cover access to records, AI output, failed requests, or the customer requirement you need to answer.</p></li>
      <li><h3>Decide what happens next.</h3><p>You receive a written findings report and a walkthrough: what to fix before the pilot, what can wait, and what to leave alone. Each finding includes the evidence, its limits, and a recommended next action.</p></li>
    </ol>
    <p>You keep the report and any tests or instructions created for your project. Fixes, additional reviews, and launch work require a separate agreed scope.</p>
  </section>

  <section class="review-section" aria-labelledby="sample-title">
    <p class="eyebrow">Illustrative findings report</p>
    <h2 id="sample-title">What the review helps you decide.</h2>
    <p>This fictional example shows the format for a customer portal. It is not a client result or a finding about your product.</p>
    <div class="findings-visual"><TechnicalReviewVisual kind="findings" /></div>
    <div class="findings">
      <article><p class="eyebrow">Fix before the pilot</p><h3>A user can open another account’s file.</h3><p><strong>Example evidence:</strong> In the test environment, a request from account A returned a file belonging to account B.</p><p><strong>Next action:</strong> Enforce account access on the server and repeat the test with both accounts. This check covers the tested file route; other routes remain unreviewed.</p></article>
      <article><p class="eyebrow">Improve later</p><h3>Bulk export is still manual.</h3><p><strong>Example evidence:</strong> Single-file export worked in the agreed pilot journey. Bulk export was outside the pilot requirements.</p><p><strong>Next action:</strong> Keep the manual step for this pilot. Revisit it if customer volume or requirements change.</p></article>
      <article><p class="eyebrow">Leave alone for now</p><h3>The current hosting meets the tested need.</h3><p><strong>Example evidence:</strong> The agreed small-volume test completed on the existing host.</p><p><strong>Next action:</strong> Keep the host for this pilot. This does not establish capacity at a higher load.</p></article>
    </div>
  </section>

  <section class="review-section" aria-labelledby="scope-title">
    <h2 id="scope-title">A review has a defined boundary.</h2>
    <p>It gives you evidence about the work we agreed to inspect. It is not a security certification, a full penetration test, or a guarantee that a customer will approve your product. Broader security, compliance, and performance work need their own scope and, where needed, a specialist.</p>
    <h3>How does pricing work?</h3>
    <p>We quote the review after the fit conversation. The quote names the work, deliverables, timing, and exclusions. There is no automatic implementation project or support subscription.</p>
    <h3>Can you help with the fixes?</h3>
    <p>We can scope implementation after the findings are clear. Agree on the tasks, capacity, and working arrangements before that work starts. You keep ownership of your code.</p>
    <h3>Is this the $900/month plan?</h3>
    <p>No. <a href="/control">Control starts at $900/month for agreed post-launch operations.</a> A prelaunch review and product development are quoted separately.</p>
  </section>

  <section class="review-section" aria-labelledby="next-title">
    <h2 id="next-title">Bring the product and the question you need answered.</h2>
    <p>Start with a demo, a short description of the problem, and any customer requirement or deadline. We agree on repository access after discussing fit. Do not put credentials or private customer records in booking notes.</p>
    <Button href={bookingHref}>Discuss your existing project</Button>
    <p><a href="/services">See all services.</a></p>
    <p>Need something built from scratch? <a href="/agent-foundation">See Agent Foundation.</a></p>
  </section>
</div>

<style>
  .technical-review { background: var(--color-performance-paper); color: var(--color-performance-ink); }
  .review-section { padding: clamp(2rem, 5vw, 5rem) max(1.25rem, calc((100% - 80rem) / 2)); border-bottom: 1px solid var(--color-performance-line); }
  .eyebrow { color: var(--color-performance-ink, var(--color-fg-primary)); font-family: var(--font-mono); font-size: var(--text-body-sm); }
  h1 { font-size: clamp(2.75rem, 6vw, 5.5rem); line-height: 1.05; max-width: 18ch; margin: 1rem 0 1.5rem; }
  h2 { font-size: clamp(2rem, 3.5vw, 3rem); line-height: 1.15; max-width: 28ch; margin: 0 0 1.5rem; }
  h3 { font-size: var(--text-h3); line-height: 1.3; margin: 1.5rem 0 .75rem; }
  p, li { font-size: var(--text-body); line-height: 1.65; max-width: 68ch; }
  p { margin: 0 0 1.25rem; }
  .opening :global(.btn), .review-section:last-child :global(.btn) { margin-bottom: 1rem; }
  .lede { font-size: var(--text-body-lg); }
  .opening { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap: clamp(2rem, 4vw, 4rem); align-items: center; }
  .opening h1 { font-size: clamp(2.75rem, 4.5vw, 4.5rem); }
  .findings-visual { max-width: 60rem; margin: 2rem 0 3rem; }
  a { color: inherit; text-decoration: underline; text-underline-offset: .2em; }
  .steps { padding-left: 1.25rem; }
  .steps li { padding-left: .5rem; }
  .findings { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2rem; }
  .findings article { border-top: 1px solid var(--color-performance-line); padding-top: 1.5rem; }
  @media (max-width: 1000px) { .opening { grid-template-columns: 1fr; } }
  @media (max-width: 800px) { .findings { grid-template-columns: 1fr; } }
</style>
